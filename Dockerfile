FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NODE_OPTIONS=--max-old-space-size=384
COPY package.json package-lock.json ./
RUN npm ci --include=dev
COPY tsconfig.json vite.config.ts index.html ./
COPY src ./src
COPY public ./public
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim
ARG SOURCE_REVISION=unknown
LABEL org.opencontainers.image.revision=$SOURCE_REVISION
RUN apt-get update && apt-get install -y --no-install-recommends fontconfig fonts-dejavu-core && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4310 NODE_OPTIONS=--max-old-space-size=192
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY src ./src
COPY migrations ./migrations
COPY docs/privacy.md ./docs/privacy.md
USER node
EXPOSE 4310
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s CMD node -e "fetch('http://127.0.0.1:4310/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "--import", "tsx", "src/server/index.ts"]
