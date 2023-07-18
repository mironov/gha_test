# syntax=docker.io/docker/dockerfile:1.3.0

ARG DOCKER_BASE
FROM ${DOCKER_BASE} as rc

# Working Directory
RUN mkdir -p /app
RUN echo 123

ARG RC_IMAGE=rc
FROM ${RC_IMAGE} as release

ARG APP_VERSION
ENV APP_VERSION=$APP_VERSION

# TODO: update version file

ADD version.yaml /app
