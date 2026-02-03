import { Request, Response, NextFunction } from "express";
import { supabaseService } from "../services/supabase/supabase.service";
import { AppError } from "../middleware/error.middleware";
import { z } from "zod";

const SavePlateSchema = z.object({
  userId: z.string().uuid(),
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

      const { userId, ingredients, name, recipeData } = parsed.data;
      const plate = await supabaseService.saveUserPlate(
        userId,
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
      const { userId } = req.params;
      if (!userId) {
        throw new AppError("ID пользователя обязателен", 400);
      }

      const plates = await supabaseService.getUserPlates(userId);
      res.status(200).json({ success: true, data: plates });
    } catch (error) {
      next(error);
    }
  }

  async deleteUserPlate(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, plateId } = req.params;
      if (!userId || !plateId) {
        throw new AppError("ID пользователя и тарелки обязательны", 400);
      }

      const ok = await supabaseService.deleteUserPlate(userId, plateId);
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
