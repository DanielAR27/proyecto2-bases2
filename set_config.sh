docker-compose up -d

./init_cluster.sh

docker-compose --profile backend up --build -d

# docker compose --profile test build api_test && docker compose --profile test run --rm api_test