docker-compose up -d

./init_cluster.sh

docker-compose --profile backend up --build -d



# docker-compose --profile analytics up --build -d

# docker compose --profile test build api_test && docker compose --profile test run --rm api_test

#docker exec -it hive-server bash
#beeline -u "jdbc:hive2://localhost:10000/default;auth=noSasl"
