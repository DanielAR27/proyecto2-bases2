-- warehouse_procedures.sql
-- Stored Procedures para ETL del Data Warehouse

-- =============================================================================
-- FUNCIÓN: OBTENER O CREAR TIEMPO_ID
-- =============================================================================
CREATE OR REPLACE FUNCTION warehouse.get_or_create_tiempo_id(fecha_hora_param TIMESTAMP)
RETURNS INTEGER AS $$
DECLARE
    tiempo_id_result INTEGER;
    fecha_solo DATE;
    hora_solo INTEGER;
    minuto_solo INTEGER;
BEGIN
    -- Extraer componentes
    fecha_solo := fecha_hora_param::DATE;
    hora_solo := EXTRACT(HOUR FROM fecha_hora_param);
    minuto_solo := EXTRACT(MINUTE FROM fecha_hora_param);
    
    -- Intentar obtener tiempo_id existente
    SELECT tiempo_id INTO tiempo_id_result
    FROM warehouse.dim_tiempo 
    WHERE fecha = fecha_solo AND hora = hora_solo AND minuto = minuto_solo;
    
    -- Si existe, devolverlo
    IF tiempo_id_result IS NOT NULL THEN
        RETURN tiempo_id_result;
    END IF;
    
    -- Si no existe, crearlo
    INSERT INTO warehouse.dim_tiempo (
        fecha, hora, minuto, anio, mes, dia, trimestre, dia_semana, es_fin_semana, es_horario_pico
    ) VALUES (
        fecha_solo, hora_solo, minuto_solo,
        EXTRACT(YEAR FROM fecha_solo),
        EXTRACT(MONTH FROM fecha_solo),
        EXTRACT(DAY FROM fecha_solo),
        EXTRACT(QUARTER FROM fecha_solo),
        EXTRACT(DOW FROM fecha_solo) + 1,
        EXTRACT(DOW FROM fecha_solo) IN (0, 6),
        hora_solo BETWEEN 11 AND 14 OR hora_solo BETWEEN 18 AND 21  -- Horarios pico típicos
    ) RETURNING tiempo_id INTO tiempo_id_result;
    
    RETURN tiempo_id_result;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- FUNCIÓN MAPEO GEOGRÁFICO
-- =============================================================================
CREATE OR REPLACE FUNCTION warehouse.get_provincia_from_coords(lat DECIMAL, lng DECIMAL)
RETURNS VARCHAR(50) AS $$
BEGIN
    -- Si las coordenadas son NULL, devolver 'Sin Ubicación'
    IF lat IS NULL OR lng IS NULL THEN
        RETURN 'Sin Ubicación';
    END IF;
    
    -- Mapeo extendido para coincidir con coordenadas generadas
    RETURN CASE 
        WHEN lat BETWEEN 9.6 AND 10.1 AND lng BETWEEN -85.0 AND -84.0 THEN 'San José'
        WHEN lat BETWEEN 9.7 AND 10.2 AND lng BETWEEN -84.4 AND -83.6 THEN 'Cartago'  
        WHEN lat BETWEEN 9.9 AND 10.5 AND lng BETWEEN -84.6 AND -84.0 THEN 'Heredia'
        WHEN lat BETWEEN 10.0 AND 10.9 AND lng BETWEEN -85.0 AND -84.1 THEN 'Alajuela'
        WHEN lat BETWEEN 10.2 AND 11.2 AND lng BETWEEN -86.0 AND -84.5 THEN 'Guanacaste'
        WHEN lat BETWEEN 8.5 AND 11.0 AND lng BETWEEN -85.9 AND -84.4 THEN 'Puntarenas'
        WHEN lat BETWEEN 8.5 AND 11.2 AND lng BETWEEN -84.2 AND -82.5 THEN 'Limón'
        ELSE 'Sin Ubicación'
    END;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- FUNCIÓN: GET OR CREATE CATEGORÍA  
-- =============================================================================
CREATE OR REPLACE FUNCTION warehouse.get_or_create_categoria_id(categoria_nombre VARCHAR)
RETURNS INTEGER AS $$
DECLARE
    categoria_id_result INTEGER;
BEGIN
    -- Si es NULL o vacío, usar default
    IF categoria_nombre IS NULL OR TRIM(categoria_nombre) = '' THEN
        categoria_nombre := 'Especialidad';
    END IF;
    
    -- Buscar existente
    SELECT categoria_id INTO categoria_id_result
    FROM warehouse.dim_categorias 
    WHERE nombre_categoria = categoria_nombre;
    
    -- Si no existe, crear
    IF categoria_id_result IS NULL THEN
        INSERT INTO warehouse.dim_categorias (nombre_categoria) 
        VALUES (categoria_nombre) 
        RETURNING categoria_id INTO categoria_id_result;
    END IF;
    
    RETURN categoria_id_result;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- FUNCIÓN: SYNC PRODUCTO (UPSERT)
-- =============================================================================
-- En warehouse_procedures.sql, cambiar la función sync_producto:
CREATE OR REPLACE FUNCTION warehouse.sync_producto(
    p_id_producto INTEGER,
    p_nombre VARCHAR,
    p_categoria VARCHAR,
    p_precio DECIMAL,
    p_id_menu INTEGER,
    p_id_restaurante INTEGER
) RETURNS INTEGER AS $$
DECLARE
    v_categoria_id INTEGER;
BEGIN
    -- Obtener o crear categoría
    v_categoria_id := warehouse.get_or_create_categoria_id(p_categoria);
    
    -- Upsert del producto
    INSERT INTO warehouse.dim_productos (
        producto_id, nombre, categoria_id, precio_actual, 
        precio_promedio, id_menu, id_restaurante
    ) VALUES (
        p_id_producto, p_nombre, v_categoria_id, p_precio,
        p_precio, p_id_menu, p_id_restaurante
    )
    ON CONFLICT (producto_id) 
    DO UPDATE SET
        nombre = EXCLUDED.nombre,
        categoria_id = EXCLUDED.categoria_id,
        precio_actual = EXCLUDED.precio_actual,
        precio_promedio = (dim_productos.precio_promedio + EXCLUDED.precio_actual) / 2,
        id_menu = EXCLUDED.id_menu,
        id_restaurante = EXCLUDED.id_restaurante,
        fecha_ultima_actualizacion = NOW()
        -- NO actualizar fecha_primera_venta en UPDATE
    ;
    
    RETURN v_categoria_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- PROCEDURE: BATCH UPSERT PEDIDOS
-- =============================================================================
CREATE OR REPLACE FUNCTION warehouse.batch_upsert_pedidos(
    pedidos_json JSONB
) RETURNS INTEGER AS $$
DECLARE
    pedido_record RECORD;
    v_tiempo_id INTEGER;
    v_provincia_cliente VARCHAR(50);
    v_provincia_restaurante VARCHAR(50);
    count_processed INTEGER := 0;
BEGIN
    -- Iterar sobre cada pedido en el JSON (CON LAS NUEVAS COLUMNAS)
    FOR pedido_record IN 
        SELECT * FROM jsonb_to_recordset(pedidos_json) AS x(
            id_pedido INTEGER,
            fecha_hora TIMESTAMP,       
            id_usuario INTEGER,
            id_restaurante INTEGER,
            id_repartidor INTEGER,
            estado VARCHAR(20),
            tipo VARCHAR(20),
            total_pedido DECIMAL(10,2),
            cantidad_items INTEGER,
            usuario_latitud DECIMAL(10,8),
            usuario_longitud DECIMAL(11,8),
            restaurante_latitud DECIMAL(10,8),
            restaurante_longitud DECIMAL(11,8),
            fuente_datos VARCHAR(20)
        )
    LOOP
        -- Verificar que fecha_hora no sea NULL
        IF pedido_record.fecha_hora IS NULL THEN
            RAISE NOTICE 'ADVERTENCIA: Pedido % tiene fecha_hora NULL, saltando...', pedido_record.id_pedido;
            CONTINUE;
        END IF;
        
        -- Obtener tiempo_id para la fecha
        v_tiempo_id := warehouse.get_or_create_tiempo_id(pedido_record.fecha_hora);
        
        -- Calcular provincias usando las coordenadas
        v_provincia_cliente := warehouse.get_provincia_from_coords(
            pedido_record.usuario_latitud, 
            pedido_record.usuario_longitud
        );
        
        v_provincia_restaurante := warehouse.get_provincia_from_coords(
            pedido_record.restaurante_latitud, 
            pedido_record.restaurante_longitud
        );
        
        -- Upsert del pedido CON COORDENADAS Y PROVINCIAS
        INSERT INTO warehouse.fact_pedidos (
            id_pedido, tiempo_id, id_usuario, id_restaurante, id_repartidor,
            estado, tipo, total_pedido, cantidad_items, fecha_creacion, fuente_datos,
            usuario_latitud, usuario_longitud, restaurante_latitud, restaurante_longitud,
            provincia_cliente, provincia_restaurante
        ) VALUES (
            pedido_record.id_pedido, v_tiempo_id, pedido_record.id_usuario, 
            pedido_record.id_restaurante, pedido_record.id_repartidor,
            pedido_record.estado, pedido_record.tipo, pedido_record.total_pedido, 
            pedido_record.cantidad_items, pedido_record.fecha_hora, pedido_record.fuente_datos,
            pedido_record.usuario_latitud, pedido_record.usuario_longitud,
            pedido_record.restaurante_latitud, pedido_record.restaurante_longitud,
            v_provincia_cliente, v_provincia_restaurante
        )
        ON CONFLICT (id_pedido, tiempo_id, fuente_datos) 
        DO UPDATE SET
            estado = EXCLUDED.estado,
            tipo = EXCLUDED.tipo,
            total_pedido = EXCLUDED.total_pedido,
            cantidad_items = EXCLUDED.cantidad_items,
            id_repartidor = EXCLUDED.id_repartidor,
            usuario_latitud = EXCLUDED.usuario_latitud,
            usuario_longitud = EXCLUDED.usuario_longitud,
            restaurante_latitud = EXCLUDED.restaurante_latitud,
            restaurante_longitud = EXCLUDED.restaurante_longitud,
            provincia_cliente = EXCLUDED.provincia_cliente,
            provincia_restaurante = EXCLUDED.provincia_restaurante,
            fecha_etl = NOW();
            
        count_processed := count_processed + 1;
    END LOOP;
    
    RETURN count_processed;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- PROCEDURE: BATCH UPSERT RESERVAS
-- =============================================================================
CREATE OR REPLACE FUNCTION warehouse.batch_upsert_reservas(
    reservas_json JSONB
) RETURNS INTEGER AS $$
DECLARE
    reserva_record RECORD;
    v_tiempo_id INTEGER;
    count_processed INTEGER := 0;
BEGIN
    FOR reserva_record IN 
        SELECT * FROM jsonb_to_recordset(reservas_json) AS x(
            id_reserva INTEGER,
            fecha_hora TIMESTAMP,          
            id_usuario INTEGER,
            id_restaurante INTEGER,
            estado VARCHAR(20),
            fuente_datos VARCHAR(20)
        )
    LOOP
        -- Verificar que fecha_hora no sea NULL
        IF reserva_record.fecha_hora IS NULL THEN
            RAISE NOTICE 'ADVERTENCIA: Reserva % tiene fecha_hora NULL, saltando...', reserva_record.id_reserva;
            CONTINUE;
        END IF;
        
        -- Obtener tiempo_id para la fecha
        v_tiempo_id := warehouse.get_or_create_tiempo_id(reserva_record.fecha_hora);
        
        -- Upsert de la reserva
        INSERT INTO warehouse.fact_reservas (
            id_reserva, tiempo_id, id_usuario, id_restaurante,
            estado, fecha_creacion, fuente_datos
        ) VALUES (
            reserva_record.id_reserva, v_tiempo_id, reserva_record.id_usuario,
            reserva_record.id_restaurante, reserva_record.estado, 
            reserva_record.fecha_hora, reserva_record.fuente_datos
        )
        ON CONFLICT (id_reserva, tiempo_id, fuente_datos) 
        DO UPDATE SET
            estado = EXCLUDED.estado,
            fecha_etl = NOW();
            
        count_processed := count_processed + 1;
    END LOOP;
    
    RETURN count_processed;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- PROCEDURE: BATCH UPSERT DETALLE PEDIDOS
-- =============================================================================
CREATE OR REPLACE FUNCTION warehouse.batch_upsert_detalle_pedidos(
    detalles_json JSONB
) RETURNS INTEGER AS $$
DECLARE
    detalle_record RECORD;
    v_tiempo_id INTEGER;
    v_categoria_id INTEGER;
    v_provincia_cliente VARCHAR(50);
    v_provincia_restaurante VARCHAR(50);
    count_processed INTEGER := 0;
BEGIN
    FOR detalle_record IN 
        SELECT * FROM jsonb_to_recordset(detalles_json) AS x(
            id_pedido INTEGER,
            id_producto INTEGER,
            fecha_hora TIMESTAMP,
            id_usuario INTEGER,
            id_restaurante INTEGER,
            id_repartidor INTEGER,
            estado_pedido VARCHAR(20),
            tipo_pedido VARCHAR(20),
            cantidad INTEGER,
            precio_unitario DECIMAL(10,2),
            subtotal DECIMAL(10,2),
            nombre_producto VARCHAR(200),
            categoria_producto VARCHAR(100),
            precio_producto DECIMAL(10,2),
            id_menu INTEGER,
            usuario_latitud DECIMAL(10,8),        
            usuario_longitud DECIMAL(11,8),       
            restaurante_latitud DECIMAL(10,8),   
            restaurante_longitud DECIMAL(11,8),   
            fuente_datos VARCHAR(20)
        )
    LOOP
        -- Verificar fecha
        IF detalle_record.fecha_hora IS NULL THEN
            CONTINUE;
        END IF;
        
        -- Obtener tiempo_id
        v_tiempo_id := warehouse.get_or_create_tiempo_id(detalle_record.fecha_hora);
        
        -- Sync producto y obtener categoria_id
        v_categoria_id := warehouse.sync_producto(
            detalle_record.id_producto,
            detalle_record.nombre_producto,
            detalle_record.categoria_producto,
            detalle_record.precio_producto,
            detalle_record.id_menu,
            detalle_record.id_restaurante
        );
        
        -- Calcular provincias usando las coordenadas
        v_provincia_cliente := warehouse.get_provincia_from_coords(
            detalle_record.usuario_latitud, 
            detalle_record.usuario_longitud
        );
        
        v_provincia_restaurante := warehouse.get_provincia_from_coords(
            detalle_record.restaurante_latitud, 
            detalle_record.restaurante_longitud
        );

        -- Insert detalle del pedido
        INSERT INTO warehouse.fact_detalle_pedidos (
            id_pedido, id_producto, tiempo_id, categoria_id,
            id_usuario, id_restaurante, id_repartidor,
            estado_pedido, tipo_pedido, cantidad, precio_unitario, subtotal,
            provincia_cliente, provincia_restaurante, fecha_creacion, fuente_datos
        ) VALUES (
            detalle_record.id_pedido, detalle_record.id_producto, v_tiempo_id, v_categoria_id,
            detalle_record.id_usuario, detalle_record.id_restaurante, detalle_record.id_repartidor,
            detalle_record.estado_pedido, detalle_record.tipo_pedido, 
            detalle_record.cantidad, detalle_record.precio_unitario, detalle_record.subtotal,
            v_provincia_cliente, v_provincia_restaurante, 
            detalle_record.fecha_hora, detalle_record.fuente_datos
        )
        ON CONFLICT (id_pedido, id_producto, tiempo_id, fuente_datos) 
        DO UPDATE SET
            cantidad = EXCLUDED.cantidad,
            precio_unitario = EXCLUDED.precio_unitario,
            subtotal = EXCLUDED.subtotal,
            estado_pedido = EXCLUDED.estado_pedido,
            fecha_etl = NOW();
            
        count_processed := count_processed + 1;
    END LOOP;
    
    RETURN count_processed;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- PROCEDURE: REFRESCAR TODOS LOS CUBOS
-- =============================================================================
CREATE OR REPLACE FUNCTION warehouse.refresh_all_cubos()
RETURNS TEXT AS $$
DECLARE
    resultado TEXT := '';
BEGIN
    -- Refrescar cubo de pedidos (existente)
    BEGIN
        REFRESH MATERIALIZED VIEW warehouse.cubo_pedidos_tiempo;
        resultado := resultado || 'cubo_pedidos_tiempo: OK' || chr(10);
    EXCEPTION WHEN OTHERS THEN
        resultado := resultado || 'cubo_pedidos_tiempo: ERROR - ' || SQLERRM || chr(10);
    END;
    
    -- Refrescar cubo de reservas (existente)
    BEGIN
        REFRESH MATERIALIZED VIEW warehouse.cubo_reservas_tiempo;
        resultado := resultado || 'cubo_reservas_tiempo: OK' || chr(10);
    EXCEPTION WHEN OTHERS THEN
        resultado := resultado || 'cubo_reservas_tiempo: ERROR - ' || SQLERRM || chr(10);
    END;
    
    -- NUEVOS CUBOS GEOGRÁFICOS
    
    -- Refrescar cubo de pedidos por ubicación
    BEGIN
        REFRESH MATERIALIZED VIEW warehouse.cubo_pedidos_ubicacion;
        resultado := resultado || 'cubo_pedidos_ubicacion: OK' || chr(10);
    EXCEPTION WHEN OTHERS THEN
        resultado := resultado || 'cubo_pedidos_ubicacion: ERROR - ' || SQLERRM || chr(10);
    END;
    
    -- Refrescar cubo de actividad por zona
    BEGIN
        REFRESH MATERIALIZED VIEW warehouse.cubo_actividad_zona;
        resultado := resultado || 'cubo_actividad_zona: OK' || chr(10);
    EXCEPTION WHEN OTHERS THEN
        resultado := resultado || 'cubo_actividad_zona: ERROR - ' || SQLERRM || chr(10);
    END;
    
    -- Refrescar cubo matriz origen-destino
    BEGIN
        REFRESH MATERIALIZED VIEW warehouse.cubo_matriz_od;
        resultado := resultado || 'cubo_matriz_od: OK' || chr(10);
    EXCEPTION WHEN OTHERS THEN
        resultado := resultado || 'cubo_matriz_od: ERROR - ' || SQLERRM || chr(10);
    END;
    
    -- Refrescar cubo productos por tiempo
    BEGIN
        REFRESH MATERIALIZED VIEW warehouse.cubo_top_productos_anual;
        resultado := resultado || 'cubo_top_productos_anual: OK' || chr(10);
    EXCEPTION WHEN OTHERS THEN
        resultado := resultado || 'cubo_top_productos_anual: ERROR - ' || SQLERRM || chr(10);
    END;
    
    -- Refrescar cubo productos por ubicación
    BEGIN
        REFRESH MATERIALIZED VIEW warehouse.cubo_productos_ubicacion;
        resultado := resultado || 'cubo_productos_ubicacion: OK' || chr(10);
    EXCEPTION WHEN OTHERS THEN
        resultado := resultado || 'cubo_productos_ubicacion: ERROR - ' || SQLERRM || chr(10);
    END;

    -- Refrescar cubo frecuencia de uso
    BEGIN
        REFRESH MATERIALIZED VIEW warehouse.cubo_frecuencia_uso;
        resultado := resultado || 'cubo_frecuencia_uso: OK' || chr(10);
    EXCEPTION WHEN OTHERS THEN
        resultado := resultado || 'cubo_frecuencia_uso: ERROR - ' || SQLERRM || chr(10);
    END;

    RETURN resultado;
END;
$$ LANGUAGE plpgsql;