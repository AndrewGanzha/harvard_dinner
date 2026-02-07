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
  _next: NextFunction,
) => {
  console.error("❌ Ошибка:", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    user: req.user?.id,
  });

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Ошибка валидации",
      code: "VALIDATION_ERROR",
      details: err.issues.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      })),
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.name,
      details: err.details,
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
  }

  if (err.message.includes("GigaChat") || err.message.includes("токен")) {
    return res.status(503).json({
      error: "Сервис AI временно недоступен",
      code: "AI_SERVICE_UNAVAILABLE",
      message: "Пожалуйста, попробуйте позже",
    });
  }

  const statusCode = err instanceof Error ? 500 : 400;
  const message = err instanceof Error ? err.message : "Неизвестная ошибка";

  res.status(statusCode).json({
    error: message,
    code: "INTERNAL_ERROR",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};
