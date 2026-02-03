# 📋 Техническое задание для бэкенда (Harvard Plate)

## 🎯 Цели проекта

Создать Node.js бэкенд-сервис с интеграцией GigaChat API для генерации рецептов по принципам "Гарвардской тарелки" (здорового питания), с хранением данных пользователей в Supabase.

## 🏗️ Архитектура

### Технологический стек

- **Runtime**: Node.js 18+
- **Фреймворк**: Express.js
- **Язык**: TypeScript
- **База данных**: Supabase (PostgreSQL)
- **AI-интеграция**: GigaChat API (официальный SDK)
- **Аутентификация**: Supabase Auth + JWT
- **Контейнеризация**: Docker
- **Деплой**: Railway / Render

### Структура проекта

```
backend/
├── src/
│   ├── controllers/          # Контроллеры
│   │   ├── user.controller.ts
│   │   ├── recipe.controller.ts
│   │   └── plate.controller.ts
│   ├── services/            # Бизнес-логика
│   │   ├── gigachat/
│   │   │   ├── gigachat.service.ts    # Основной сервис GigaChat
│   │   │   ├── prompt.service.ts      # Генерация промптов
│   │   │   └── parsers/              # Парсеры ответов AI
│   │   ├── supabase/
│   │   │   ├── supabase.service.ts    # Основной сервис Supabase
│   │   │   ├── auth.service.ts        # Аутентификация
│   │   │   └── migrations/           # Миграции БД
│   │   └── validation.service.ts
│   ├── middleware/          # Промежуточное ПО
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   ├── validation.middleware.ts
│   │   └── rate-limit.middleware.ts
│   ├── routes/             # Маршруты API
│   │   ├── user.routes.ts
│   │   ├── recipe.routes.ts
│   │   ├── plate.routes.ts
│   │   └── health.routes.ts
│   ├── utils/              # Утилиты
│   │   ├── logger.ts
│   │   ├── helpers.ts
│   │   ├── validators.ts
│   │   └── constants.ts
│   ├── types/              # Типы TypeScript
│   │   ├── gigachat.types.ts
│   │   ├── supabase.types.ts
│   │   └── api.types.ts
│   └── app.ts              # Основной файл приложения
├── tests/                  # Тесты
├── scripts/               # Скрипты
├── docker/                # Docker файлы
├── .env                   # Переменные окружения
├── .env.example          # Шаблон .env
├── package.json
├── tsconfig.json
├── Dockerfile
└── README.md
```

## 📋 Этапы разработки

### Этап 1: Базовая настройка (1-2 дня)

#### Задача 1.2: Конфигурация TypeScript

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@services/*": ["src/services/*"],
      "@controllers/*": ["src/controllers/*"],
      "@middleware/*": ["src/middleware/*"],
      "@utils/*": ["src/utils/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

#### Задача 1.3: Настройка окружения

```env
# .env.example
# ============ СЕРВЕР ============
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# ============ GIGACHAT API ============
GIGACHAT_CREDENTIALS=your_authorization_key_here
GIGACHAT_MODEL=GigaChat  # или GigaChat-Pro
GIGACHAT_SCOPE=GIGACHAT_API_PERS
GIGACHAT_API_URL=https://gigachat.devices.sberbank.ru/api/v1

# ============ SUPABASE ============
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret

# ============ RATE LIMITING ============
RATE_LIMIT_WINDOW_MS=900000  # 15 минут
RATE_LIMIT_MAX_REQUESTS=100

# ============ ЛОГИРОВАНИЕ ============
LOG_LEVEL=info
```

#### Задача 1.4: Базовая структура приложения

```typescript
// src/app.ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import compression from "compression";

// Импорт маршрутов
import userRoutes from "./routes/user.routes";
import recipeRoutes from "./routes/recipe.routes";
import plateRoutes from "./routes/plate.routes";
import healthRoutes from "./routes/health.routes";

// Импорт middleware
import { errorHandler } from "./middleware/error.middleware";
import { rateLimiter } from "./middleware/rate-limit.middleware";

// Загрузка переменных окружения
dotenv.config();

class App {
  public app: express.Application;
  public port: string | number;

  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3001;

    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // Безопасность
    this.app.use(helmet());
    this.app.use(compression());

    // CORS
    this.app.use(
      cors({
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
      }),
    );

    // Парсинг JSON
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true }));

    // Rate limiting
    this.app.use("/api/", rateLimiter);

    // Логирование запросов
    this.app.use((req, res, next) => {
      console.log(`${req.method} ${req.path}`);
      next();
    });
  }

  private initializeRoutes(): void {
    this.app.use("/api/users", userRoutes);
    this.app.use("/api/recipes", recipeRoutes);
    this.app.use("/api/plates", plateRoutes);
    this.app.use("/health", healthRoutes);

    // 404 handler
    this.app.use("*", (req, res) => {
      res.status(404).json({
        error: "Маршрут не найден",
        path: req.originalUrl,
      });
    });
  }

  private initializeErrorHandling(): void {
    this.app.use(errorHandler);
  }

  public listen(): void {
    this.app.listen(this.port, () => {
      console.log(`🚀 Сервер запущен на порту ${this.port}`);
      console.log(`🔗 URL: http://localhost:${this.port}`);
      console.log(`🌍 Режим: ${process.env.NODE_ENV}`);
    });
  }
}

export default App;
```

### Этап 2: Настройка Supabase (1-2 дня)

#### Задача 2.1: Создание проекта в Supabase

1. **Создайте аккаунт и проект** на [supabase.com](https://supabase.com)
2. **Запомните/сохраните**:
   - Project URL (`SUPABASE_URL`)
   - Project API Keys (Anon Public и Service Role)

````

#### Задача 2.3: Сервис работы с Supabase

```typescript
// src/services/supabase/supabase.service.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

// Типы данных (генерируются автоматически supabase)
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          telegram_id: number | null;
          username: string | null;
          email: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["users"]["Row"],
          "created_at" | "updated_at"
        >;
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
      };
      user_ingredients: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          category: "vegetable" | "grain" | "protein" | "fat";
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["user_ingredients"]["Row"],
          "id" | "created_at"
        >;
        Update: Partial<
          Database["public"]["Tables"]["user_ingredients"]["Insert"]
        >;
      };
      saved_plates: {
        Row: {
          id: string;
          user_id: string;
          name: string | null;
          ingredients: any[];
          recipe_data: any | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["saved_plates"]["Row"],
          "id" | "created_at"
        >;
        Update: Partial<Database["public"]["Tables"]["saved_plates"]["Insert"]>;
      };
      recipe_history: {
        Row: {
          id: string;
          user_id: string;
          request_data: any;
          response_data: any;
          gigachat_usage: any;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["recipe_history"]["Row"],
          "id" | "created_at"
        >;
        Update: Partial<
          Database["public"]["Tables"]["recipe_history"]["Insert"]
        >;
      };
    };
  };
}

export class SupabaseService {
  private static instance: SupabaseService;
  private client: SupabaseClient<Database>;

  private constructor() {
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        "Supabase credentials not found in environment variables",
      );
    }

    this.client = createClient<Database>(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  public static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService();
    }
    return SupabaseService.instance;
  }

  public getClient(): SupabaseClient<Database> {
    return this.client;
  }

  // ============ МЕТОДЫ ДЛЯ ПОЛЬЗОВАТЕЛЕЙ ============

  async createOrGetUser(telegramId: number, username?: string) {
    try {
      // Проверяем существующего пользователя
      const { data: existingUser, error: fetchError } = await this.client
        .from("users")
        .select("*")
        .eq("telegram_id", telegramId)
        .single();

      if (existingUser && !fetchError) {
        return { data: existingUser, isNew: false };
      }

      // Создаем нового пользователя
      const { data: newUser, error: createError } = await this.client
        .from("users")
        .insert({
          telegram_id: telegramId,
          username: username || `user_${telegramId}`,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        console.error("Error creating user:", createError);
        throw createError;
      }

      console.log(`✅ Created new user: ${telegramId}`);
      return { data: newUser, isNew: true };
    } catch (error) {
      console.error("❌ User creation error:", error);
      throw error;
    }
  }

  // ============ МЕТОДЫ ДЛЯ ИНГРЕДИЕНТОВ ============

  async getUserIngredients(userId: string): Promise<any[]> {
    try {
      const { data, error } = await this.client
        .from("user_ingredients")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("❌ Error fetching ingredients:", error);
      return [];
    }
  }

  async addUserIngredient(
    userId: string,
    name: string,
    category: "vegetable" | "grain" | "protein" | "fat",
  ): Promise<any | null> {
    try {
      const { data, error } = await this.client
        .from("user_ingredients")
        .upsert(
          {
            user_id: userId,
            name,
            category,
            created_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,name",
          },
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("❌ Error adding ingredient:", error);
      return null;
    }
  }

  async deleteUserIngredient(
    userId: string,
    ingredientId: string,
  ): Promise<boolean> {
    try {
      const { error } = await this.client
        .from("user_ingredients")
        .delete()
        .eq("id", ingredientId)
        .eq("user_id", userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("❌ Error deleting ingredient:", error);
      return false;
    }
  }

  // ============ МЕТОДЫ ДЛЯ ТАРЕЛОК ============

  async saveUserPlate(
    userId: string,
    ingredients: any[],
    name?: string,
    recipeData?: any,
  ): Promise<any | null> {
    try {
      const { data, error } = await this.client
        .from("saved_plates")
        .insert({
          user_id: userId,
          name: name || `Plate ${new Date().toLocaleDateString("ru-RU")}`,
          ingredients,
          recipe_data: recipeData || null,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("❌ Error saving plate:", error);
      return null;
    }
  }

  async getUserPlates(userId: string): Promise<any[]> {
    try {
      const { data, error } = await this.client
        .from("saved_plates")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("❌ Error fetching plates:", error);
      return [];
    }
  }

  async deleteUserPlate(userId: string, plateId: string): Promise<boolean> {
    try {
      const { error } = await this.client
        .from("saved_plates")
        .delete()
        .eq("id", plateId)
        .eq("user_id", userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("❌ Error deleting plate:", error);
      return false;
    }
  }

  // ============ МЕТОДЫ ДЛЯ ИСТОРИИ ============

  async logRecipeRequest(
    userId: string,
    requestData: any,
    responseData?: any,
    gigachatUsage?: any,
  ): Promise<void> {
    try {
      await this.client.from("recipe_history").insert({
        user_id: userId,
        request_data: requestData,
        response_data: responseData || null,
        gigachat_usage: gigachatUsage || null,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error("❌ Error logging recipe request:", error);
    }
  }

  async getUserRecipeHistory(userId: string, limit = 20): Promise<any[]> {
    try {
      const { data, error } = await this.client
        .from("recipe_history")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("❌ Error fetching recipe history:", error);
      return [];
    }
  }

  // ============ СТАТИСТИКА ============

  async getUserStats(userId: string) {
    try {
      const [ingredientsCount, platesCount, recipeRequestsCount] =
        await Promise.all([
          this.client
            .from("user_ingredients")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId),
          this.client
            .from("saved_plates")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId),
          this.client
            .from("recipe_history")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId),
        ]);

      return {
        ingredients: ingredientsCount.count || 0,
        plates: platesCount.count || 0,
        recipeRequests: recipeRequestsCount.count || 0,
      };
    } catch (error) {
      console.error("❌ Error fetching user stats:", error);
      return null;
    }
  }
}

export const supabaseService = SupabaseService.getInstance();
````

### Этап 3: Интеграция GigaChat API (1-2 дня)

#### Задача 3.1: Сервис GigaChat с официальным SDK

```typescript
// src/services/gigachat/gigachat.service.ts
import GigaChat from "gigachat";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";

dotenv.config();

// Типы
export interface GigaChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface RecipeGenerationRequest {
  userId: string;
  ingredients: Array<{
    name: string;
    category: "vegetable" | "grain" | "protein" | "fat";
  }>;
  userPrompt?: string;
  dietaryPreferences?: string[];
  cookingTime?: number; // в минутах
}

export interface RecipeResponse {
  id: string;
  title: string;
  description: string;
  cookingTime: number;
  difficulty: "easy" | "medium" | "hard";
  ingredients: {
    name: string;
    quantity: string;
    category: "vegetable" | "grain" | "protein" | "fat";
  }[];
  steps: string[];
  nutritionalInfo: {
    calories: number;
    proteins: number;
    carbs: number;
    fats: number;
    fiber: number;
  };
  plateAnalysis: string;
  tips: string[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  created?: number;
}

export class GigaChatService {
  private static instance: GigaChatService;
  private client: GigaChat;
  private model: string;

  private constructor() {
    const credentials = process.env.GIGACHAT_CREDENTIALS;
    this.model = process.env.GIGACHAT_MODEL || "GigaChat";

    if (!credentials) {
      throw new Error("GIGACHAT_CREDENTIALS не найден в переменных окружения");
    }

    this.client = new GigaChat({
      credentials,
      model: this.model,
    });
  }

  public static getInstance(): GigaChatService {
    if (!GigaChatService.instance) {
      GigaChatService.instance = new GigaChatService();
    }
    return GigaChatService.instance;
  }

  /**
   * Проверка доступности API
   */
  async checkAvailability(): Promise<boolean> {
    try {
      const response = await this.client.getModels();
      return Array.isArray(response.data) && response.data.length > 0;
    } catch (error) {
      console.error("❌ GigaChat API недоступен:", error);
      return false;
    }
  }

  /**
   * Основной метод генерации рецепта
   */
  async generateRecipe(
    request: RecipeGenerationRequest,
  ): Promise<RecipeResponse> {
    try {
      // Подготовка промпта
      const systemPrompt = this.createSystemPrompt();
      const userPrompt = this.createUserPrompt(request);

      const messages: GigaChatMessage[] = [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ];

      // Вызов API
      const response = await this.client.chat({
        messages,
        temperature: 0.7,
        repetition_penalty: 1.1,
        stream: false,
        max_tokens: 2000,
      });

      // Парсинг ответа
      const aiContent = response.choices[0]?.message?.content || "";
      const parsedRecipe = this.parseRecipeResponse(aiContent, request);

      // Формирование полного ответа
      const fullResponse: RecipeResponse = {
        id: response.id || uuidv4(),
        ...parsedRecipe,
        usage: response.usage,
        created: response.created || Date.now(),
      };

      return fullResponse;
    } catch (error) {
      console.error("❌ Ошибка генерации рецепта:", error);
      return this.getFallbackRecipe(request);
    }
  }

  /**
   * Создание системного промпта
   */
  private createSystemPrompt(): string {
    return `Ты — опытный диетолог и шеф-повар, следующий принципам "Гарвардской тарелки" здорового питания.

Твоя задача — создавать сбалансированные, полезные и вкусные рецепты, которые соответствуют следующим принципам:

1. ГАРВАРДСКАЯ ТАРЕЛКА (идеальные пропорции):
   - 50% тарелки: ОВОЩИ И ФРУКТЫ (разноцветные, свежие или приготовленные)
   - 25% тарелки: ЦЕЛЬНЫЕ ЗЕРНА (киноа, коричневый рис, гречка, овсянка)
   - 25% тарелки: БЕЛКИ (растительные или животные: бобовые, тофу, рыба, курица)
   - Полезные жиры в умеренном количестве (оливковое масло, авокадо, орехи)
   - Вода как основной напиток

2. ОСНОВНЫЕ ПРИНЦИПА:
   - Максимум свежих, минимально обработанных продуктов
   - Разнообразие цветов (каждый цвет = разные питательные вещества)
   - Баланс макронутриентов (белки, жиры, углеводы)
   - Умеренное использование соли и сахара
   - Приготовление с сохранением питательных веществ

3. ФОРМАТ ОТВЕТА (строго придерживайся структуры):
   НАЗВАНИЕ: [Креативное, аппетитное название рецепта]
   
   ОПИСАНИЕ: [Краткое описание блюда (2-3 предложения)]
   
   ВРЕМЯ ПРИГОТОВЛЕНИЯ: [Общее время в минутах]
   
   СЛОЖНОСТЬ: [easy/medium/hard]
   
   ИНГРЕДИЕНТЫ:
   • [Ингредиент 1] - [Количество] - [Категория: vegetable/grain/protein/fat]
   • [Ингредиент 2] - [Количество] - [Категория]
   ...
   
   ПИТАТЕЛЬНАЯ ЦЕННОСТЬ (на порцию):
   • Калории: [число] ккал
   • Белки: [число] г
   • Углеводы: [число] г
   • Жиры: [число] г
   • Клетчатка: [число] г
   
   ШАГИ ПРИГОТОВЛЕНИЯ:
   1. [Шаг 1]
   2. [Шаг 2]
   ...
   
   АНАЛИЗ ГАРВАРДСКОЙ ТАРЕЛКИ:
   [Подробное объяснение, как это блюдо соответствует принципам гарвардской тарелки]
   
   СОВЕТЫ И РЕКОМЕНДАЦИИ:
   • [Совет 1]
   • [Совет 2]
   
   Важно: Будь точным в количествах, реалистичным во времени приготовления и практичным в шагах.`;
  }

  /**
   * Создание пользовательского промпта
   */
  private createUserPrompt(request: RecipeGenerationRequest): string {
    const ingredientsList = request.ingredients
      .map((ing) => `• ${ing.name} (${this.translateCategory(ing.category)})`)
      .join("\n");

    const preferences = request.dietaryPreferences?.length
      ? `\nДиетические предпочтения: ${request.dietaryPreferences.join(", ")}`
      : "";

    const timeConstraint = request.cookingTime
      ? `\nЖелаемое время приготовления: не более ${request.cookingTime} минут`
      : "";

    return `Пожалуйста, создай рецепт на основе следующих ингредиентов:

Основные ингредиенты:
${ingredientsList}
${preferences}
${timeConstraint}
${request.userPrompt ? `\nДополнительные пожелания: ${request.userPrompt}` : ""}

Используй ВСЕ указанные ингредиенты. Можешь добавить базовые продукты (соль, перец, масло, вода), если это необходимо для рецепта.

Создай практичный, вкусный и полезный рецепт!`;
  }

  /**
   * Парсинг ответа AI
   */
  private parseRecipeResponse(
    aiText: string,
    request: RecipeGenerationRequest,
  ): Omit<RecipeResponse, "id" | "usage" | "created"> {
    // Реализация парсера (упрощенная версия)
    const lines = aiText.split("\n").filter((line) => line.trim());

    return {
      title:
        this.extractValue(lines, "НАЗВАНИЕ:") ||
        `Рецепт с ${request.ingredients[0]?.name}`,
      description:
        this.extractValue(lines, "ОПИСАНИЕ:") || "Вкусное и полезное блюдо",
      cookingTime: parseInt(
        this.extractValue(lines, "ВРЕМЯ ПРИГОТОВЛЕНИЯ:") || "30",
      ),
      difficulty:
        (this.extractValue(lines, "СЛОЖНОСТЬ:") as
          | "easy"
          | "medium"
          | "hard") || "medium",
      ingredients: this.parseIngredients(lines),
      steps: this.parseSteps(lines),
      nutritionalInfo: this.parseNutritionalInfo(lines),
      plateAnalysis: this.extractSection(lines, "АНАЛИЗ ГАРВАРДСКОЙ ТАРЕЛКИ:"),
      tips: this.parseList(lines, "СОВЕТЫ И РЕКОМЕНДАЦИИ:"),
    };
  }

  private extractValue(lines: string[], prefix: string): string {
    const line = lines.find((l) => l.startsWith(prefix));
    return line ? line.replace(prefix, "").trim() : "";
  }

  private extractSection(lines: string[], section: string): string {
    const startIndex = lines.findIndex((l) => l.includes(section));
    if (startIndex === -1) return "";

    const sectionLines = [];
    for (let i = startIndex + 1; i < lines.length; i++) {
      if (lines[i].trim() === "" || lines[i].match(/^[А-ЯA-Z ]+:/)) break;
      sectionLines.push(lines[i].trim());
    }

    return sectionLines.join("\n");
  }

  private parseIngredients(lines: string[]): RecipeResponse["ingredients"] {
    const startIndex = lines.findIndex((l) => l.includes("ИНГРЕДИЕНТЫ:"));
    if (startIndex === -1) return [];

    const ingredients: RecipeResponse["ingredients"] = [];
    for (let i = startIndex + 1; i < lines.length; i++) {
      if (lines[i].trim() === "" || !lines[i].includes("•")) break;

      const match = lines[i].match(/•\s*(.+?)\s*-\s*(.+?)\s*-\s*(.+)/);
      if (match) {
        const [, name, quantity, category] = match;
        ingredients.push({
          name: name.trim(),
          quantity: quantity.trim(),
          category: category.trim().toLowerCase() as any,
        });
      }
    }

    return ingredients;
  }

  private parseSteps(lines: string[]): string[] {
    const startIndex = lines.findIndex((l) =>
      l.includes("ШАГИ ПРИГОТОВЛЕНИЯ:"),
    );
    if (startIndex === -1) return [];

    const steps: string[] = [];
    for (let i = startIndex + 1; i < lines.length; i++) {
      if (lines[i].trim() === "" || lines[i].includes(":")) break;

      const step = lines[i].replace(/^\d+\.\s*/, "").trim();
      if (step) steps.push(step);
    }

    return steps;
  }

  private parseNutritionalInfo(
    lines: string[],
  ): RecipeResponse["nutritionalInfo"] {
    const defaultInfo = {
      calories: 350,
      proteins: 20,
      carbs: 40,
      fats: 15,
      fiber: 8,
    };

    const startIndex = lines.findIndex((l) =>
      l.includes("ПИТАТЕЛЬНАЯ ЦЕННОСТЬ"),
    );
    if (startIndex === -1) return defaultInfo;

    const info = { ...defaultInfo };

    for (let i = startIndex + 1; i < startIndex + 6; i++) {
      if (i >= lines.length || lines[i].trim() === "") break;

      const line = lines[i];
      if (line.includes("Калории:")) info.calories = this.extractNumber(line);
      if (line.includes("Белки:")) info.proteins = this.extractNumber(line);
      if (line.includes("Углеводы:")) info.carbs = this.extractNumber(line);
      if (line.includes("Жиры:")) info.fats = this.extractNumber(line);
      if (line.includes("Клетчатка:")) info.fiber = this.extractNumber(line);
    }

    return info;
  }

  private parseList(lines: string[], section: string): string[] {
    const startIndex = lines.findIndex((l) => l.includes(section));
    if (startIndex === -1) return [];

    const list: string[] = [];
    for (let i = startIndex + 1; i < lines.length; i++) {
      if (lines[i].trim() === "" || lines[i].includes(":")) break;
      if (lines[i].includes("•")) {
        list.push(lines[i].replace("•", "").trim());
      }
    }

    return list;
  }

  private extractNumber(text: string): number {
    const match = text.match(/\d+/);
    return match ? parseInt(match[0]) : 0;
  }

  private translateCategory(category: string): string {
    const translations: Record<string, string> = {
      vegetable: "овощи/фрукты",
      grain: "зерновые",
      protein: "белки",
      fat: "полезные жиры",
    };
    return translations[category] || category;
  }

  /**
   * Фолбэк рецепт при ошибке
   */
  private getFallbackRecipe(request: RecipeGenerationRequest): RecipeResponse {
    const mainIngredients = request.ingredients.map((i) => i.name).join(", ");

    return {
      id: uuidv4(),
      title: `Салат "${mainIngredients}"`,
      description: "Свежий и полезный салат на основе ваших ингредиентов",
      cookingTime: 20,
      difficulty: "easy",
      ingredients: [
        ...request.ingredients.map((ing) => ({
          name: ing.name,
          quantity: "по вкусу",
          category: ing.category,
        })),
        {
          name: "Оливковое масло",
          quantity: "2 ст.л.",
          category: "fat" as const,
        },
        {
          name: "Лимонный сок",
          quantity: "1 ст.л.",
          category: "vegetable" as const,
        },
      ],
      steps: [
        "Тщательно промойте все овощи",
        "Нарежьте ингредиенты удобными кусочками",
        "Смешайте в большой миске",
        "Приготовьте заправку из масла и лимонного сока",
        "Полейте салат заправкой и аккуратно перемешайте",
        "Подавайте сразу или охладите 10 минут перед подачей",
      ],
      nutritionalInfo: {
        calories: 250,
        proteins: 15,
        carbs: 30,
        fats: 10,
        fiber: 12,
      },
      plateAnalysis:
        "Это блюдо соответствует принципам Гарвардской тарелки: основа из свежих овощей, добавлены полезные жиры в виде оливкового масла, сбалансированный вкус и питательность.",
      tips: [
        "Можно добаять горсть орехов для хрустящей текстуры",
        "Для сытости можно добавить отварную киноа или нут",
        "Подавайте с цельнозерновым хлебом",
      ],
    };
  }

  /**
   * Подсчет токенов в промпте
   */
  async estimateTokens(prompt: string): Promise<number> {
    try {
      const response = await this.client.tokensCount({
        model: this.model,
        input: [prompt],
      });
      return response.tokens || 0;
    } catch (error) {
      console.warn(
        "Не удалось подсчитать токены, используется приблизительная оценка",
      );
      return Math.ceil(prompt.length / 4); // Приблизительная оценка: 1 токен ≈ 4 символа
    }
  }
}

export const gigaChatService = GigaChatService.getInstance();
```

### Этап 4: Контроллеры и роуты (1-2 дня)

#### Задача 4.1: Контроллер рецептов

```typescript
// src/controllers/recipe.controller.ts
import { Request, Response, NextFunction } from "express";
import { gigaChatService } from "../services/gigachat/gigachat.service";
import { supabaseService } from "../services/supabase/supabase.service";
import { AppError } from "../middleware/error.middleware";
import { z } from "zod";

// Схемы валидации
const RecipeRequestSchema = z.object({
  userId: z.string().uuid(),
  ingredients: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        category: z.enum(["vegetable", "grain", "protein", "fat"]),
      }),
    )
    .min(1)
    .max(15),
  userPrompt: z.string().max(500).optional(),
  dietaryPreferences: z.array(z.string()).optional(),
  cookingTime: z.number().min(5).max(240).optional(),
});

export class RecipeController {
  /**
   * Генерация нового рецепта
   */
  async generateRecipe(req: Request, res: Response, next: NextFunction) {
    try {
      // Валидация входных данных
      const validationResult = RecipeRequestSchema.safeParse(req.body);
      if (!validationResult.success) {
        throw new AppError(
          "Неверные данные запроса",
          400,
          validationResult.error,
        );
      }

      const requestData = validationResult.data;

      // 1. Проверяем доступность GigaChat
      const isGigaChatAvailable = await gigaChatService.checkAvailability();
      if (!isGigaChatAvailable) {
        throw new AppError("Сервис AI временно недоступен", 503);
      }

      // 2. Генерируем рецепт
      const recipe = await gigaChatService.generateRecipe(requestData);

      // 3. Сохраняем в историю
      await supabaseService.logRecipeRequest(
        requestData.userId,
        requestData,
        recipe,
        recipe.usage,
      );

      // 4. Сохраняем как тарелку (опционально)
      if (req.query.savePlate === "true") {
        await supabaseService.saveUserPlate(
          requestData.userId,
          requestData.ingredients,
          recipe.title,
          recipe,
        );
      }

      res.status(200).json({
        success: true,
        data: recipe,
        meta: {
          generatedAt: new Date().toISOString(),
          model: process.env.GIGACHAT_MODEL,
          tokenUsage: recipe.usage,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Получение истории рецептов пользователя
   */
  async getRecipeHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 20;
      const page = parseInt(req.query.page as string) || 1;

      if (!userId) {
        throw new AppError("ID пользователя обязателен", 400);
      }

      const history = await supabaseService.getUserRecipeHistory(userId, limit);

      res.status(200).json({
        success: true,
        data: history,
        pagination: {
          page,
          limit,
          total: history.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Повторная генерация рецепта по ID из истории
   */
  async regenerateRecipe(req: Request, res: Response, next: NextFunction) {
    try {
      const { historyId } = req.params;

      if (!historyId) {
        throw new AppError("ID истории обязателен", 400);
      }

      // Получаем историю из БД
      const { data: historyItem, error } = await supabaseService
        .getClient()
        .from("recipe_history")
        .select("*")
        .eq("id", historyId)
        .single();

      if (error || !historyItem) {
        throw new AppError("История не найдена", 404);
      }

      // Проверяем права доступа
      if (historyItem.user_id !== req.user?.id) {
        throw new AppError("Нет доступа к этой истории", 403);
      }

      // Повторная генерация с теми же параметрами
      const recipe = await gigaChatService.generateRecipe(
        historyItem.request_data,
      );

      res.status(200).json({
        success: true,
        data: recipe,
        isRegenerated: true,
        originalRequestId: historyId,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const recipeController = new RecipeController();
```

#### Задача 4.2: Роуты

```typescript
// src/routes/recipe.routes.ts
import { Router } from "express";
import { recipeController } from "../controllers/recipe.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validation.middleware";
import { RecipeRequestSchema } from "../controllers/recipe.controller";

const router = Router();

// Генерация нового рецепта
router.post(
  "/generate",
  authenticate,
  validateRequest(RecipeRequestSchema),
  recipeController.generateRecipe,
);

// История рецептов пользователя
router.get("/history/:userId", authenticate, recipeController.getRecipeHistory);

// Повторная генерация из истории
router.post(
  "/regenerate/:historyId",
  authenticate,
  recipeController.regenerateRecipe,
);

export default router;
```

### Этап 5: Middleware и утилиты (1 день)

#### Задача 5.1: Middleware аутентификации

```typescript
// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { supabaseService } from "../services/supabase/supabase.service";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        telegram_id?: number;
        email?: string;
      };
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Проверяем JWT токен
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        error: "Требуется аутентификация",
        code: "AUTH_REQUIRED",
      });
    }

    // Валидация токена через Supabase
    const {
      data: { user },
      error,
    } = await supabaseService.getClient().auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        error: "Неверный или просроченный токен",
        code: "INVALID_TOKEN",
      });
    }

    // Добавляем пользователя в запрос
    req.user = {
      id: user.id,
      email: user.email || undefined,
    };

    next();
  } catch (error) {
    console.error("❌ Ошибка аутентификации:", error);
    res.status(500).json({
      error: "Ошибка аутентификации",
      code: "AUTH_ERROR",
    });
  }
};

// Упрощенная аутентификация для MVP (без JWT)
export const simpleAuth = (req: Request, res: Response, next: NextFunction) => {
  const userId = req.headers["x-user-id"] || req.body.userId;

  if (!userId) {
    return res.status(401).json({
      error: "Требуется идентификатор пользователя",
      code: "USER_ID_REQUIRED",
    });
  }

  // В MVP просто добавляем userId в запрос
  req.user = { id: userId as string };
  next();
};
```

#### Задача 5.2: Middleware обработки ошибок

```typescript
// src/middleware/error.middleware.ts
import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public isOperational = true,
    public details?: any,
  ) {
    super(message);
    this.name = "AppError";
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError | ZodError,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Логирование ошибки
  console.error("❌ Ошибка:", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    user: req.user?.id,
  });

  // Обработка ZodError (валидация)
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Ошибка валидации",
      code: "VALIDATION_ERROR",
      details: err.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      })),
    });
  }

  // Обработка AppError
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.name,
      details: err.details,
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
  }

  // Обработка GigaChat ошибок
  if (err.message.includes("GigaChat") || err.message.includes("токен")) {
    return res.status(503).json({
      error: "Сервис AI временно недоступен",
      code: "AI_SERVICE_UNAVAILABLE",
      message: "Пожалуйста, попробуйте позже",
    });
  }

  // Обработка неизвестных ошибок
  const statusCode = err instanceof Error ? 500 : 400;
  const message = err instanceof Error ? err.message : "Неизвестная ошибка";

  res.status(statusCode).json({
    error: message,
    code: "INTERNAL_ERROR",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};
```

### Этап 6: Деплой и инфраструктура (1 день)

#### Задача 6.1: Docker конфигурация

```dockerfile
# Dockerfile
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
```

#### Задача 6.2: docker-compose для разработки

```yaml
# docker-compose.yml
version: "3.8"

services:
  backend:
    build: .
    container_name: harvard-plate-backend
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
      - PORT=3001
      - FRONTEND_URL=http://localhost:3000
      - GIGACHAT_CREDENTIALS=${GIGACHAT_CREDENTIALS}
      - GIGACHAT_MODEL=GigaChat
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
    volumes:
      - .:/app
      - /app/node_modules
    command: npm run dev
    restart: unless-stopped
    networks:
      - harvard-network

  # Для локального тестирования можно добавить PostgreSQL
  postgres:
    image: postgres:15-alpine
    container_name: harvard-db
    environment:
      - POSTGRES_DB=harvard_plate
      - POSTGRES_USER=admin
      - POSTGRES_PASSWORD=secret
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - harvard-network

volumes:
  postgres_data:

networks:
  harvard-network:
    driver: bridge
```

### Этап 7: Тестирование и документация (1-2 дня)

#### Задача 7.1: Тесты API

```typescript
// tests/recipe.test.ts
import request from "supertest";
import App from "../src/app";
import { supabaseService } from "../services/supabase/supabase.service";

describe("Recipe API", () => {
  let app: App;
  let server: any;

  beforeAll(async () => {
    app = new App();
    server = app.listen();
  });

  afterAll(async () => {
    await server.close();
  });

  describe("POST /api/recipes/generate", () => {
    it("должен генерировать рецепт при валидных данных", async () => {
      const response = await request(server)
        .post("/api/recipes/generate")
        .set("Authorization", "Bearer test-token")
        .send({
          userId: "test-user-id",
          ingredients: [
            { name: "Помидор", category: "vegetable" },
            { name: "Огурец", category: "vegetable" },
            { name: "Куриная грудка", category: "protein" },
          ],
          userPrompt: "Сделай салат",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("title");
      expect(response.body.data).toHaveProperty("ingredients");
      expect(response.body.data).toHaveProperty("steps");
    });

    it("должен возвращать ошибку при невалидных данных", async () => {
      const response = await request(server)
        .post("/api/recipes/generate")
        .set("Authorization", "Bearer test-token")
        .send({
          // Нет userId
          ingredients: [],
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });
});
```

#### Задача 7.2: Документация API

```markdown
# 📚 Документация API Harvard Plate

## Базовый URL

`https://api.harvard-plate.com` (продакшен)
`http://localhost:3001` (разработка)

## Аутентификация

### 1. Получение токена
```

POST /api/auth/login
{
"telegram_id": 123456789,
"username": "john_doe"
}

```

### 2. Использование токена
Добавьте заголовок:
```

Authorization: Bearer <ваш_токен>

```

## Эндпоинты

### Рецепты

#### Генерация рецепта
```

POST /api/recipes/generate

````

**Тело запроса:**
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
````

**Успешный ответ (200):**

```json
{
  "success": true,
  "data": {
    "id": "recipe-id",
    "title": "Название рецепта",
    "description": "Описание",
    "cookingTime": 30,
    "difficulty": "medium",
    "ingredients": [...],
    "steps": [...],
    "nutritionalInfo": {...},
    "plateAnalysis": "...",
    "tips": [...]
  }
}
```

#### Получение истории

```
GET /api/recipes/history/:userId?limit=20&page=1
```

### Пользователи

#### Получение информации

```
GET /api/users/:userId
```

#### Получение ингредиентов

```
GET /api/users/:userId/ingredients
```

#### Добавление ингредиента

```
POST /api/users/:userId/ingredients
{
  "name": "Брокколи",
  "category": "vegetable"
}
```

### Тарелки

#### Сохранение тарелки

```
POST /api/plates
{
  "userId": "uuid",
  "ingredients": [...],
  "name": "Моя тарелка"
}
```

#### Получение сохраненных тарелок

```
GET /api/plates/:userId
```

## Коды ошибок

| Код | Описание                  |
| --- | ------------------------- |
| 400 | Неверный запрос           |
| 401 | Требуется аутентификация  |
| 403 | Нет доступа               |
| 404 | Ресурс не найден          |
| 429 | Слишком много запросов    |
| 500 | Внутренняя ошибка сервера |
| 503 | Сервис AI недоступен      |

````

## 🚀 Скрипты запуска

```json
// package.json scripts
{
  "scripts": {
    "dev": "nodemon src/app.ts",
    "build": "tsc",
    "start": "node dist/app.js",
    "test": "jest --coverage",
    "test:watch": "jest --watch",
    "lint": "eslint src/**/*.ts",
    "format": "prettier --write src/**/*.ts",
    "type-check": "tsc --noEmit",
    "db:migrate": "node scripts/migrate.js",
    "db:seed": "node scripts/seed.js",
    "docker:build": "docker build -t harvard-plate-backend .",
    "docker:run": "docker run -p 3001:3001 harvard-plate-backend"
  }
}
````

## 📊 Мониторинг и метрики

### Health check эндпоинты:

- `GET /health` - общая проверка
- `GET /health/detailed` - детальная проверка всех сервисов
- `GET /metrics` - метрики Prometheus (опционально)

### Логирование:

- Уровни: error, warn, info, debug
- Вывод в консоль (development) и файлы (production)
- Структурированный формат JSON

## 🔒 Безопасность

1. **HTTPS** - обязателен в продакшене
2. **CORS** - разрешен только ваш фронтенд
3. **Rate limiting** - ограничение 100 запросов/15 минут
4. **Helmet.js** - безопасные HTTP-заголовки
5. **Валидация** - Zod для всех входных данных
6. **SQL-инъекции** - защита через Supabase
7. **Токены** - JWT с коротким временем жизни

---

## 📅 План выполнения (8-10 дней)

| День | Этап            | Задачи                          |
| ---- | --------------- | ------------------------------- |
| 1-2  | Настройка       | Проект, TS, базовые зависимости |
| 3    | Supabase        | Таблицы, миграции, сервис       |
| 4    | GigaChat        | Интеграция SDK, сервис          |
| 5    | Контроллеры     | User, Recipe, Plate             |
| 6    | Middleware      | Auth, валидация, ошибки         |
| 7    | Роуты и тесты   | Маршруты, тесты API             |
| 8    | Деплой          | Docker, конфигурация            |
| 9    | Документация    | API docs, README                |
| 10   | Финальные тесты | Нагрузка, безопасность          |

---

Это полное ТЗ для бэкенда Harvard Plate. Все компоненты готовы к разработке с учетом официальной документации GigaChat и лучших практик Supabase. 🚀
