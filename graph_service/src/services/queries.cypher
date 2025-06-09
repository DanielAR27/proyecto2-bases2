// Obtener el repartidor asignado a un pedido, el usuario 
// al que le pertenece el pedido y los 5 repartidores 
// más cercanos al restaurante.

MATCH (p:Pedido {id_pedido: 11, source_db: "mongo"})
OPTIONAL MATCH (p)-[:ASIGNADO]->(dAsignado:Repartidor {source_db: "mongo"})
OPTIONAL MATCH (p)-[:PERTENECE]->(u:Usuario {source_db: "mongo"})
OPTIONAL MATCH (p)-[:PROVIENE]->(r:Restaurante {source_db: "mongo"})

// Obtener top 5 repartidores más cercanos al restaurante
WITH p, dAsignado, u, r
MATCH (r)-[dist:DISTANCIA]->(d:Repartidor {source_db: "mongo"})
WHERE dist.source_db = "mongo"
WITH p, dAsignado, u, r, d, dist
ORDER BY dist.kilometros ASC
LIMIT 5

RETURN p, dAsignado, u, r, d, dist

// Ver para mongo, productos con su frecuencia, el top 10.
MATCH (p1:Producto {source_db: "mongo"})<-[:CONTIENE]-(ped:Pedido {source_db: "mongo"})-[:CONTIENE]->(p2:Producto {source_db: "mongo"})
WHERE p1.id_producto <> p2.id_producto AND id(p1) < id(p2)
WITH p1, p2, COUNT(DISTINCT ped) AS frecuencia
WHERE frecuencia >= 1  // Empezar con 1 para ver si hay datos
RETURN p1.nombre, p2.nombre, frecuencia
ORDER BY frecuencia DESC
LIMIT 10;

// Ver el pedido según el id, el restaurante al que pertenece, el 
// conductor asignado, el usuario del pedido y los productos.
MATCH (pedido:Pedido {id_pedido: $id_pedido, source_db: $source_db})
OPTIONAL MATCH (pedido)-[:PROVIENE]->(restaurante:Restaurante)
OPTIONAL MATCH (pedido)-[:PERTENECE]->(usuario:Usuario)
OPTIONAL MATCH (pedido)-[:ASIGNADO]->(repartidor:Repartidor)
OPTIONAL MATCH (pedido)-[:CONTIENE]->(productos:Producto)
RETURN pedido, restaurante, usuario, repartidor, productos

// Ver todos los nodos y todas las relaciones
MATCH (n)-[r]->(m)
RETURN n, r, m
