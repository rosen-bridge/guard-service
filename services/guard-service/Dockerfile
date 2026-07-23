# syntax=docker/dockerfile:1

FROM node:22.18-bookworm-slim AS builder

WORKDIR /app
RUN --mount=type=cache,target=/root/.npm \
    --mount=type=cache,target=/tmp/node-compile-cache \
    npm i -g npm@11.6.2 && \
    apt-get update && \
    apt-get install -y --no-install-recommends python3 build-essential

COPY --parents \
    package.json \
    package-lock.json \
    .npmrc \
    .nvmrc \
    patches \
    packages/**/package.json \
    services/**/package.json \
    ./
RUN --mount=type=cache,target=/root/.npm \
    --mount=type=cache,target=/root/.cache \
    --mount=type=cache,target=/tmp/node-compile-cache \
    npm ci
COPY --parents tsconfig*.json packages ./
RUN npm run build

RUN mkdir -p /tmp/artifacts && \
    find /app/packages -type d -name dist -not -path '*/node_modules/*' \
    -exec cp -a --parents {} /tmp/artifacts \;

FROM node:22.18-bookworm-slim AS prod
ARG SERVICE_DIR=/app/services/guard-service

LABEL maintainer="rosen-bridge team <team@rosen.tech>"
LABEL description="Docker image for the guard-service owned by rosen-bridge organization."
LABEL org.label-schema.vcs-url="https://github.com/rosen-bridge/guard-service"

RUN --mount=type=cache,target=/root/.npm \
    --mount=type=cache,target=/tmp/node-compile-cache \
    npm i -g npm@11.6.2 && \
    adduser --disabled-password --home /app --no-create-home --uid 8080 --gecos "ErgoPlatform" ergo && \
    install -m 0740 -o ergo -g ergo -d ${SERVICE_DIR}/peer-dialer ${SERVICE_DIR}/logs ${SERVICE_DIR}/tss-api/logs ${SERVICE_DIR}/tss-api/home && \
    umask 0077 && \
    apt-get update && \
    apt-get install -y --no-install-recommends python3 build-essential curl && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --parents \
    package.json \
    package-lock.json \
    .npmrc \
    .nvmrc \
    patches \
    packages/**/package.json \
    services/**/package.json \
    ./
ENV NODE_ENV=production
RUN --mount=type=cache,target=/root/.npm \
    --mount=type=cache,target=/root/.cache \
    --mount=type=cache,target=/tmp/node-compile-cache \
    npm ci && chown -R ergo:ergo /app/
COPY --chmod=700 --chown=ergo:ergo . .
COPY --from=builder --chown=ergo:ergo /tmp/artifacts/app/ /app/
WORKDIR ${SERVICE_DIR}

USER ergo
ENV SERVICE_PORT=8080
ENV P2P_PORT=5243
ENV TSS_HOME_ADDRESS="${SERVICE_DIR}/tss-api/home"
ENV TSS_LOG_ADDRESS="${SERVICE_DIR}/tss-api/logs"

EXPOSE 8080
EXPOSE 5243

ENTRYPOINT ["npm", "run", "start"]
