import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

type TelegramUser = {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
};

type InitDataValidationResult =
  | { ok: true; user: TelegramUser }
  | { ok: false; error: string };

const TELEGRAM_TTL_SECONDS = Number(
  process.env.TELEGRAM_AUTH_TTL_SECONDS || 86400,
);
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

const parseInitData = (initData: string): InitDataValidationResult => {
  if (!TELEGRAM_BOT_TOKEN) {
    return { ok: false, error: "BOT_TOKEN_MISSING" };
  }

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  const authDateRaw = params.get("auth_date");
  const userRaw = params.get("user");

  if (!hash || !authDateRaw || !userRaw) {
    return { ok: false, error: "INIT_DATA_INCOMPLETE" };
  }

  const authDate = Number(authDateRaw);
  if (!Number.isFinite(authDate)) {
    return { ok: false, error: "AUTH_DATE_INVALID" };
  }

  const now = Math.floor(Date.now() / 1000);
  if (now - authDate > TELEGRAM_TTL_SECONDS) {
    return { ok: false, error: "INIT_DATA_EXPIRED" };
  }

  const dataCheckString = [...params.entries()]
    .filter(([key]) => key !== "hash")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(TELEGRAM_BOT_TOKEN)
    .digest();
  const computedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  const computedBuffer = Buffer.from(computedHash, "hex");
  const receivedBuffer = Buffer.from(hash, "hex");
  if (
    computedBuffer.length !== receivedBuffer.length ||
    !crypto.timingSafeEqual(computedBuffer, receivedBuffer)
  ) {
    return { ok: false, error: "HASH_MISMATCH" };
  }

  try {
    const user = JSON.parse(userRaw) as TelegramUser;
    if (!user?.id) {
      return { ok: false, error: "USER_MISSING" };
    }
    return { ok: true, user };
  } catch (_error) {
    return { ok: false, error: "USER_PARSE_ERROR" };
  }
};

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const initData = req.headers["x-telegram-init-data"];

    if (!initData || typeof initData !== "string") {
      return res.status(401).json({
        error: "Требуется аутентификация Telegram",
        code: "TELEGRAM_AUTH_REQUIRED",
      });
    }

    const result = parseInitData(initData);

    if (!result.ok) {
      return res.status(401).json({
        error: "Неверные данные Telegram",
        code: result.error,
      });
    }

    req.user = {
      telegram_id: result.user.id,
      username: result.user.username,
      first_name: result.user.first_name,
      last_name: result.user.last_name,
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
