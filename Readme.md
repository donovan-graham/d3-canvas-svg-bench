docker-compose build --pull --no-cache --force-rm graph
docker-compose run graph yarn install
docker-compose up graph


ab -n 1000 -c 2 http://localhost:3000/canvas
ab -n 1000 -c 2 http://localhost:3000/svg
