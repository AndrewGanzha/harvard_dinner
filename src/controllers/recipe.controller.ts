import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { gigaChatService } from "../services/gigachat/gigachat.service";
import { postgresService } from "../services/postgres/postgres.service";
import { AppError } from "../middleware/error.middleware";
import { parseTelegramId } from "../utils/telegram";

// Схемы валидации
export const RecipeRequestSchema = z.object({
  userId: z.number().int().positive().optional(),
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
      const validationResult = RecipeRequestSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: "Неверные данные запроса",
          details: validationResult.error.format(),
        });
      }

      const requestData = validationResult.data;
      const telegramId = req.user?.telegram_id;
      if (!telegramId) {
        throw new AppError("Требуется аутентификация Telegram", 401);
      }

      if (requestData.userId && requestData.userId !== telegramId) {
        throw new AppError("Нет доступа", 403);
      }

      const isGigaChatAvailable = await gigaChatService.checkAvailability();
      if (!isGigaChatAvailable) {
        return res.status(503).json({
          error: "Сервис AI временно недоступен",
        });
      }

      const recipe = await gigaChatService.generateRecipe(requestData);

      await postgresService.logRecipeRequest(
        telegramId,
        requestData,
        recipe,
        recipe.usage,
      );

      if (req.query.savePlate === "true") {
        await postgresService.saveUserPlate(
          telegramId,
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
      const { userId } = req.params as { userId: string };
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const page = parseInt(req.query.page as string, 10) || 1;

      const telegramId = parseTelegramId(userId);
      if (!telegramId) {
        throw new AppError("ID пользователя обязателен", 400);
      }

      if (req.user?.telegram_id !== telegramId) {
        throw new AppError("Нет доступа", 403);
      }

      const history = await postgresService.getUserRecipeHistory(
        telegramId,
        limit,
      );

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
      const { historyId } = req.params as { historyId: string };

      if (!historyId) {
        return res.status(400).json({
          error: "ID истории обязателен",
        });
      }

      const historyItem = await postgresService.getRecipeHistoryItem(historyId);
      if (!historyItem) {
        return res.status(404).json({
          error: "История не найдена",
        });
      }

      const requestUser = req.user;
      if (
        requestUser?.telegram_id &&
        historyItem.telegram_id !== requestUser.telegram_id
      ) {
        return res.status(403).json({
          error: "Нет доступа к этой истории",
        });
      }

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
