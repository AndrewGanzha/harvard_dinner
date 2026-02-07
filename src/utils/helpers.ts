export const toIsoString = (date: Date) => date.toISOString();

export const safeJsonParse = <T>(input: string, fallback: T): T => {
  try {
    return JSON.parse(input) as T;
  } catch {
    return fallback;
  }
};
