FROM node:22.18

LABEL maintainer="rosen-bridge team <team@rosen.tech>"
LABEL description="Docker image for the guard-service owned by rosen-bridge organization."
LABEL org.label-schema.vcs-url="https://github.com/rosen-bridge/guard-service"

RUN adduser --disabled-password --home /app --uid 8080 --gecos "ErgoPlatform" ergo && \
    install -m 0740 -o ergo -g ergo -d /app/peer-dialer /app/logs /app/tss-api/logs /app/tss-api/home \
    && chown -R ergo:ergo /app/ && umask 0077
USER ergo

WORKDIR /app
COPY --chmod=700 --chown=ergo:ergo package*.json ./
ADD --chmod=700 --chown=ergo:ergo ./patches/ ./patches/
RUN npm ci
COPY --chmod=700 --chown=ergo:ergo . .

ENV NODE_ENV=production
ENV SERVICE_PORT=8080
ENV TSS_HOME_ADDRESS="/app/tss-api/home"
ENV TSS_LOG_ADDRESS="/app/tss-api/logs"

EXPOSE 8080

ENTRYPOINT ["npm", "run", "start"]
