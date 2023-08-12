FROM node:18.12

LABEL maintainer="rosen-bridge team <team@rosen.tech>"
LABEL description="Docker image for the ts-guard-service owned by rosen-bridge organization."
LABEL org.label-schema.vcs-url="https://github.com/rosen-bridge/ts-guard-service"

WORKDIR /app
RUN adduser --disabled-password --home /app --uid 9000 --gecos "ErgoPlatform" ergo && \
    install -m 0740 -o ergo -g ergo -d /app/peer-dialer /app/logs /app/tss-api/logs /app/tss-api/home \
    && chown -R ergo:ergo /app/ && umask 0077
USER ergo

COPY --chmod=700 --chown=ergo:ergo package*.json patches/ ./
RUN npm ci && npm run postinstall
COPY --chmod=700 --chown=ergo:ergo . .

ENV NODE_ENV=production
EXPOSE 9000

ENTRYPOINT ["npm", "run", "start"]
