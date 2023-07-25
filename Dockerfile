FROM node:18.12

WORKDIR /app
RUN groupadd -r ergo && useradd -r -g ergo ergo \
    && chown -R ergo:ergo /app \
    && chmod -R 700 /app
USER ergo
RUN umask 0077

COPY package*.json ./
RUN npm ci
COPY . .
ENV NODE_ENV=production
EXPOSE 9000

ENTRYPOINT ["npm", "run", "start"]
