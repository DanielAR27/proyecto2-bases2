// Obtener el repartidor asignado a un pedido, el usuario 
// al que le pertenece el pedido y los 5 repartidores 
// más cercanos al restaurante.

MATCH (p:Pedido {id_pedido: 11})
OPTIONAL MATCH (p)-[:ASIGNADO]->(dAsignado:Repartidor)
OPTIONAL MATCH (p)-[:PERTENECE]->(u:Usuario)
OPTIONAL MATCH (p)-[:PROVIENE]->(r:Restaurante)

// Obtener top 5 repartidores más cercanos al restaurante
WITH p, dAsignado, u, r
MATCH (r)-[dist:DISTANCIA]->(d:Repartidor)
WITH p, dAsignado, u, r, d, dist
ORDER BY dist.kilometros ASC
LIMIT 5

RETURN p, dAsignado, u, r, d, dist


// Ver todos los nodos y todas las relaciones
MATCH (n)-[r]->(m)
RETURN n, r, m
