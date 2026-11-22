FROM node:24-bookworm-slim
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile
COPY --chown=node:node . .
RUN mkdir -p /app/data && chown node:node /app/data
USER node
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4317 DATABASE_PATH=/app/data/atlas.sqlite
EXPOSE 4317
VOLUME ["/app/data"]
CMD ["node", "server/start.js"]
