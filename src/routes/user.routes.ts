import { Router } from "express";
import { userController } from "../controllers/user.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// Создать или получить пользователя по telegram_id
router.post("/", userController.createOrGetUser);

// Получить информацию о пользователе
router.get("/:userId", authenticate, userController.getUserInfo);

// Получить ингредиенты пользователя
router.get("/:userId/ingredients", authenticate, userController.getUserIngredients);

// Добавить ингредиент
router.post(
  "/:userId/ingredients",
  authenticate,
  userController.addUserIngredient,
);

// Удалить ингредиент
router.delete(
  "/:userId/ingredients/:ingredientId",
  authenticate,
  userController.deleteUserIngredient,
);

// Статистика пользователя
router.get("/:userId/stats", authenticate, userController.getUserStats);

export default router;
