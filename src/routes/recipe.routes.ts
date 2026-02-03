import { Router } from "express";
import { recipeController } from "../controllers/recipe.controller";

const router = Router();

// Генерация нового рецепта
router.post("/generate", recipeController.generateRecipe);

// История рецептов пользователя
router.get("/history/:userId", recipeController.getRecipeHistory);

// Повторная генерация из истории
router.post("/regenerate/:historyId", recipeController.regenerateRecipe);

export default router;
