import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { gigaChatService } from "../services/gigachat/gigachat.service";
import { supabaseService } from "../services/supabase/supabase.service";

// Схемы валидации
export const RecipeRequestSchema = z.object({
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
      const validationResult = RecipeRequestSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: "Неверные данные запроса",
          details: validationResult.error.format(),
        });
      }

      const requestData = validationResult.data;

      const isGigaChatAvailable = await gigaChatService.checkAvailability();
      if (!isGigaChatAvailable) {
        return res.status(503).json({
          error: "Сервис AI временно недоступен",
        });
      }

      const recipe = await gigaChatService.generateRecipe(requestData);

      await supabaseService.logRecipeRequest(
        requestData.userId,
        requestData,
        recipe,
        recipe.usage,
      );

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
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const page = parseInt(req.query.page as string, 10) || 1;

      if (!userId) {
        return res.status(400).json({
          error: "ID пользователя обязателен",
        });
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
        return res.status(400).json({
          error: "ID истории обязателен",
        });
      }

      const { data: historyItem, error } = await supabaseService
        .getClient()
        .from("recipe_history")
        .select("*")
        .eq("id", historyId)
        .single();

      if (error || !historyItem) {
        return res.status(404).json({
          error: "История не найдена",
        });
      }

      const requestUser = (req as any).user;
      if (requestUser?.id && historyItem.user_id !== requestUser.id) {
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
