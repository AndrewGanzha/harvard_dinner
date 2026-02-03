FROM node:18-alpine AS builder

WORKDIR /app

# Копируем файлы зависимостей
COPY package*.json ./
COPY tsconfig.json ./

# Устанавливаем зависимости
RUN npm ci --only=production && npm cache clean --force

# Копируем исходный код
COPY src ./src

# Собираем проект
RUN npm run build

# Production образ
FROM node:18-alpine

WORKDIR /app

# Устанавливаем зависимости только для работы
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Копируем собранный код из builder
COPY --from=builder /app/dist ./dist

# Создаем пользователя без привилегий
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

# Порт приложения
EXPOSE 3001

# Запуск приложения
CMD ["node", "dist/app.js"]
