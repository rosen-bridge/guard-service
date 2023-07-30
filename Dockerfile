FROM node:18.12

LABEL maintainer="ArsalanYavari <arya48.yavari79@gmail.com>"
LABEL description="Docker image for the TS-Guard service, owned by Rosenbridge organization. This image is designed to work seamlessly with the TSS-API service, automatically included during the build process. Intended to be used in conjunction with the project's docker-compose setup for easy deployment and scaling."
LABEL org.label-schema.vcs-url="https://github.com/rosen-bridge/ts-guard-service"

WORKDIR /app
RUN adduser --disabled-password --home /app --uid 9052 --gecos "ErgoPlatform" ergo && \
    install -m 0740 -o ergo -g ergo -d /app/peer-dialer /app/logs /app/tss-api/logs /app/tss-api/home \
    && chown -R ergo:ergo /app/
USER ergo
RUN umask 0077

COPY --chmod=700 --chown=ergo:ergo package*.json ./
RUN npm ci
COPY --chmod=700 --chown=ergo:ergo . .

ENV NODE_ENV=production
EXPOSE 9000

ENTRYPOINT ["npm", "run", "start"]
