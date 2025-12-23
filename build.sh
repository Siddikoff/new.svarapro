#!/bin/bash
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

docker pull node:20.17.0-alpine

docker-compose build --parallel --progress=plain
