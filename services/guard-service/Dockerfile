FROM node:22.18
ARG SERVICE_DIR=/app/services/guard-service

LABEL maintainer="rosen-bridge team <team@rosen.tech>"
LABEL description="Docker image for the guard-service owned by rosen-bridge organization."
LABEL org.label-schema.vcs-url="https://github.com/rosen-bridge/guard-service"

RUN adduser --disabled-password --home /app --uid 8080 --gecos "ErgoPlatform" ergo && \
    install -m 0740 -o ergo -g ergo -d ${SERVICE_DIR}/peer-dialer ${SERVICE_DIR}/logs ${SERVICE_DIR}/tss-api/logs ${SERVICE_DIR}/tss-api/home \
    && chown -R ergo:ergo /app/ && umask 0077
USER ergo

WORKDIR /app
COPY --chmod=700 --chown=ergo:ergo . .
RUN npm ci
RUN npm run build
WORKDIR ${SERVICE_DIR}

ENV NODE_ENV=production
ENV SERVICE_PORT=8080
ENV P2P_PORT=5243
ENV TSS_HOME_ADDRESS="${SERVICE_DIR}/tss-api/home"
ENV TSS_LOG_ADDRESS="${SERVICE_DIR}/tss-api/logs"

EXPOSE 8080
EXPOSE 5243

ENTRYPOINT ["npm", "run", "start"]
