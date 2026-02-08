import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import compression from "compression";

// Импорт маршрутов
import userRoutes from "./routes/user.routes";
import recipeRoutes from "./routes/recipe.routes";
import plateRoutes from "./routes/plate.routes";
import healthRoutes from "./routes/health.routes";

// Импорт middleware
import { errorHandler } from "./middleware/error.middleware";
import { rateLimiter } from "./middleware/rate-limit.middleware";
import { runMigrationsIfNeeded } from "./services/postgres/migrate";

// Загрузка переменных окружения
dotenv.config();

class App {
  public app: express.Application;
  public port: string | number;

  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3001;

    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // Безопасность
    this.app.use(helmet());
    this.app.use(compression());

    // CORS
    this.app.use(
      cors({
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Telegram-Init-Data"],
      }),
    );

    // Парсинг JSON
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true }));

    // Rate limiting
    this.app.use("/api/", rateLimiter);

    // Логирование запросов
    this.app.use((req, _res, next) => {
      console.log(`${req.method} ${req.path}`);
      next();
    });
  }

  private initializeRoutes(): void {
    this.app.use("/api/users", userRoutes);
    this.app.use("/api/recipes", recipeRoutes);
    this.app.use("/api/plates", plateRoutes);
    this.app.use("/health", healthRoutes);

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        error: "Маршрут не найден",
        path: req.originalUrl,
      });
    });
  }

  private initializeErrorHandling(): void {
    this.app.use(errorHandler);
  }

  public async listen(): Promise<void> {
    await runMigrationsIfNeeded();

    this.app.listen(this.port, () => {
      console.log(`🚀 Сервер запущен на порту ${this.port}`);
      console.log(`🔗 URL: http://localhost:${this.port}`);
      console.log(`🌍 Режим: ${process.env.NODE_ENV}`);
    });
  }
}

export default App;

if (require.main === module) {
  const server = new App();
  server.listen().catch((error) => {
    console.error("❌ Ошибка запуска сервера:", error);
    process.exit(1);
  });
}
