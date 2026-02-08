import GigaChat from "gigachat";
import dotenv from "dotenv";
import { randomUUID } from "crypto";

dotenv.config();

// Типы
export interface GigaChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface RecipeGenerationRequest {
  userId?: number;
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
      scope: process.env.GIGACHAT_SCOPE,
      baseUrl: process.env.GIGACHAT_API_URL,
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
   * Генерация рецепта по принципам "Гарвардской тарелки"
   */
  async generateRecipe(
    request: RecipeGenerationRequest,
  ): Promise<RecipeResponse> {
    const systemPrompt =
      "Ты профессиональный диетолог. Генерируй рецепты по принципам Гарвардской тарелки. " +
      "Возвращай результат строго в JSON без Markdown. Структура JSON описана в пользовательском запросе.";

    const prompt = this.buildPrompt(request);

    try {
      const response = await this.client.chat({
        model: this.model,
        temperature: 0.7,
        max_tokens: 1200,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
      });

      const content = response.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("Пустой ответ от GigaChat");
      }

      const parsed = this.parseRecipeResponse(content);

      return {
        id: randomUUID(),
        ...parsed,
        usage: {
          prompt_tokens: response.usage?.prompt_tokens || 0,
          completion_tokens: response.usage?.completion_tokens || 0,
          total_tokens: response.usage?.total_tokens || 0,
        },
        created: response.created,
      };
    } catch (error) {
      console.error("❌ Ошибка генерации рецепта:", error);
      throw error;
    }
  }

  /**
   * Подсчет токенов (если поддерживается)
   */
  async countTokens(prompt: string): Promise<number> {
    try {
      const response = await this.client.tokensCount([prompt], this.model);
      return response.tokens?.[0]?.tokens || 0;
    } catch (error) {
      console.warn(
        "Не удалось подсчитать токены, используется приблизительная оценка",
      );
      return Math.ceil(prompt.length / 4);
    }
  }

  private buildPrompt(request: RecipeGenerationRequest): string {
    const ingredients = request.ingredients
      .map((i) => `- ${i.name} (${i.category})`)
      .join("\n");

    const preferences = request.dietaryPreferences?.length
      ? request.dietaryPreferences.join(", ")
      : "нет";

    const cookingTime = request.cookingTime
      ? `${request.cookingTime} минут`
      : "не указано";

    const userPrompt = request.userPrompt || "нет";

    return [
      "Сгенерируй один рецепт с учётом списка ингредиентов и принципов Гарвардской тарелки.",
      "Требования:",
      "- Ответ строго в JSON без Markdown.",
      "- Используй все ингредиенты, если возможно.",
      "- Категории ингредиентов только: vegetable, grain, protein, fat.",
      "- Поля JSON: title, description, cookingTime (число), difficulty (easy|medium|hard), ingredients (массив), steps (массив), nutritionalInfo, plateAnalysis, tips.",
      "- В ingredients каждый элемент: name, quantity, category.",
      "- В nutritionalInfo: calories, proteins, carbs, fats, fiber (числа).",
      "",
      `Ингредиенты:\n${ingredients}`,
      `Пожелания пользователя: ${userPrompt}`,
      `Диетические предпочтения: ${preferences}`,
      `Время приготовления: ${cookingTime}`,
    ].join("\n");
  }

  private parseRecipeResponse(content: string): Omit<RecipeResponse, "id"> {
    const jsonText = this.extractJson(content);
    const parsed = JSON.parse(jsonText) as Omit<RecipeResponse, "id">;

    if (!parsed.title || !parsed.ingredients || !parsed.steps) {
      throw new Error("Некорректный формат ответа GigaChat");
    }

    return parsed;
  }

  private extractJson(content: string): string {
    const firstBrace = content.indexOf("{");
    const lastBrace = content.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      throw new Error("JSON не найден в ответе GigaChat");
    }
    return content.slice(firstBrace, lastBrace + 1);
  }
}

export const gigaChatService = GigaChatService.getInstance();
