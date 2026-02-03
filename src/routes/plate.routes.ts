import { Router } from "express";
import { plateController } from "../controllers/plate.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// Сохранение тарелки
router.post("/", authenticate, plateController.savePlate);

// Получение сохраненных тарелок пользователя
router.get("/:userId", authenticate, plateController.getUserPlates);

// Удаление тарелки
router.delete("/:userId/:plateId", authenticate, plateController.deleteUserPlate);

export default router;
