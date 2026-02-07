export type LogLevel = "error" | "warn" | "info" | "debug";

const levels: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const currentLevel = (process.env.LOG_LEVEL as LogLevel) || "info";

export const logger = {
  error: (message: string, meta?: any) => {
    if (levels[currentLevel] >= 0) {
      console.error(message, meta ?? "");
    }
  },
  warn: (message: string, meta?: any) => {
    if (levels[currentLevel] >= 1) {
      console.warn(message, meta ?? "");
    }
  },
  info: (message: string, meta?: any) => {
    if (levels[currentLevel] >= 2) {
      console.info(message, meta ?? "");
    }
  },
  debug: (message: string, meta?: any) => {
    if (levels[currentLevel] >= 3) {
      console.debug(message, meta ?? "");
    }
  },
};
