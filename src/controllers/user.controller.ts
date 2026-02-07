import { Request, Response, NextFunction } from "express";
import { mysqlService } from "../services/mysql/mysql.service";
import { AppError } from "../middleware/error.middleware";
import { z } from "zod";
import { parseTelegramId } from "../utils/telegram";

const IngredientSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.enum(["vegetable", "grain", "protein", "fat"]),
});

export class UserController {
  async createOrGetUser(req: Request, res: Response, next: NextFunction) {
    try {
      const telegramId = req.user?.telegram_id;
      if (!telegramId) {
        throw new AppError("Требуется аутентификация Telegram", 401);
      }

      const username = req.user?.username;
      const result = await mysqlService.createOrGetUser(telegramId, username);

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
      const { userId } = req.params as { userId: string };
      const telegramId = parseTelegramId(userId);
      if (!telegramId) {
        throw new AppError("ID пользователя обязателен", 400);
      }

      if (req.user?.telegram_id !== telegramId) {
        throw new AppError("Нет доступа", 403);
      }

      const data = await mysqlService.getUserByTelegramId(telegramId);
      if (!data) {
        throw new AppError("Пользователь не найден", 404);
      }

      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getUserIngredients(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params as { userId: string };
      const telegramId = parseTelegramId(userId);
      if (!telegramId) {
        throw new AppError("ID пользователя обязателен", 400);
      }

      if (req.user?.telegram_id !== telegramId) {
        throw new AppError("Нет доступа", 403);
      }

      const ingredients = await mysqlService.getUserIngredients(telegramId);
      res.status(200).json({ success: true, data: ingredients });
    } catch (error) {
      next(error);
    }
  }

  async addUserIngredient(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params as { userId: string };
      const telegramId = parseTelegramId(userId);
      if (!telegramId) {
        throw new AppError("ID пользователя обязателен", 400);
      }

      const parsed = IngredientSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError("Неверные данные запроса", 400, true, parsed.error);
      }

      if (req.user?.telegram_id !== telegramId) {
        throw new AppError("Нет доступа", 403);
      }

      const ingredient = await mysqlService.addUserIngredient(
        telegramId,
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
      const { userId, ingredientId } = req.params as {
        userId: string;
        ingredientId: string;
      };
      const telegramId = parseTelegramId(userId);
      if (!telegramId || !ingredientId) {
        throw new AppError("ID пользователя и ингредиента обязательны", 400);
      }

      if (req.user?.telegram_id !== telegramId) {
        throw new AppError("Нет доступа", 403);
      }

      const ok = await mysqlService.deleteUserIngredient(
        telegramId,
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
      const { userId } = req.params as { userId: string };
      const telegramId = parseTelegramId(userId);
      if (!telegramId) {
        throw new AppError("ID пользователя обязателен", 400);
      }

      if (req.user?.telegram_id !== telegramId) {
        throw new AppError("Нет доступа", 403);
      }

      const stats = await mysqlService.getUserStats(telegramId);
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
