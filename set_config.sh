docker-compose up -d

./init_cluster.sh

docker-compose --profile backend up --build -d