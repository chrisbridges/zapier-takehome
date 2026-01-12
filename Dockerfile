FROM node:18-bullseye-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.test.json ./
COPY src ./src

RUN npm run build
RUN npm prune --omit=dev

FROM node:18-bullseye-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/app/data/usage.sqlite

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

RUN mkdir -p /app/data

EXPOSE 3000
CMD ["node", "dist/api/server.js"]
