#!/bin/bash
set -e

echo "Esperando 20 segundos a que los contenedores de Mongo levanten..."
sleep 20

echo "Inicializando Config Replica Set..."
docker exec mongocfg1 mongosh --eval '
rs.initiate({
  _id: "configReplSet",
  configsvr: true,
  members: [
    { _id: 0, host: "mongocfg1:27017" },
    { _id: 1, host: "mongocfg2:27017" },
    { _id: 2, host: "mongocfg3:27017" }
  ]
})
'

echo "Esperando 10 segundos para la propagación del Config Replica Set..."
sleep 10

echo "Inicializando primer Shard Replica Set..."
docker exec mongors1n1 mongosh --eval '
rs.initiate({
  _id: "shard1ReplSet",
  members: [
    { _id: 0, host: "mongors1n1:27017" },
    { _id: 1, host: "mongors1n2:27017" },
    { _id: 2, host: "mongors1n3:27017" }
  ]
})
'

echo "Esperando 10 segundos para la propagación del Shard Replica Set..."
sleep 10

echo "Agregando el primer Shard al cluster..."
docker exec mongos1 mongosh --eval '
sh.addShard("shard1ReplSet/mongors1n1:27017,mongors1n2:27017,mongors1n3:27017")
'

echo "Inicializando segundo Shard Replica Set..."
docker exec mongors2n1 mongosh --eval '
rs.initiate({
  _id: "shard2ReplSet",
  members: [
    { _id: 0, host: "mongors2n1:27017" },
    { _id: 1, host: "mongors2n2:27017" },
    { _id: 2, host: "mongors2n3:27017" }
  ]
})
'

echo "Esperando 10 segundos para la propagación del segundo Shard Replica Set..."
sleep 10

echo "Agregando el segundo Shard al cluster..."
docker exec mongos1 mongosh --eval '
sh.addShard("shard2ReplSet/mongors2n1:27017,mongors2n2:27017,mongors2n3:27017")
'

echo "Esperando 5 segundos antes de habilitar sharding..."
sleep 5

echo "Habilitando sharding en apidb..."
docker exec mongos1 mongosh --eval 'sh.enableSharding("apidb")'

echo "Configurando colección usuarios..."
docker exec mongos1 mongosh --eval '
db = db.getSiblingDB("apidb");
db.createCollection("usuarios");
db.usuarios.createIndex({ id_usuario: 1 });
sh.shardCollection("apidb.usuarios", { id_usuario: "hashed" });
'

echo "Configurando colección restaurantes..."
docker exec mongos1 mongosh --eval '
db = db.getSiblingDB("apidb");
db.createCollection("restaurantes");
db.restaurantes.createIndex({ id_restaurante: 1 });
sh.shardCollection("apidb.restaurantes", { id_restaurante: "hashed" });
'

echo "Configurando colección menus..."
docker exec mongos1 mongosh --eval '
db = db.getSiblingDB("apidb");
db.createCollection("menus");
db.menus.createIndex({ id_menu: 1 });
sh.shardCollection("apidb.menus", { id_menu: "hashed" });
'

echo "Configurando colección productos..."
docker exec mongos1 mongosh --eval '
db = db.getSiblingDB("apidb");
db.createCollection("productos");
db.productos.createIndex({ id_producto: 1 });
sh.shardCollection("apidb.productos", { id_producto: "hashed" });
'

echo "Configurando colección reservas..."
docker exec mongos1 mongosh --eval '
db = db.getSiblingDB("apidb");
db.createCollection("reservas");
db.reservas.createIndex({ id_reserva: 1 });
sh.shardCollection("apidb.reservas", { id_reserva: "hashed" });
'

echo "Configurando colección pedidos..."
docker exec mongos1 mongosh --eval '
db = db.getSiblingDB("apidb");
db.createCollection("pedidos");
db.pedidos.createIndex({ id_pedido: 1 });
sh.shardCollection("apidb.pedidos", { id_pedido: "hashed" });
'

echo "Creando colección de counters para IDs secuenciales..."
docker exec mongos1 mongosh --eval '
db = db.getSiblingDB("apidb");
db.createCollection("counters");
db.counters.insertMany([
  { _id: "usuarios", seq: 0 },
  { _id: "restaurantes", seq: 0 },
  { _id: "menus", seq: 0 },
  { _id: "productos", seq: 0 },
  { _id: "reservas", seq: 0 },
  { _id: "pedidos", seq: 0 }
]);
'

echo "Precargando metadata en mongos2 y mongos3..."
docker exec mongos2 mongosh --eval 'sh.status()'
docker exec mongos3 mongosh --eval 'sh.status()'

echo "Cluster MongoDB inicializado correctamente."
