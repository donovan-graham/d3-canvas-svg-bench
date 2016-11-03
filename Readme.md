# Setup
Build the docker image and install the necessary dependencies
```sh
docker-compose build --pull --no-cache --force-rm graph
docker-compose run graph npm install
```

# Starting the service (development mode)
Use docker compose to start the service on port 3000
```sh
$ docker-compose up graph
```

# Benchmark the service (production mode)
```sh
$ docker-compose up graph-prod
$ ab -l -k -H "Accept-Encoding: gzip, deflate" -p $(pwd)/src/debugData.json -T application/json -c 4 -n 1000 http://localhost:3000/chart
```
