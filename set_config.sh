docker-compose up -d

./init_cluster.sh

./init_hive_warehouse.sh

docker-compose --profile backend up --build -d

# Insertar pruebas en mongo y postgres

# docker-compose --profile etl up --build -d

# Esperar un poco

# docker-compose --profile airflow up --build -d

# docker-compose --profile analytics up --build -d

# docker exec -it hive-server2 bash
# beeline -u jdbc:hive2://localhost:10000

# docker exec -it airflow_scheduler bash