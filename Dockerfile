FROM node:18-alpine AS base

WORKDIR /app

COPY package*.json ./
RUN npm install && npm cache clean --force

FROM base AS builder

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:18-alpine AS production

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3001

CMD ["node", "dist/app.js"]
