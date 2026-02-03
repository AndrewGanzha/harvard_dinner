import { Request, Response, NextFunction } from "express";
import { supabaseService } from "../services/supabase/supabase.service";

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        error: "Требуется аутентификация",
        code: "AUTH_REQUIRED",
      });
    }

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

  req.user = { id: userId as string };
  next();
};
