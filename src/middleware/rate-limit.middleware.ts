import { Request, Response, NextFunction } from "express";

// TODO: заменить на реальный rate limiter на этапе 5
export const rateLimiter = (_req: Request, _res: Response, next: NextFunction) => {
  next();
};
