FROM node:18.12

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

RUN groupadd -r ergo && useradd -r -g ergo ergo \
    && chown -R ergo:ergo /app \
    && find /app -type d -exec chmod 700 {} + \
    && find /app -type f -exec chmod 600 {} +
USER ergo
RUN umask 0077

ENTRYPOINT ["npm", "run", "start"]
