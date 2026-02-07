import { z } from "zod";

export const uuidSchema = z.string().uuid();

export const ingredientSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.enum(["vegetable", "grain", "protein", "fat"]),
});
