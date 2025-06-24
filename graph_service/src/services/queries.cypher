// 1. Top 5 productos más comprados juntos (co-purchases)
// Esta consulta encuentra los pares de productos que más frecuentemente aparecen en los mismos pedidos

MATCH (p1:Producto)-[:COMPRADO_CON]->(p2:Producto)
WHERE p1.source_db = 'default' AND p2.source_db = 'default' 
  AND p1.id_producto < p2.id_producto
RETURN p1.nombre AS producto1,
       p2.nombre AS producto2,
       p1.categoria AS categoria1,
       p2.categoria AS categoria2,
       avg(p1.precio + p2.precio) AS precio_promedio_combo
ORDER BY precio_promedio_combo DESC
LIMIT 5;

// 2. Usuarios más influyentes por zona geográfica con métricas de referidos
// Identifica usuarios que más refieren a otros, agrupados por proximidad geográfica

MATCH (referente:Usuario)-[:REFIERE]->(referido:Usuario)
WHERE referente.source_db = 'postgres' AND referido.source_db = 'postgres'
WITH referente, 
     count(referido) AS total_referidos,
     round(referente.latitud, 1) AS zona_lat,
     round(referente.longitud, 1) AS zona_lng
WHERE total_referidos >= 1
RETURN referente.nombre AS usuario_influyente,
       referente.id_usuario AS id_usuario,
       total_referidos,
       zona_lat,
       zona_lng,
       point({latitude: referente.latitud, longitude: referente.longitud}) AS ubicacion
ORDER BY total_referidos DESC, zona_lat, zona_lng
LIMIT 10;

// 3. Obtener top 5 repartidores más cercanos al restaurante

MATCH (r:Restaurante {source_db: 'postgres'})-[dist:DISTANCIA]->(d:Repartidor {source_db: 'postgres'})
WHERE r.id_restaurante = 34  // Cambia este ID por el restaurante que necesites
RETURN r.nombre AS restaurante,
       d.id_repartidor AS id_repartidor,
       d.nombre AS repartidor,
       d.latitud_actual AS repartidor_lat,
       d.longitud_actual AS repartidor_lng,
       dist.kilometros AS distancia_km,
       dist.calculado_en AS fecha_calculo
ORDER BY dist.kilometros ASC
LIMIT 5;

// 4. VISUALIZACIÓN DE NODOS Y RELACIONES: Red de entrega completa (PostgreSQL)
// Muestra restaurante, repartidor asignado y usuario final con sus relaciones

MATCH (r:Restaurante {source_db: 'postgres'})<-[proviene:PROVIENE]-(p:Pedido {source_db: 'postgres'})-[asignado:ASIGNADO]->(d:Repartidor {source_db: 'postgres'})
MATCH (p)-[pertenece:PERTENECE]->(u:Usuario {source_db: 'postgres'})
RETURN r, proviene, p, asignado, d, pertenece, u
LIMIT 15;

// 5. Red de co-purchases - VISUALIZACIÓN DE PRODUCTOS QUE SE COMPRAN JUNTOS
// Muestra los productos conectados por relaciones COMPRADO_CON
MATCH (p1:Producto {source_db: 'postgres'})-[comprado:COMPRADO_CON]->(p2:Producto {source_db: 'postgres'})
WHERE comprado.frecuencia >= 2  // Solo productos comprados juntos al menos 2 veces
RETURN p1, comprado, p2
LIMIT 20;

// 6. Red de referidos - VISUALIZACIÓN DE INFLUENCERS
// Muestra la cadena de referencias entre usuarios
MATCH (referente:Usuario {source_db: 'postgres'})-[refiere:REFIERE]->(referido:Usuario {source_db: 'postgres'})
RETURN referente, refiere, referido
LIMIT 25;

// 7. Subgrafo de un restaurante específico - ANÁLISIS COMPLETO (id_restaurante = 34)
// Muestra todo el ecosistema de un restaurante: pedidos, productos, usuarios, repartidores
MATCH (r:Restaurante {source_db: 'postgres', id_restaurante: 34})
OPTIONAL MATCH (r)<-[proviene:PROVIENE]-(p:Pedido {source_db: 'postgres'})
OPTIONAL MATCH (p)-[contiene:CONTIENE]->(prod:Producto {source_db: 'postgres'})
OPTIONAL MATCH (p)-[pertenece:PERTENECE]->(u:Usuario {source_db: 'postgres'})
OPTIONAL MATCH (p)-[asignado:ASIGNADO]->(d:Repartidor {source_db: 'postgres'})
RETURN r, proviene, p, contiene, prod, pertenece, u, asignado, d
LIMIT 20;

// Ver todos los nodos y todas las relaciones

MATCH (n)-[r]->(m)
RETURN n, r, m
