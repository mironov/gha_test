# syntax=docker.io/docker/dockerfile:1.3.0

ARG DOCKER_BASE

FROM ${DOCKER_BASE} as rc

# Working Directory
RUN mkdir -p /app
RUN sleep 60

FROM rc as release

ARG APP_VERSION
ENV APP_VERSION=$APP_VERSION

ADD version.yaml /app
