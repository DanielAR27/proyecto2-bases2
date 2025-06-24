SET hive.exec.compress.output=true;
SET mapred.output.compression.codec=org.apache.hadoop.io.compress.GzipCodec;
SET hive.exec.dynamic.partition=true;
SET hive.exec.dynamic.partition.mode=nonstrict;

CREATE DATABASE IF NOT EXISTS warehouse
COMMENT 'Data Warehouse para análisis OLAP de restaurantes';

USE warehouse;

CREATE TABLE IF NOT EXISTS dim_tiempo (
    tiempo_id BIGINT,
    fecha STRING,
    hora INT,
    minuto INT,
    anio INT,
    mes INT,
    dia INT,
    trimestre INT,
    dia_semana INT, 
    es_fin_semana BOOLEAN,
    es_horario_pico BOOLEAN
)
COMMENT 'Dimensión temporal para análisis OLAP'
STORED AS PARQUET
TBLPROPERTIES ('parquet.compress'='SNAPPY');

CREATE TABLE IF NOT EXISTS dim_ubicacion (
    ubicacion_id INT,
    provincia STRING,
    latitud_min DECIMAL(10,8),
    latitud_max DECIMAL(10,8), 
    longitud_min DECIMAL(11,8),
    longitud_max DECIMAL(11,8),
    es_zona_activa BOOLEAN,
    descripcion STRING
)
COMMENT 'Dimensión geográfica por provincias de Costa Rica'
STORED AS PARQUET
TBLPROPERTIES ('parquet.compress'='SNAPPY');


INSERT INTO TABLE dim_ubicacion VALUES
(1, 'San José', 9.8, 10.1, -84.4, -84.0, true, 'Provincia central, área metropolitana'),
(2, 'Cartago', 9.7, 10.2, -84.2, -83.6, true, 'Provincia este, zona montañosa'),
(3, 'Heredia', 9.9, 10.5, -84.4, -84.0, true, 'Provincia norte del Valle Central'),
(4, 'Alajuela', 10.0, 10.9, -84.9, -84.1, true, 'Provincia oeste, incluye aeropuerto'),
(5, 'Guanacaste', 10.2, 11.2, -86.0, -85.0, true, 'Provincia noroeste, zona seca'),
(6, 'Puntarenas', 8.5, 11.0, -85.9, -84.6, true, 'Provincia oeste, costa Pacífico'),
(7, 'Limón', 8.5, 11.2, -84.0, -82.5, true, 'Provincia este, costa Caribe'),
(8, 'Sin Ubicación', null, null, null, null, false, 'Coordenadas no válidas o no disponibles');

CREATE TABLE IF NOT EXISTS dim_categorias (
    categoria_id INT,
    nombre_categoria STRING
)
COMMENT 'Dimensión de categorías de productos'
STORED AS PARQUET
TBLPROPERTIES ('parquet.compress'='SNAPPY');

CREATE TABLE IF NOT EXISTS dim_productos (
    producto_id INT,
    nombre STRING,
    categoria_id INT,
    precio_actual DECIMAL(10,2),
    precio_promedio DECIMAL(10,2),
    id_menu INT,
    id_restaurante INT,
    activo BOOLEAN,
    fecha_ultima_actualizacion STRING,
    fuente_datos STRING
)
COMMENT 'Dimensión de productos del catálogo'
STORED AS PARQUET
TBLPROPERTIES ('parquet.compress'='SNAPPY');

CREATE TABLE IF NOT EXISTS fact_pedidos (
    id_pedido INT,
    tiempo_id BIGINT,
    id_usuario INT,
    id_restaurante INT,
    id_repartidor INT,
    estado STRING,
    tipo STRING,
    total_pedido DECIMAL(10,2),
    cantidad_items INT,
    
    usuario_latitud DECIMAL(10,8),
    usuario_longitud DECIMAL(11,8),
    restaurante_latitud DECIMAL(10,8),
    restaurante_longitud DECIMAL(11,8),

    provincia_cliente STRING,
    provincia_restaurante STRING,

    fecha_creacion STRING,
    fecha_etl STRING,
    fuente_datos STRING
)
COMMENT 'Tabla de hechos de pedidos con métricas de negocio'
PARTITIONED BY (anio INT, mes INT)
STORED AS PARQUET
TBLPROPERTIES ('parquet.compress'='SNAPPY');

CREATE TABLE IF NOT EXISTS fact_reservas (
    id_reserva INT,
    tiempo_id BIGINT,
    id_usuario INT,
    id_restaurante INT,
    estado STRING,
    
    fecha_creacion STRING,
    fecha_etl STRING,
    fuente_datos STRING
)
COMMENT 'Tabla de hechos de reservas'
PARTITIONED BY (anio INT, mes INT)
STORED AS PARQUET
TBLPROPERTIES ('parquet.compress'='SNAPPY');

CREATE TABLE IF NOT EXISTS fact_detalle_pedidos (
    id_pedido INT,
    id_producto INT,
    tiempo_id BIGINT,
    categoria_id INT,
    
    id_usuario INT,
    id_restaurante INT,
    id_repartidor INT,
    estado_pedido STRING,
    tipo_pedido STRING,
    
    cantidad INT,
    precio_unitario DECIMAL(10,2),
    subtotal DECIMAL(10,2),
    
    provincia_cliente STRING,
    provincia_restaurante STRING,
    
    fecha_creacion STRING,
    fecha_etl STRING,
    fuente_datos STRING
)
COMMENT 'Tabla de hechos de detalle de pedidos'
PARTITIONED BY (anio INT, mes INT)
STORED AS PARQUET
TBLPROPERTIES ('parquet.compress'='SNAPPY');

CREATE VIEW IF NOT EXISTS cubo_pedidos_tiempo AS
SELECT 
    dt.fecha,
    dt.anio,
    dt.mes,
    dt.trimestre,
    dt.dia_semana,
    dt.es_fin_semana,
    
    COUNT(fp.id_pedido) as total_pedidos,
    COALESCE(SUM(fp.total_pedido), 0) as ingresos_totales,
    COALESCE(AVG(fp.total_pedido), 0) as ticket_promedio,
    COALESCE(SUM(fp.cantidad_items), 0) as items_vendidos,
    
    SUM(CASE WHEN fp.estado = 'entregado' THEN 1 ELSE 0 END) as pedidos_entregados,
    SUM(CASE WHEN fp.estado = 'pendiente' THEN 1 ELSE 0 END) as pedidos_pendientes,
    SUM(CASE WHEN fp.estado = 'en preparacion' THEN 1 ELSE 0 END) as pedidos_preparacion,
    SUM(CASE WHEN fp.estado = 'listo' THEN 1 ELSE 0 END) as pedidos_listos,
    
    SUM(CASE WHEN fp.tipo = 'en restaurante' THEN 1 ELSE 0 END) as pedidos_restaurante,
    SUM(CASE WHEN fp.tipo = 'para recoger' THEN 1 ELSE 0 END) as pedidos_recoger,
    
    SUM(CASE WHEN fp.fuente_datos = 'postgres' THEN 1 ELSE 0 END) as pedidos_postgres,
    SUM(CASE WHEN fp.fuente_datos = 'mongo' THEN 1 ELSE 0 END) as pedidos_mongo

FROM dim_tiempo dt
LEFT JOIN fact_pedidos fp ON dt.tiempo_id = fp.tiempo_id
GROUP BY dt.fecha, dt.anio, dt.mes, dt.trimestre, dt.dia_semana, dt.es_fin_semana;

CREATE VIEW IF NOT EXISTS cubo_reservas_tiempo AS
SELECT 
    dt.fecha,
    dt.anio,
    dt.mes,
    dt.trimestre,
    dt.dia_semana,
    dt.es_fin_semana,
    
    COUNT(fr.id_reserva) as total_reservas,
    
    SUM(CASE WHEN fr.estado = 'confirmada' THEN 1 ELSE 0 END) as reservas_confirmadas,
    SUM(CASE WHEN fr.estado = 'pendiente' THEN 1 ELSE 0 END) as reservas_pendientes,
    SUM(CASE WHEN fr.estado = 'cancelada' THEN 1 ELSE 0 END) as reservas_canceladas,
    
    CASE 
        WHEN COUNT(fr.id_reserva) > 0 THEN 
            ROUND((SUM(CASE WHEN fr.estado = 'confirmada' THEN 1 ELSE 0 END) * 100.0 / COUNT(fr.id_reserva)), 2)
        ELSE 0 
    END as tasa_confirmacion_pct,
    
    SUM(CASE WHEN fr.fuente_datos = 'postgres' THEN 1 ELSE 0 END) as reservas_postgres,
    SUM(CASE WHEN fr.fuente_datos = 'mongo' THEN 1 ELSE 0 END) as reservas_mongo

FROM dim_tiempo dt
LEFT JOIN fact_reservas fr ON dt.tiempo_id = fr.tiempo_id
GROUP BY dt.fecha, dt.anio, dt.mes, dt.trimestre, dt.dia_semana, dt.es_fin_semana;

CREATE VIEW IF NOT EXISTS cubo_pedidos_ubicacion AS
SELECT 
    fp.provincia_cliente,
    fp.provincia_restaurante,
    dt.anio,
    dt.mes,
    dt.trimestre,
    
    COUNT(*) as total_pedidos,
    COALESCE(SUM(fp.total_pedido), 0) as ingresos_totales,
    COALESCE(AVG(fp.total_pedido), 0) as ticket_promedio,
    COALESCE(SUM(fp.cantidad_items), 0) as items_vendidos,
    
    SUM(CASE WHEN fp.provincia_cliente = fp.provincia_restaurante THEN 1 ELSE 0 END) as pedidos_misma_provincia,
    SUM(CASE WHEN fp.provincia_cliente != fp.provincia_restaurante THEN 1 ELSE 0 END) as pedidos_inter_provincia,
    
    CASE 
        WHEN COUNT(*) > 0 THEN 
            ROUND((SUM(CASE WHEN fp.provincia_cliente = fp.provincia_restaurante THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2)
        ELSE 0 
    END as porcentaje_pedidos_locales,
    
    SUM(CASE WHEN fp.estado = 'entregado' THEN 1 ELSE 0 END) as pedidos_entregados,
    SUM(CASE WHEN fp.estado = 'pendiente' THEN 1 ELSE 0 END) as pedidos_pendientes,
    SUM(CASE WHEN fp.estado = 'en preparacion' THEN 1 ELSE 0 END) as pedidos_preparacion,
    SUM(CASE WHEN fp.estado = 'listo' THEN 1 ELSE 0 END) as pedidos_listos,
    
    SUM(CASE WHEN fp.tipo = 'en restaurante' THEN 1 ELSE 0 END) as pedidos_restaurante,
    SUM(CASE WHEN fp.tipo = 'para recoger' THEN 1 ELSE 0 END) as pedidos_recoger,
    
    SUM(CASE WHEN fp.fuente_datos = 'postgres' THEN 1 ELSE 0 END) as pedidos_postgres,
    SUM(CASE WHEN fp.fuente_datos = 'mongo' THEN 1 ELSE 0 END) as pedidos_mongo,
    
    COUNT(DISTINCT fp.id_usuario) as usuarios_unicos,
    COUNT(DISTINCT fp.id_restaurante) as restaurantes_unicos

FROM fact_pedidos fp
JOIN dim_tiempo dt ON fp.tiempo_id = dt.tiempo_id
WHERE fp.provincia_cliente IS NOT NULL 
  AND fp.provincia_restaurante IS NOT NULL
GROUP BY fp.provincia_cliente, fp.provincia_restaurante, dt.anio, dt.mes, dt.trimestre;


CREATE VIEW IF NOT EXISTS cubo_actividad_zona AS
SELECT 
    fp.provincia_restaurante as provincia,
    dt.anio,
    dt.mes,
    dt.trimestre,
    
    COUNT(DISTINCT fp.id_restaurante) as restaurantes_activos,
    COUNT(DISTINCT fp.id_repartidor) as repartidores_activos,
    
    COUNT(DISTINCT fp.id_usuario) as usuarios_activos,
    COUNT(DISTINCT fp.provincia_cliente) as provincias_origen_clientes,
    
    COUNT(*) as total_transacciones,
    COALESCE(SUM(fp.total_pedido), 0) as volumen_negocio,
    COALESCE(AVG(fp.total_pedido), 0) as ticket_promedio_zona,
    COALESCE(SUM(fp.cantidad_items), 0) as items_vendidos,
    
    SUM(CASE WHEN fp.provincia_cliente != fp.provincia_restaurante THEN 1 ELSE 0 END) as pedidos_recibidos_otras_provincias,
    CASE 
        WHEN COUNT(*) > 0 THEN 
            ROUND((SUM(CASE WHEN fp.provincia_cliente != fp.provincia_restaurante THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2)
        ELSE 0 
    END as porcentaje_clientes_externos,
    
    SUM(CASE WHEN fp.estado = 'entregado' THEN 1 ELSE 0 END) as pedidos_completados,
    CASE 
        WHEN COUNT(*) > 0 THEN 
            ROUND((SUM(CASE WHEN fp.estado = 'entregado' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2)
        ELSE 0 
    END as tasa_completitud_pct,
    
    SUM(CASE WHEN fp.fuente_datos = 'postgres' THEN 1 ELSE 0 END) as transacciones_postgres,
    SUM(CASE WHEN fp.fuente_datos = 'mongo' THEN 1 ELSE 0 END) as transacciones_mongo

FROM fact_pedidos fp
JOIN dim_tiempo dt ON fp.tiempo_id = dt.tiempo_id
WHERE fp.provincia_restaurante IS NOT NULL 
  AND fp.provincia_restaurante != 'Sin Ubicación'
GROUP BY fp.provincia_restaurante, dt.anio, dt.mes, dt.trimestre;

CREATE VIEW IF NOT EXISTS cubo_matriz_od AS
SELECT 
    fp.provincia_cliente as origen,
    fp.provincia_restaurante as destino,
    dt.anio,
    dt.mes,
    
    COUNT(*) as total_pedidos,
    COALESCE(SUM(fp.total_pedido), 0) as valor_flujo,
    COALESCE(AVG(fp.total_pedido), 0) as ticket_promedio,
    COUNT(DISTINCT fp.id_usuario) as usuarios_unicos,
    COUNT(DISTINCT fp.id_restaurante) as restaurantes_unicos,

    CASE 
        WHEN fp.provincia_cliente = fp.provincia_restaurante THEN 'Local'
        WHEN fp.provincia_cliente = 'Sin Ubicación' OR fp.provincia_restaurante = 'Sin Ubicación' THEN 'Sin Info'
        ELSE 'Inter-Provincial'
    END as tipo_flujo,
    
    SUM(CASE WHEN fp.fuente_datos = 'postgres' THEN 1 ELSE 0 END) as pedidos_postgres,
    SUM(CASE WHEN fp.fuente_datos = 'mongo' THEN 1 ELSE 0 END) as pedidos_mongo

FROM fact_pedidos fp
JOIN dim_tiempo dt ON fp.tiempo_id = dt.tiempo_id
WHERE fp.provincia_cliente IS NOT NULL 
  AND fp.provincia_restaurante IS NOT NULL
GROUP BY fp.provincia_cliente, fp.provincia_restaurante, dt.anio, dt.mes;

CREATE VIEW IF NOT EXISTS cubo_productos_tiempo AS
SELECT 
    dt.fecha,
    dt.anio,
    dt.mes,
    dt.trimestre,
    dt.dia_semana,
    dt.es_fin_semana,
    
    COUNT(fdp.id_producto) as total_productos_vendidos,
    COUNT(DISTINCT fdp.id_producto) as productos_unicos,
    COALESCE(SUM(fdp.subtotal), 0) as ingresos_productos,
    COALESCE(SUM(fdp.cantidad), 0) as unidades_vendidas,
    COALESCE(AVG(fdp.precio_unitario), 0) as precio_promedio,
    
    SUM(CASE WHEN dc.nombre_categoria = 'Bebida' THEN 1 ELSE 0 END) as ventas_bebidas,
    SUM(CASE WHEN dc.nombre_categoria = 'Plato principal' THEN 1 ELSE 0 END) as ventas_platos_principales,
    SUM(CASE WHEN dc.nombre_categoria = 'Postre' THEN 1 ELSE 0 END) as ventas_postres,
    SUM(CASE WHEN dc.nombre_categoria = 'Entrada' THEN 1 ELSE 0 END) as ventas_entradas,
    
    SUM(CASE WHEN fdp.estado_pedido = 'entregado' THEN 1 ELSE 0 END) as productos_entregados,
    SUM(CASE WHEN fdp.estado_pedido = 'pendiente' THEN 1 ELSE 0 END) as productos_pendientes,
    
    SUM(CASE WHEN fdp.fuente_datos = 'postgres' THEN 1 ELSE 0 END) as productos_postgres,
    SUM(CASE WHEN fdp.fuente_datos = 'mongo' THEN 1 ELSE 0 END) as productos_mongo

FROM dim_tiempo dt
LEFT JOIN fact_detalle_pedidos fdp ON dt.tiempo_id = fdp.tiempo_id
LEFT JOIN dim_categorias dc ON fdp.categoria_id = dc.categoria_id
GROUP BY dt.fecha, dt.anio, dt.mes, dt.trimestre, dt.dia_semana, dt.es_fin_semana;

CREATE VIEW IF NOT EXISTS cubo_productos_ubicacion AS
SELECT 
    fdp.provincia_cliente,
    fdp.provincia_restaurante,
    dc.nombre_categoria,
    dt.anio,
    dt.mes,
    dt.trimestre,
    
    COUNT(*) as total_ventas,
    COALESCE(SUM(fdp.subtotal), 0) as ingresos_categoria,
    COALESCE(SUM(fdp.cantidad), 0) as unidades_vendidas,
    COALESCE(AVG(fdp.precio_unitario), 0) as precio_promedio,
    COUNT(DISTINCT fdp.id_producto) as productos_unicos,
    COUNT(DISTINCT fdp.id_restaurante) as restaurantes_vendedores,
    COUNT(DISTINCT fdp.id_usuario) as usuarios_compradores,
    
    CASE 
        WHEN COUNT(*) > 0 THEN 
            ROUND((SUM(CASE WHEN fdp.provincia_cliente = fdp.provincia_restaurante THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2)
        ELSE 0 
    END as porcentaje_ventas_locales,
    
    SUM(CASE WHEN fdp.fuente_datos = 'postgres' THEN 1 ELSE 0 END) as ventas_postgres,
    SUM(CASE WHEN fdp.fuente_datos = 'mongo' THEN 1 ELSE 0 END) as ventas_mongo

FROM fact_detalle_pedidos fdp
JOIN dim_tiempo dt ON fdp.tiempo_id = dt.tiempo_id
JOIN dim_categorias dc ON fdp.categoria_id = dc.categoria_id
WHERE fdp.provincia_cliente IS NOT NULL 
  AND fdp.provincia_restaurante IS NOT NULL
GROUP BY fdp.provincia_cliente, fdp.provincia_restaurante, dc.nombre_categoria, dt.anio, dt.mes, dt.trimestre;

CREATE VIEW IF NOT EXISTS cubo_top_productos_anual AS
SELECT 
    dp.producto_id,
    dp.nombre as nombre_producto,
    dc.nombre_categoria,
    dt.anio,
    
    COUNT(*) as total_ventas,
    SUM(fdp.subtotal) as ingresos_totales,
    SUM(fdp.cantidad) as unidades_vendidas,
    
    RANK() OVER (PARTITION BY dt.anio ORDER BY SUM(fdp.subtotal) DESC) as ranking_ingresos
    
FROM fact_detalle_pedidos fdp
JOIN dim_tiempo dt ON fdp.tiempo_id = dt.tiempo_id
JOIN dim_productos dp ON fdp.id_producto = dp.producto_id
JOIN dim_categorias dc ON fdp.categoria_id = dc.categoria_id
GROUP BY dp.producto_id, dp.nombre, dc.nombre_categoria, dt.anio;


CREATE VIEW IF NOT EXISTS cubo_frecuencia_uso AS
SELECT 
    fdp.id_usuario,
    dp.producto_id,
    dp.nombre as producto,
    dc.nombre_categoria,

    COUNT(*) as veces_comprado,
    SUM(fdp.cantidad) as unidades_totales,
    AVG(fdp.subtotal) as gasto_promedio_por_compra,
    SUM(fdp.subtotal) as gasto_total_producto,

    MIN(fdp.fecha_creacion) as primera_compra,
    MAX(fdp.fecha_creacion) as ultima_compra,

    RANK() OVER (PARTITION BY fdp.id_usuario ORDER BY COUNT(*) DESC) as ranking_preferencia_usuario

FROM fact_detalle_pedidos fdp
JOIN dim_productos dp ON fdp.id_producto = dp.producto_id
JOIN dim_categorias dc ON fdp.categoria_id = dc.categoria_id
GROUP BY fdp.id_usuario, dp.producto_id, dp.nombre, dc.nombre_categoria;
