import { Request, Response, NextFunction } from "express";
import { mysqlService } from "../services/mysql/mysql.service";
import { AppError } from "../middleware/error.middleware";
import { z } from "zod";
import { parseTelegramId } from "../utils/telegram";

const SavePlateSchema = z.object({
  userId: z.number().int().positive().optional(),
  ingredients: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        category: z.enum(["vegetable", "grain", "protein", "fat"]),
      }),
    )
    .min(1),
  name: z.string().max(100).optional(),
  recipeData: z.any().optional(),
});

export class PlateController {
  async savePlate(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = SavePlateSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError("Неверные данные запроса", 400, true, parsed.error);
      }

      const telegramId = req.user?.telegram_id;
      if (!telegramId) {
        throw new AppError("Требуется аутентификация Telegram", 401);
      }

      const { userId, ingredients, name, recipeData } = parsed.data;
      if (userId && userId !== telegramId) {
        throw new AppError("Нет доступа", 403);
      }

      const plate = await mysqlService.saveUserPlate(
        telegramId,
        ingredients,
        name,
        recipeData,
      );

      if (!plate) {
        throw new AppError("Не удалось сохранить тарелку", 500);
      }

      res.status(201).json({ success: true, data: plate });
    } catch (error) {
      next(error);
    }
  }

  async getUserPlates(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params as { userId: string };
      const telegramId = parseTelegramId(userId);
      if (!telegramId) {
        throw new AppError("ID пользователя обязателен", 400);
      }

      if (req.user?.telegram_id !== telegramId) {
        throw new AppError("Нет доступа", 403);
      }

      const plates = await mysqlService.getUserPlates(telegramId);
      res.status(200).json({ success: true, data: plates });
    } catch (error) {
      next(error);
    }
  }

  async deleteUserPlate(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, plateId } = req.params as {
        userId: string;
        plateId: string;
      };
      const telegramId = parseTelegramId(userId);
      if (!telegramId || !plateId) {
        throw new AppError("ID пользователя и тарелки обязательны", 400);
      }

      if (req.user?.telegram_id !== telegramId) {
        throw new AppError("Нет доступа", 403);
      }

      const ok = await mysqlService.deleteUserPlate(telegramId, plateId);
      if (!ok) {
        throw new AppError("Не удалось удалить тарелку", 500);
      }

      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }
}

export const plateController = new PlateController();
