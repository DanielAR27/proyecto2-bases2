-- warehouse_procedures.sql
-- Stored Procedures para ETL del Data Warehouse

-- =============================================================================
-- FUNCIÓN: OBTENER O CREAR TIEMPO_ID
-- =============================================================================
CREATE OR REPLACE FUNCTION warehouse.get_or_create_tiempo_id(fecha_param DATE)
RETURNS INTEGER AS $$
DECLARE
    tiempo_id_result INTEGER;
BEGIN
    -- Intentar obtener tiempo_id existente
    SELECT tiempo_id INTO tiempo_id_result
    FROM warehouse.dim_tiempo 
    WHERE fecha = fecha_param;
    
    -- Si existe, devolverlo
    IF tiempo_id_result IS NOT NULL THEN
        RETURN tiempo_id_result;
    END IF;
    
    -- Si no existe, crearlo
    INSERT INTO warehouse.dim_tiempo (
        fecha, anio, mes, dia, trimestre, dia_semana, es_fin_semana
    ) VALUES (
        fecha_param,
        EXTRACT(YEAR FROM fecha_param),
        EXTRACT(MONTH FROM fecha_param),
        EXTRACT(DAY FROM fecha_param),
        EXTRACT(QUARTER FROM fecha_param),
        EXTRACT(DOW FROM fecha_param) + 1,
        EXTRACT(DOW FROM fecha_param) IN (0, 6)
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
        v_tiempo_id := warehouse.get_or_create_tiempo_id(pedido_record.fecha_hora::DATE);
        
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
        v_tiempo_id := warehouse.get_or_create_tiempo_id(reserva_record.fecha_hora::DATE);
        
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
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql;