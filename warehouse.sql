-- warehouse.sql - Data Warehouse OLAP para Restaurantes
-- Solo pedidos por el momento

-- =============================================================================
-- ESQUEMA WAREHOUSE
-- =============================================================================
CREATE SCHEMA IF NOT EXISTS warehouse;

-- =============================================================================
-- DIMENSIÓN TIEMPO
-- =============================================================================
CREATE TABLE warehouse.dim_tiempo (
    tiempo_id SERIAL PRIMARY KEY,
    fecha DATE NOT NULL,
    hora INTEGER,
    minuto INTEGER,
    anio INTEGER NOT NULL,
    mes INTEGER NOT NULL,
    dia INTEGER NOT NULL,
    trimestre INTEGER NOT NULL,
    dia_semana INTEGER NOT NULL, -- 1=Lunes, 7=Domingo
    es_fin_semana BOOLEAN NOT NULL,
    es_horario_pico BOOLEAN DEFAULT FALSE,
    
    -- Constraint único en la combinación fecha + hora + minuto
    UNIQUE (fecha, hora, minuto)
);

CREATE INDEX idx_dim_tiempo_fecha ON warehouse.dim_tiempo(fecha);
CREATE INDEX idx_dim_tiempo_anio_mes ON warehouse.dim_tiempo(anio, mes);
CREATE INDEX idx_dim_tiempo_hora ON warehouse.dim_tiempo(hora); 

-- =============================================================================
-- DIMENSIÓN UBICACIÓN
-- =============================================================================
CREATE TABLE warehouse.dim_ubicacion (
    ubicacion_id SERIAL PRIMARY KEY,
    provincia VARCHAR(50) NOT NULL UNIQUE,
    latitud_min DECIMAL(10,8),
    latitud_max DECIMAL(10,8), 
    longitud_min DECIMAL(11,8),
    longitud_max DECIMAL(11,8),
    es_zona_activa BOOLEAN DEFAULT TRUE,
    descripcion TEXT
);

-- Poblar dimensión con provincias de Costa Rica
INSERT INTO warehouse.dim_ubicacion (provincia, latitud_min, latitud_max, longitud_min, longitud_max, descripcion) VALUES
('San José', 9.8, 10.1, -84.4, -84.0, 'Provincia central, área metropolitana'),
('Cartago', 9.7, 10.2, -84.2, -83.6, 'Provincia este, zona montañosa'),
('Heredia', 9.9, 10.5, -84.4, -84.0, 'Provincia norte del Valle Central'),
('Alajuela', 10.0, 10.9, -84.9, -84.1, 'Provincia oeste, incluye aeropuerto'),
('Guanacaste', 10.2, 11.2, -86.0, -85.0, 'Provincia noroeste, zona seca'),
('Puntarenas', 8.5, 11.0, -85.9, -84.6, 'Provincia oeste, costa Pacífico'),
('Limón', 8.5, 11.2, -84.0, -82.5, 'Provincia este, costa Caribe'),
('Sin Ubicación', NULL, NULL, NULL, NULL, 'Coordenadas no válidas o no disponibles');

CREATE INDEX idx_dim_ubicacion_provincia ON warehouse.dim_ubicacion(provincia);

-- =============================================================================
-- DIMENSIÓN CATEGORÍAS
-- =============================================================================
CREATE TABLE warehouse.dim_categorias (
    categoria_id SERIAL PRIMARY KEY,
    nombre_categoria VARCHAR(50) NOT NULL UNIQUE
);

CREATE INDEX idx_dim_categorias_nombre ON warehouse.dim_categorias(nombre_categoria);

-- =============================================================================
-- DIMENSIÓN PRODUCTOS
-- =============================================================================
CREATE TABLE warehouse.dim_productos (
    producto_id INTEGER PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    categoria_id INTEGER REFERENCES warehouse.dim_categorias(categoria_id),
    precio_actual DECIMAL(10,2),
    precio_promedio DECIMAL(10,2),
    id_menu INTEGER,
    id_restaurante INTEGER,
    activo BOOLEAN DEFAULT TRUE,
    fecha_ultima_actualizacion TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_dim_productos_categoria ON warehouse.dim_productos(categoria_id);
CREATE INDEX idx_dim_productos_restaurante ON warehouse.dim_productos(id_restaurante);

-- =============================================================================
-- TABLA DE HECHOS: PEDIDOS 
-- =============================================================================
CREATE TABLE warehouse.fact_pedidos (
    id_pedido INTEGER NOT NULL,
    tiempo_id INTEGER NOT NULL REFERENCES warehouse.dim_tiempo(tiempo_id),
    id_usuario INTEGER,
    id_restaurante INTEGER,
    id_repartidor INTEGER,
    estado VARCHAR(20),
    tipo VARCHAR(20),
    total_pedido DECIMAL(10,2),
    cantidad_items INTEGER,
    -- Coordenadas del usuario y restaurante
    usuario_latitud DECIMAL(10,8),
    usuario_longitud DECIMAL(11,8),
    restaurante_latitud DECIMAL(10,8),
    restaurante_longitud DECIMAL(11,8),

    -- Provincias calculadas
    provincia_cliente VARCHAR(50),
    provincia_restaurante VARCHAR(50),

    -- Fechas y trazabilidad
    fecha_creacion TIMESTAMP,
    fecha_etl TIMESTAMP DEFAULT NOW(),
    fuente_datos VARCHAR(20) NOT NULL CHECK (fuente_datos IN ('postgres', 'mongo')),
    
    PRIMARY KEY (id_pedido, tiempo_id, fuente_datos)
);

CREATE INDEX idx_fact_pedidos_tiempo ON warehouse.fact_pedidos(tiempo_id);
CREATE INDEX idx_fact_pedidos_restaurante ON warehouse.fact_pedidos(id_restaurante);
CREATE INDEX idx_fact_pedidos_estado ON warehouse.fact_pedidos(estado);
CREATE INDEX idx_fact_pedidos_fuente ON warehouse.fact_pedidos(fuente_datos);
CREATE INDEX idx_fact_pedidos_provincia_cliente ON warehouse.fact_pedidos(provincia_cliente);
CREATE INDEX idx_fact_pedidos_provincia_restaurante ON warehouse.fact_pedidos(provincia_restaurante);

-- =============================================================================
-- TABLA DE HECHOS: RESERVAS
-- =============================================================================
CREATE TABLE warehouse.fact_reservas (
    id_reserva INTEGER NOT NULL,
    tiempo_id INTEGER NOT NULL REFERENCES warehouse.dim_tiempo(tiempo_id),
    id_usuario INTEGER,
    id_restaurante INTEGER,
    estado VARCHAR(20),
    
    -- Fechas y trazabilidad
    fecha_creacion TIMESTAMP,
    fecha_etl TIMESTAMP DEFAULT NOW(),
    fuente_datos VARCHAR(20) NOT NULL CHECK (fuente_datos IN ('postgres', 'mongo')),
    
    PRIMARY KEY (id_reserva, tiempo_id, fuente_datos)
);

CREATE INDEX idx_fact_reservas_tiempo ON warehouse.fact_reservas(tiempo_id);
CREATE INDEX idx_fact_reservas_restaurante ON warehouse.fact_reservas(id_restaurante);
CREATE INDEX idx_fact_reservas_estado ON warehouse.fact_reservas(estado);
CREATE INDEX idx_fact_reservas_fuente ON warehouse.fact_reservas(fuente_datos);

-- =============================================================================
-- TABLA DE HECHOS: DETALLE PEDIDOS
-- =============================================================================
CREATE TABLE warehouse.fact_detalle_pedidos (
    id_pedido INTEGER NOT NULL,
    id_producto INTEGER NOT NULL,
    tiempo_id INTEGER NOT NULL REFERENCES warehouse.dim_tiempo(tiempo_id),
    categoria_id INTEGER REFERENCES warehouse.dim_categorias(categoria_id),
    
    -- Info del contexto del pedido
    id_usuario INTEGER,
    id_restaurante INTEGER,
    id_repartidor INTEGER,
    estado_pedido VARCHAR(20),
    tipo_pedido VARCHAR(20),
    
    -- Métricas del producto en el pedido
    cantidad INTEGER NOT NULL,
    precio_unitario DECIMAL(10,2),
    subtotal DECIMAL(10,2) NOT NULL,
    
    -- Geografía (heredada del pedido)
    provincia_cliente VARCHAR(50),
    provincia_restaurante VARCHAR(50),
    
    -- Trazabilidad
    fecha_creacion TIMESTAMP,
    fecha_etl TIMESTAMP DEFAULT NOW(),
    fuente_datos VARCHAR(20) NOT NULL CHECK (fuente_datos IN ('postgres', 'mongo')),
    
    PRIMARY KEY (id_pedido, id_producto, tiempo_id, fuente_datos)
);

CREATE INDEX idx_fact_detalle_tiempo ON warehouse.fact_detalle_pedidos(tiempo_id);
CREATE INDEX idx_fact_detalle_categoria ON warehouse.fact_detalle_pedidos(categoria_id);
CREATE INDEX idx_fact_detalle_restaurante ON warehouse.fact_detalle_pedidos(id_restaurante);
CREATE INDEX idx_fact_detalle_provincia_cliente ON warehouse.fact_detalle_pedidos(provincia_cliente);

-- =============================================================================
-- CUBO: PEDIDOS POR TIEMPO
-- =============================================================================
CREATE MATERIALIZED VIEW warehouse.cubo_pedidos_tiempo AS
SELECT 
    dt.fecha,
    dt.anio,
    dt.mes,
    dt.trimestre,
    dt.dia_semana,
    dt.es_fin_semana,
    
    -- Métricas de pedidos
    COUNT(fp.id_pedido) as total_pedidos,
    COALESCE(SUM(fp.total_pedido), 0) as ingresos_totales,
    COALESCE(AVG(fp.total_pedido), 0) as ticket_promedio,
    COALESCE(SUM(fp.cantidad_items), 0) as items_vendidos,
    
    -- Por estado
    COUNT(CASE WHEN fp.estado = 'entregado' THEN 1 END) as pedidos_entregados,
    COUNT(CASE WHEN fp.estado = 'pendiente' THEN 1 END) as pedidos_pendientes,
    COUNT(CASE WHEN fp.estado = 'en preparacion' THEN 1 END) as pedidos_preparacion,
    COUNT(CASE WHEN fp.estado = 'listo' THEN 1 END) as pedidos_listos,
    
    -- Por tipo
    COUNT(CASE WHEN fp.tipo = 'en restaurante' THEN 1 END) as pedidos_restaurante,
    COUNT(CASE WHEN fp.tipo = 'para recoger' THEN 1 END) as pedidos_recoger,
    
    -- Por fuente
    COUNT(CASE WHEN fp.fuente_datos = 'postgres' THEN 1 END) as pedidos_postgres,
    COUNT(CASE WHEN fp.fuente_datos = 'mongo' THEN 1 END) as pedidos_mongo

FROM warehouse.dim_tiempo dt
LEFT JOIN warehouse.fact_pedidos fp ON dt.tiempo_id = fp.tiempo_id
GROUP BY dt.fecha, dt.anio, dt.mes, dt.trimestre, dt.dia_semana, dt.es_fin_semana
ORDER BY dt.fecha;

CREATE INDEX idx_cubo_pedidos_fecha ON warehouse.cubo_pedidos_tiempo(fecha);

-- =============================================================================
-- CUBO: RESERVAS POR TIEMPO
-- =============================================================================
CREATE MATERIALIZED VIEW warehouse.cubo_reservas_tiempo AS
SELECT 
    dt.fecha,
    dt.anio,
    dt.mes,
    dt.trimestre,
    dt.dia_semana,
    dt.es_fin_semana,
    
    -- Métricas de reservas
    COUNT(fr.id_reserva) as total_reservas,
    
    -- Por estado
    COUNT(CASE WHEN fr.estado = 'confirmada' THEN 1 END) as reservas_confirmadas,
    COUNT(CASE WHEN fr.estado = 'pendiente' THEN 1 END) as reservas_pendientes,
    COUNT(CASE WHEN fr.estado = 'cancelada' THEN 1 END) as reservas_canceladas,
    
    -- Tasa de confirmación
    CASE 
        WHEN COUNT(fr.id_reserva) > 0 THEN 
            ROUND((COUNT(CASE WHEN fr.estado = 'confirmada' THEN 1 END) * 100.0 / COUNT(fr.id_reserva)), 2)
        ELSE 0 
    END as tasa_confirmacion_pct,
    
    -- Por fuente
    COUNT(CASE WHEN fr.fuente_datos = 'postgres' THEN 1 END) as reservas_postgres,
    COUNT(CASE WHEN fr.fuente_datos = 'mongo' THEN 1 END) as reservas_mongo

FROM warehouse.dim_tiempo dt
LEFT JOIN warehouse.fact_reservas fr ON dt.tiempo_id = fr.tiempo_id
GROUP BY dt.fecha, dt.anio, dt.mes, dt.trimestre, dt.dia_semana, dt.es_fin_semana
ORDER BY dt.fecha;

CREATE INDEX idx_cubo_reservas_fecha ON warehouse.cubo_reservas_tiempo(fecha);

-- =============================================================================
-- CUBO: PEDIDOS POR UBICACIÓN
-- =============================================================================
CREATE MATERIALIZED VIEW warehouse.cubo_pedidos_ubicacion AS
SELECT 
    fp.provincia_cliente,
    fp.provincia_restaurante,
    dt.anio,
    dt.mes,
    dt.trimestre,
    
    -- Métricas básicas de pedidos
    COUNT(*) as total_pedidos,
    COALESCE(SUM(fp.total_pedido), 0) as ingresos_totales,
    COALESCE(AVG(fp.total_pedido), 0) as ticket_promedio,
    COALESCE(SUM(fp.cantidad_items), 0) as items_vendidos,
    
    -- Métricas de movilidad/distancia
    COUNT(CASE WHEN fp.provincia_cliente = fp.provincia_restaurante THEN 1 END) as pedidos_misma_provincia,
    COUNT(CASE WHEN fp.provincia_cliente != fp.provincia_restaurante THEN 1 END) as pedidos_inter_provincia,
    
    -- Porcentaje de pedidos locales vs inter-provincia
    CASE 
        WHEN COUNT(*) > 0 THEN 
            ROUND((COUNT(CASE WHEN fp.provincia_cliente = fp.provincia_restaurante THEN 1 END) * 100.0 / COUNT(*)), 2)
        ELSE 0 
    END as porcentaje_pedidos_locales,
    
    -- Por estado
    COUNT(CASE WHEN fp.estado = 'entregado' THEN 1 END) as pedidos_entregados,
    COUNT(CASE WHEN fp.estado = 'pendiente' THEN 1 END) as pedidos_pendientes,
    COUNT(CASE WHEN fp.estado = 'en preparacion' THEN 1 END) as pedidos_preparacion,
    COUNT(CASE WHEN fp.estado = 'listo' THEN 1 END) as pedidos_listos,
    
    -- Por tipo  
    COUNT(CASE WHEN fp.tipo = 'en restaurante' THEN 1 END) as pedidos_restaurante,
    COUNT(CASE WHEN fp.tipo = 'para recoger' THEN 1 END) as pedidos_recoger,
    
    -- Por fuente
    COUNT(CASE WHEN fp.fuente_datos = 'postgres' THEN 1 END) as pedidos_postgres,
    COUNT(CASE WHEN fp.fuente_datos = 'mongo' THEN 1 END) as pedidos_mongo,
    
    -- Usuarios únicos
    COUNT(DISTINCT fp.id_usuario) as usuarios_unicos,
    COUNT(DISTINCT fp.id_restaurante) as restaurantes_unicos

FROM warehouse.fact_pedidos fp
JOIN warehouse.dim_tiempo dt ON fp.tiempo_id = dt.tiempo_id
WHERE fp.provincia_cliente IS NOT NULL 
  AND fp.provincia_restaurante IS NOT NULL
GROUP BY fp.provincia_cliente, fp.provincia_restaurante, dt.anio, dt.mes, dt.trimestre
ORDER BY dt.anio DESC, dt.mes DESC, total_pedidos DESC;

CREATE INDEX idx_cubo_pedidos_ubicacion_provincias ON warehouse.cubo_pedidos_ubicacion(provincia_cliente, provincia_restaurante);
CREATE INDEX idx_cubo_pedidos_ubicacion_tiempo ON warehouse.cubo_pedidos_ubicacion(anio, mes);


-- =============================================================================
-- CUBO: ACTIVIDAD POR ZONA GEOGRÁFICA
-- =============================================================================
CREATE MATERIALIZED VIEW warehouse.cubo_actividad_zona AS
SELECT 
    fp.provincia_restaurante as provincia,
    dt.anio,
    dt.mes,
    dt.trimestre,
    
    -- Métricas de oferta (lado restaurante)
    COUNT(DISTINCT fp.id_restaurante) as restaurantes_activos,
    COUNT(DISTINCT fp.id_repartidor) as repartidores_activos,
    
    -- Métricas de demanda (lado cliente)
    COUNT(DISTINCT fp.id_usuario) as usuarios_activos,
    COUNT(DISTINCT fp.provincia_cliente) as provincias_origen_clientes,
    
    -- Métricas de volumen
    COUNT(*) as total_transacciones,
    COALESCE(SUM(fp.total_pedido), 0) as volumen_negocio,
    COALESCE(AVG(fp.total_pedido), 0) as ticket_promedio_zona,
    COALESCE(SUM(fp.cantidad_items), 0) as items_vendidos,
    
    -- Indicadores de atractivo de la zona
    COUNT(CASE WHEN fp.provincia_cliente != fp.provincia_restaurante THEN 1 END) as pedidos_recibidos_otras_provincias,
    CASE 
        WHEN COUNT(*) > 0 THEN 
            ROUND((COUNT(CASE WHEN fp.provincia_cliente != fp.provincia_restaurante THEN 1 END) * 100.0 / COUNT(*)), 2)
        ELSE 0 
    END as porcentaje_clientes_externos,
    
    -- Métricas de eficiencia
    COUNT(CASE WHEN fp.estado = 'entregado' THEN 1 END) as pedidos_completados,
    CASE 
        WHEN COUNT(*) > 0 THEN 
            ROUND((COUNT(CASE WHEN fp.estado = 'entregado' THEN 1 END) * 100.0 / COUNT(*)), 2)
        ELSE 0 
    END as tasa_completitud_pct,
    
    -- Por fuente de datos
    COUNT(CASE WHEN fp.fuente_datos = 'postgres' THEN 1 END) as transacciones_postgres,
    COUNT(CASE WHEN fp.fuente_datos = 'mongo' THEN 1 END) as transacciones_mongo

FROM warehouse.fact_pedidos fp
JOIN warehouse.dim_tiempo dt ON fp.tiempo_id = dt.tiempo_id
WHERE fp.provincia_restaurante IS NOT NULL 
  AND fp.provincia_restaurante != 'Sin Ubicación'
GROUP BY fp.provincia_restaurante, dt.anio, dt.mes, dt.trimestre
ORDER BY dt.anio DESC, dt.mes DESC, volumen_negocio DESC;

CREATE INDEX idx_cubo_actividad_zona_provincia ON warehouse.cubo_actividad_zona(provincia);
CREATE INDEX idx_cubo_actividad_zona_tiempo ON warehouse.cubo_actividad_zona(anio, mes);

-- =============================================================================
-- CUBO: MATRIZ ORIGEN-DESTINO
-- =============================================================================
CREATE MATERIALIZED VIEW warehouse.cubo_matriz_od AS
SELECT 
    fp.provincia_cliente as origen,
    fp.provincia_restaurante as destino,
    dt.anio,
    dt.mes,
    
    -- Métricas del flujo
    COUNT(*) as total_pedidos,
    COALESCE(SUM(fp.total_pedido), 0) as valor_flujo,
    COALESCE(AVG(fp.total_pedido), 0) as ticket_promedio,
    COUNT(DISTINCT fp.id_usuario) as usuarios_unicos,
    COUNT(DISTINCT fp.id_restaurante) as restaurantes_unicos,
    
    -- Clasificación del flujo
    CASE 
        WHEN fp.provincia_cliente = fp.provincia_restaurante THEN 'Local'
        WHEN fp.provincia_cliente = 'Sin Ubicación' OR fp.provincia_restaurante = 'Sin Ubicación' THEN 'Sin Info'
        ELSE 'Inter-Provincial'
    END as tipo_flujo,
    
    -- Por fuente de datos
    COUNT(CASE WHEN fp.fuente_datos = 'postgres' THEN 1 END) as pedidos_postgres,
    COUNT(CASE WHEN fp.fuente_datos = 'mongo' THEN 1 END) as pedidos_mongo

FROM warehouse.fact_pedidos fp
JOIN warehouse.dim_tiempo dt ON fp.tiempo_id = dt.tiempo_id
WHERE fp.provincia_cliente IS NOT NULL 
  AND fp.provincia_restaurante IS NOT NULL
GROUP BY fp.provincia_cliente, fp.provincia_restaurante, dt.anio, dt.mes
ORDER BY dt.anio DESC, dt.mes DESC, total_pedidos DESC;

CREATE INDEX idx_cubo_matriz_od_origen_destino ON warehouse.cubo_matriz_od(origen, destino);
CREATE INDEX idx_cubo_matriz_od_tiempo ON warehouse.cubo_matriz_od(anio, mes);
CREATE INDEX idx_cubo_matriz_od_tipo_flujo ON warehouse.cubo_matriz_od(tipo_flujo);

-- =============================================================================
-- CUBO: PRODUCTOS POR TIEMPO
-- =============================================================================
CREATE MATERIALIZED VIEW warehouse.cubo_productos_tiempo AS
SELECT 
    dt.fecha,
    dt.anio,
    dt.mes,
    dt.trimestre,
    dt.dia_semana,
    dt.es_fin_semana,
    
    -- Métricas de productos
    COUNT(fdp.id_producto) as total_productos_vendidos,
    COUNT(DISTINCT fdp.id_producto) as productos_unicos,
    COALESCE(SUM(fdp.subtotal), 0) as ingresos_productos,
    COALESCE(SUM(fdp.cantidad), 0) as unidades_vendidas,
    COALESCE(AVG(fdp.precio_unitario), 0) as precio_promedio,
    
    -- Top categorías
    COUNT(CASE WHEN dc.nombre_categoria = 'Bebida' THEN 1 END) as ventas_bebidas,
    COUNT(CASE WHEN dc.nombre_categoria = 'Plato principal' THEN 1 END) as ventas_platos_principales,
    COUNT(CASE WHEN dc.nombre_categoria = 'Postre' THEN 1 END) as ventas_postres,
    COUNT(CASE WHEN dc.nombre_categoria = 'Entrada' THEN 1 END) as ventas_entradas,
    
    -- Por estado del pedido
    COUNT(CASE WHEN fdp.estado_pedido = 'entregado' THEN 1 END) as productos_entregados,
    COUNT(CASE WHEN fdp.estado_pedido = 'pendiente' THEN 1 END) as productos_pendientes,
    
    -- Por fuente
    COUNT(CASE WHEN fdp.fuente_datos = 'postgres' THEN 1 END) as productos_postgres,
    COUNT(CASE WHEN fdp.fuente_datos = 'mongo' THEN 1 END) as productos_mongo

FROM warehouse.dim_tiempo dt
LEFT JOIN warehouse.fact_detalle_pedidos fdp ON dt.tiempo_id = fdp.tiempo_id
LEFT JOIN warehouse.dim_categorias dc ON fdp.categoria_id = dc.categoria_id
GROUP BY dt.fecha, dt.anio, dt.mes, dt.trimestre, dt.dia_semana, dt.es_fin_semana
ORDER BY dt.fecha;

CREATE INDEX idx_cubo_productos_tiempo_fecha ON warehouse.cubo_productos_tiempo(fecha);

-- =============================================================================
-- CUBO: PRODUCTOS POR UBICACIÓN
-- =============================================================================
CREATE MATERIALIZED VIEW warehouse.cubo_productos_ubicacion AS
SELECT 
    fdp.provincia_cliente,
    fdp.provincia_restaurante,
    dc.nombre_categoria,
    dt.anio,
    dt.mes,
    dt.trimestre,
    
    -- Métricas básicas
    COUNT(*) as total_ventas,
    COALESCE(SUM(fdp.subtotal), 0) as ingresos_categoria,
    COALESCE(SUM(fdp.cantidad), 0) as unidades_vendidas,
    COALESCE(AVG(fdp.precio_unitario), 0) as precio_promedio,
    COUNT(DISTINCT fdp.id_producto) as productos_unicos,
    COUNT(DISTINCT fdp.id_restaurante) as restaurantes_vendedores,
    COUNT(DISTINCT fdp.id_usuario) as usuarios_compradores,
    
    -- Análisis de penetración
    CASE 
        WHEN COUNT(*) > 0 THEN 
            ROUND((COUNT(CASE WHEN fdp.provincia_cliente = fdp.provincia_restaurante THEN 1 END) * 100.0 / COUNT(*)), 2)
        ELSE 0 
    END as porcentaje_ventas_locales,
    
    -- Por fuente
    COUNT(CASE WHEN fdp.fuente_datos = 'postgres' THEN 1 END) as ventas_postgres,
    COUNT(CASE WHEN fdp.fuente_datos = 'mongo' THEN 1 END) as ventas_mongo

FROM warehouse.fact_detalle_pedidos fdp
JOIN warehouse.dim_tiempo dt ON fdp.tiempo_id = dt.tiempo_id
JOIN warehouse.dim_categorias dc ON fdp.categoria_id = dc.categoria_id
WHERE fdp.provincia_cliente IS NOT NULL 
  AND fdp.provincia_restaurante IS NOT NULL
GROUP BY fdp.provincia_cliente, fdp.provincia_restaurante, dc.nombre_categoria, dt.anio, dt.mes, dt.trimestre
ORDER BY dt.anio DESC, dt.mes DESC, ingresos_categoria DESC;

CREATE INDEX idx_cubo_productos_ubicacion_provincias ON warehouse.cubo_productos_ubicacion(provincia_cliente, provincia_restaurante);
CREATE INDEX idx_cubo_productos_ubicacion_categoria ON warehouse.cubo_productos_ubicacion(nombre_categoria);

-- =============================================================================
-- CUBO: TOP PRODUCTOS 
-- =============================================================================
-- Cubo agregado por año completo (menos granular)
CREATE MATERIALIZED VIEW warehouse.cubo_top_productos_anual AS
SELECT 
    dp.producto_id,
    dp.nombre as nombre_producto,
    dc.nombre_categoria,
    dt.anio,  -- Solo año, no mes
    
    COUNT(*) as total_ventas,
    SUM(fdp.subtotal) as ingresos_totales,
    SUM(fdp.cantidad) as unidades_vendidas,
    
    RANK() OVER (PARTITION BY dt.anio ORDER BY SUM(fdp.subtotal) DESC) as ranking_ingresos
    
FROM warehouse.fact_detalle_pedidos fdp
JOIN warehouse.dim_tiempo dt ON fdp.tiempo_id = dt.tiempo_id
JOIN warehouse.dim_productos dp ON fdp.id_producto = dp.producto_id
JOIN warehouse.dim_categorias dc ON fdp.categoria_id = dc.categoria_id
GROUP BY dp.producto_id, dp.nombre, dc.nombre_categoria, dt.anio
ORDER BY dt.anio DESC, ingresos_totales DESC;

CREATE INDEX idx_cubo_top_productos_anual_anio ON warehouse.cubo_top_productos_anual(anio);
CREATE INDEX idx_cubo_top_productos_anual_categoria ON warehouse.cubo_top_productos_anual(nombre_categoria);
CREATE INDEX idx_cubo_top_productos_anual_ranking ON warehouse.cubo_top_productos_anual(ranking_ingresos);
CREATE INDEX idx_cubo_top_productos_anual_producto ON warehouse.cubo_top_productos_anual(producto_id);

CREATE MATERIALIZED VIEW warehouse.cubo_frecuencia_uso AS
SELECT 
    fdp.id_usuario,
    dp.producto_id,
    dp.nombre as producto,
    dc.nombre_categoria,
    
    -- Métricas de frecuencia
    COUNT(*) as veces_comprado,
    SUM(fdp.cantidad) as unidades_totales,
    AVG(fdp.subtotal) as gasto_promedio_por_compra,
    SUM(fdp.subtotal) as gasto_total_producto,
    
    -- Primera y última compra
    MIN(fdp.fecha_creacion) as primera_compra,
    MAX(fdp.fecha_creacion) as ultima_compra,
    
    -- Ranking de preferencia del usuario
    RANK() OVER (PARTITION BY fdp.id_usuario ORDER BY COUNT(*) DESC) as ranking_preferencia_usuario
    
FROM warehouse.fact_detalle_pedidos fdp
JOIN warehouse.dim_productos dp ON fdp.id_producto = dp.producto_id
JOIN warehouse.dim_categorias dc ON fdp.categoria_id = dc.categoria_id
GROUP BY fdp.id_usuario, dp.producto_id, dp.nombre, dc.nombre_categoria
ORDER BY fdp.id_usuario, veces_comprado DESC;