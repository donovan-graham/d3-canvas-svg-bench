FROM node:7-slim

RUN apt-get update && apt-get install -y \
  libcairo2-dev \
  libjpeg62-turbo-dev \
  libpango1.0-dev \
  libgif-dev \
  build-essential \
  g++

VOLUME /data
WORKDIR /data

EXPOSE 3000
