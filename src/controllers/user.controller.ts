import { Request, Response, NextFunction } from "express";
import { supabaseService } from "../services/supabase/supabase.service";
import { AppError } from "../middleware/error.middleware";
import { z } from "zod";

const IngredientSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.enum(["vegetable", "grain", "protein", "fat"]),
});

const CreateUserSchema = z.object({
  telegramId: z.number().int().positive(),
  username: z.string().min(1).max(100).optional(),
});

export class UserController {
  async createOrGetUser(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = CreateUserSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError("Неверные данные запроса", 400, true, parsed.error);
      }

      const { telegramId, username } = parsed.data;
      const result = await supabaseService.createOrGetUser(telegramId, username);

      res.status(200).json({
        success: true,
        data: result.data,
        isNew: result.isNew,
      });
    } catch (error) {
      next(error);
    }
  }

  async getUserInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      if (!userId) {
        throw new AppError("ID пользователя обязателен", 400);
      }

      const { data, error } = await supabaseService
        .getClient()
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error || !data) {
        throw new AppError("Пользователь не найден", 404);
      }

      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getUserIngredients(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      if (!userId) {
        throw new AppError("ID пользователя обязателен", 400);
      }

      const ingredients = await supabaseService.getUserIngredients(userId);
      res.status(200).json({ success: true, data: ingredients });
    } catch (error) {
      next(error);
    }
  }

  async addUserIngredient(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      if (!userId) {
        throw new AppError("ID пользователя обязателен", 400);
      }

      const parsed = IngredientSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError("Неверные данные запроса", 400, true, parsed.error);
      }

      const ingredient = await supabaseService.addUserIngredient(
        userId,
        parsed.data.name,
        parsed.data.category,
      );

      if (!ingredient) {
        throw new AppError("Не удалось добавить ингредиент", 500);
      }

      res.status(201).json({ success: true, data: ingredient });
    } catch (error) {
      next(error);
    }
  }

  async deleteUserIngredient(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, ingredientId } = req.params;
      if (!userId || !ingredientId) {
        throw new AppError("ID пользователя и ингредиента обязательны", 400);
      }

      const ok = await supabaseService.deleteUserIngredient(
        userId,
        ingredientId,
      );

      if (!ok) {
        throw new AppError("Не удалось удалить ингредиент", 500);
      }

      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  async getUserStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      if (!userId) {
        throw new AppError("ID пользователя обязателен", 400);
      }

      const stats = await supabaseService.getUserStats(userId);
      if (!stats) {
        throw new AppError("Не удалось получить статистику", 500);
      }

      res.status(200).json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
