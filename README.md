# Harvard Plate Backend

## Базовый URL

- Продакшен: `https://api.harvard-plate.com`
- Локально: `http://localhost:3001`

## Аутентификация

**Login**
```
POST /api/auth/login
{
  "telegram_id": 123456789,
  "username": "john_doe"
}
```

**Использование токена**
```
Authorization: Bearer <ваш_токен>
```

## Эндпоинты

### Рецепты

**Генерация рецепта**
```
POST /api/recipes/generate
```

Пример тела запроса:
```json
{
  "userId": "uuid-пользователя",
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
  "userId": "uuid",
  "ingredients": [...],
  "name": "Моя тарелка"
}
```

**Получение сохраненных тарелок**
```
GET /api/plates/:userId
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
