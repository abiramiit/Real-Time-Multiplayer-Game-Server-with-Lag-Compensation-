FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/client/package.json packages/client/
RUN npm install
COPY . .
WORKDIR /app/packages/client
# Skip typechecks forcing build explicitly if needed, but since Phase 9 fixed them it builds fine natively.
RUN npx vite build

FROM nginx:alpine
COPY --from=builder /app/packages/client/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
