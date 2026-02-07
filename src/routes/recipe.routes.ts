import { Router } from "express";
import { recipeController } from "../controllers/recipe.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// Генерация нового рецепта
router.post("/generate", authenticate, recipeController.generateRecipe);

// История рецептов пользователя
router.get("/history/:userId", authenticate, recipeController.getRecipeHistory);

// Повторная генерация из истории
router.post(
  "/regenerate/:historyId",
  authenticate,
  recipeController.regenerateRecipe,
);

export default router;
