export const DEFAULT_PAGE_LIMIT = 20;

export const INGREDIENT_CATEGORIES = [
  "vegetable",
  "grain",
  "protein",
  "fat",
] as const;

export type IngredientCategory = (typeof INGREDIENT_CATEGORIES)[number];
