FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
RUN npm install
COPY . .
WORKDIR /app/packages/server
# The codebase runs directly using ts-node or compiled JS. Wait, to be production-ready we compile TS:
RUN npx tsc -b
WORKDIR /app/packages/shared
RUN npx tsc -b || true

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app /app
WORKDIR /app/packages/server
CMD ["npx", "tsx", "src/index.ts"]
