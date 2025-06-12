#!/bin/bash

SQL_FILE="hive_warehouse_init.sql"
CONTAINER_NAME="mini-hive"
CONTAINER_PATH="/tmp/$SQL_FILE"

# Copiar archivo SQL al contenedor
docker cp "$SQL_FILE" "$CONTAINER_NAME:$CONTAINER_PATH"

# Esperar que Hive esté disponible
echo "Esperando que Hive responda..."

until docker exec "$CONTAINER_NAME" beeline -u jdbc:hive2://localhost:10000/default -n hive -p hive -e "SELECT 1;" >/dev/null 2>&1; do
  sleep 5
done

echo "Hive disponible. Ejecutando SQL..."

# Opción 2: Usar cat para leer el archivo dentro del contenedor y pasarlo a beeline
docker exec "$CONTAINER_NAME" bash -c "cat $CONTAINER_PATH | beeline -u jdbc:hive2://localhost:10000/default -n hive -p hive --hiveconf hive.cli.print.header=false --silent=true"

echo "Schema inicializado correctamente."