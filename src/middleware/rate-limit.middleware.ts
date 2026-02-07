import rateLimit from "express-rate-limit";

const windowMs =
  parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10) || 900000;
const max =
  parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10) || 100;

export const rateLimiter = rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Слишком много запросов, попробуйте позже",
    code: "RATE_LIMIT_EXCEEDED",
  },
});
