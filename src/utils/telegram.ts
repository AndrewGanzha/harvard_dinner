export const parseTelegramId = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const num = typeof value === "string" ? Number(value) : (value as number);
  if (!Number.isFinite(num) || !Number.isInteger(num) || num <= 0) {
    return null;
  }
  return num;
};
