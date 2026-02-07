# Harvard Plate Backend

## Базовый URL

- Продакшен: `https://api.harvard-plate.com`
- Локально: `http://localhost:3001`

## Аутентификация (Telegram Mini Apps)

**Заголовок**
```
X-Telegram-Init-Data: <raw initData>
```

`initData` должен передаваться на каждом запросе. Сервер проверяет подпись и `auth_date`.

## Идентификаторы пользователей

`userId` в API = **telegram_id** пользователя (BIGINT).

## Эндпоинты

### Рецепты

**Генерация рецепта**
```
POST /api/recipes/generate
```

Пример тела запроса:
```json
{
  "ingredients": [
    {
      "name": "Помидор",
      "category": "vegetable"
    }
  ],
  "userPrompt": "Сделай салат",
  "dietaryPreferences": ["вегетарианское"],
  "cookingTime": 30
}
```

**История рецептов**
```
GET /api/recipes/history/:userId?limit=20&page=1
```

### Пользователи

**Создать/получить пользователя из Telegram**
```
POST /api/users
```

**Получение информации**
```
GET /api/users/:userId
```

**Получение ингредиентов**
```
GET /api/users/:userId/ingredients
```

**Добавление ингредиента**
```
POST /api/users/:userId/ingredients
{
  "name": "Брокколи",
  "category": "vegetable"
}
```

### Тарелки

**Сохранение тарелки**
```
POST /api/plates
{
  "ingredients": [...],
  "name": "Моя тарелка"
}
```

**Получение сохраненных тарелок**
```
GET /api/plates/:userId
```

## Docker и миграции

```
docker compose up -d
npm run db:migrate
npm run db:seed
```

## Коды ошибок

| Код | Описание |
| --- | --- |
| 400 | Неверный запрос |
| 401 | Требуется аутентификация |
| 403 | Нет доступа |
| 404 | Ресурс не найден |
| 429 | Слишком много запросов |
| 500 | Внутренняя ошибка сервера |
| 503 | Сервис AI недоступен |

## Скрипты

```
npm run dev
npm run build
npm run start
npm run test
```
