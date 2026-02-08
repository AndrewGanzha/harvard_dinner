import dotenv from "dotenv";
import { Pool } from "pg";
import { randomUUID } from "crypto";

dotenv.config();

type IngredientCategory = "vegetable" | "grain" | "protein" | "fat";

type UserRow = {
  telegram_id: number;
  username: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
};

type IngredientRow = {
  id: string;
  telegram_id: number;
  name: string;
  category: IngredientCategory;
  created_at: string;
};

type PlateRow = {
  id: string;
  telegram_id: number;
  name: string | null;
  ingredients: any;
  recipe_data: any | null;
  created_at: string;
};

type RecipeHistoryRow = {
  id: string;
  telegram_id: number;
  request_data: any;
  response_data: any | null;
  gigachat_usage: any | null;
  created_at: string;
};

export class PostgresService {
  private static instance: PostgresService;
  private pool: Pool;

  private constructor() {
    const connectionString = process.env.DATABASE_URL;
    const host = process.env.PGHOST;
    const port = Number(process.env.PGPORT || 5432);
    const database = process.env.PGDATABASE;
    const user = process.env.PGUSER;
    const password = process.env.PGPASSWORD;
    const connectionLimit = Number(process.env.PG_CONNECTION_LIMIT || 10);

    const sslEnabled =
      process.env.PGSSL === "true" ||
      process.env.PGSSL === "1" ||
      (connectionString ? connectionString.includes("sslmode=require") : false);

    if (!connectionString && (!host || !database || !user || !password)) {
      throw new Error("PostgreSQL credentials not found in environment variables");
    }

    this.pool = new Pool({
      connectionString: connectionString || undefined,
      host,
      port,
      database,
      user,
      password,
      max: connectionLimit,
      ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
    });
  }

  public static getInstance(): PostgresService {
    if (!PostgresService.instance) {
      PostgresService.instance = new PostgresService();
    }
    return PostgresService.instance;
  }

  private parseJson<T>(value: any, fallback: T): T {
    if (value === null || value === undefined) {
      return fallback;
    }
    if (typeof value === "string") {
      try {
        return JSON.parse(value) as T;
      } catch (_error) {
        return fallback;
      }
    }
    return value as T;
  }

  async createOrGetUser(telegramId: number, username?: string) {
    try {
      const existing = await this.pool.query<UserRow>(
        "select telegram_id, username, email, created_at, updated_at from users where telegram_id = $1 limit 1",
        [telegramId],
      );

      if (existing.rows.length > 0) {
        let user = existing.rows[0];
        if (username && user.username !== username) {
          const updated = await this.pool.query<UserRow>(
            "update users set username = $1 where telegram_id = $2 returning telegram_id, username, email, created_at, updated_at",
            [username, telegramId],
          );
          if (updated.rows[0]) {
            user = updated.rows[0];
          }
        }
        return { data: user, isNew: false };
      }

      const inserted = await this.pool.query<UserRow>(
        "insert into users (telegram_id, username) values ($1, $2) returning telegram_id, username, email, created_at, updated_at",
        [telegramId, username || `user_${telegramId}`],
      );

      const newUser = inserted.rows[0];
      console.log(`✅ Created new user: ${telegramId}`);
      return { data: newUser, isNew: true };
    } catch (error) {
      console.error("❌ User creation error:", error);
      throw error;
    }
  }

  async getUserByTelegramId(telegramId: number): Promise<UserRow | null> {
    try {
      const result = await this.pool.query<UserRow>(
        "select telegram_id, username, email, created_at, updated_at from users where telegram_id = $1 limit 1",
        [telegramId],
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error("❌ Error fetching user:", error);
      return null;
    }
  }

  async getUserIngredients(telegramId: number): Promise<IngredientRow[]> {
    try {
      const result = await this.pool.query<IngredientRow>(
        "select id, telegram_id, name, category, created_at from user_ingredients where telegram_id = $1 order by created_at desc",
        [telegramId],
      );
      return result.rows;
    } catch (error) {
      console.error("❌ Error fetching ingredients:", error);
      return [];
    }
  }

  async addUserIngredient(
    telegramId: number,
    name: string,
    category: IngredientCategory,
  ): Promise<IngredientRow | null> {
    try {
      const id = randomUUID();
      const result = await this.pool.query<IngredientRow>(
        "insert into user_ingredients (id, telegram_id, name, category, created_at) values ($1, $2, $3, $4, now()) on conflict (telegram_id, name) do update set category = excluded.category returning id, telegram_id, name, category, created_at",
        [id, telegramId, name, category],
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error("❌ Error adding ingredient:", error);
      return null;
    }
  }

  async deleteUserIngredient(
    telegramId: number,
    ingredientId: string,
  ): Promise<boolean> {
    try {
      const result = await this.pool.query(
        "delete from user_ingredients where id = $1 and telegram_id = $2",
        [ingredientId, telegramId],
      );
      return result.rowCount > 0;
    } catch (error) {
      console.error("❌ Error deleting ingredient:", error);
      return false;
    }
  }

  async saveUserPlate(
    telegramId: number,
    ingredients: any[],
    name?: string,
    recipeData?: any,
  ): Promise<PlateRow | null> {
    try {
      const id = randomUUID();
      const result = await this.pool.query<PlateRow>(
        "insert into saved_plates (id, telegram_id, name, ingredients, recipe_data, created_at) values ($1, $2, $3, $4, $5, now()) returning id, telegram_id, name, ingredients, recipe_data, created_at",
        [
          id,
          telegramId,
          name || null,
          JSON.stringify(ingredients || []),
          recipeData ? JSON.stringify(recipeData) : null,
        ],
      );

      const plate = result.rows[0];
      if (!plate) return null;

      plate.ingredients = this.parseJson(plate.ingredients, []);
      plate.recipe_data = this.parseJson(plate.recipe_data, null);

      return plate;
    } catch (error) {
      console.error("❌ Error saving plate:", error);
      return null;
    }
  }

  async getUserPlates(telegramId: number): Promise<PlateRow[]> {
    try {
      const result = await this.pool.query<PlateRow>(
        "select id, telegram_id, name, ingredients, recipe_data, created_at from saved_plates where telegram_id = $1 order by created_at desc",
        [telegramId],
      );

      return result.rows.map((plate) => ({
        ...plate,
        ingredients: this.parseJson(plate.ingredients, []),
        recipe_data: this.parseJson(plate.recipe_data, null),
      }));
    } catch (error) {
      console.error("❌ Error fetching plates:", error);
      return [];
    }
  }

  async deleteUserPlate(
    telegramId: number,
    plateId: string,
  ): Promise<boolean> {
    try {
      const result = await this.pool.query(
        "delete from saved_plates where id = $1 and telegram_id = $2",
        [plateId, telegramId],
      );
      return result.rowCount > 0;
    } catch (error) {
      console.error("❌ Error deleting plate:", error);
      return false;
    }
  }

  async logRecipeRequest(
    telegramId: number,
    requestData: any,
    responseData?: any,
    gigachatUsage?: any,
  ): Promise<void> {
    try {
      await this.pool.query(
        "insert into recipe_history (id, telegram_id, request_data, response_data, gigachat_usage, created_at) values ($1, $2, $3, $4, $5, now())",
        [
          randomUUID(),
          telegramId,
          JSON.stringify(requestData || {}),
          responseData ? JSON.stringify(responseData) : null,
          gigachatUsage ? JSON.stringify(gigachatUsage) : null,
        ],
      );
    } catch (error) {
      console.error("❌ Error logging recipe request:", error);
    }
  }

  async getUserRecipeHistory(
    telegramId: number,
    limit = 20,
  ): Promise<RecipeHistoryRow[]> {
    try {
      const result = await this.pool.query<RecipeHistoryRow>(
        "select id, telegram_id, request_data, response_data, gigachat_usage, created_at from recipe_history where telegram_id = $1 order by created_at desc limit $2",
        [telegramId, limit],
      );

      return result.rows.map((item) => ({
        ...item,
        request_data: this.parseJson(item.request_data, {}),
        response_data: this.parseJson(item.response_data, null),
        gigachat_usage: this.parseJson(item.gigachat_usage, null),
      }));
    } catch (error) {
      console.error("❌ Error fetching recipe history:", error);
      return [];
    }
  }

  async getRecipeHistoryItem(
    historyId: string,
  ): Promise<RecipeHistoryRow | null> {
    try {
      const result = await this.pool.query<RecipeHistoryRow>(
        "select id, telegram_id, request_data, response_data, gigachat_usage, created_at from recipe_history where id = $1 limit 1",
        [historyId],
      );

      const item = result.rows[0];
      if (!item) return null;

      item.request_data = this.parseJson(item.request_data, {});
      item.response_data = this.parseJson(item.response_data, null);
      item.gigachat_usage = this.parseJson(item.gigachat_usage, null);

      return item;
    } catch (error) {
      console.error("❌ Error fetching recipe history item:", error);
      return null;
    }
  }

  async getUserStats(telegramId: number) {
    try {
      const [ingredientsResult, platesResult, historyResult] = await Promise.all([
        this.pool.query<{ count: string }>(
          "select count(*)::text as count from user_ingredients where telegram_id = $1",
          [telegramId],
        ),
        this.pool.query<{ count: string }>(
          "select count(*)::text as count from saved_plates where telegram_id = $1",
          [telegramId],
        ),
        this.pool.query<{ count: string }>(
          "select count(*)::text as count from recipe_history where telegram_id = $1",
          [telegramId],
        ),
      ]);

      const ingredients = Number(ingredientsResult.rows[0]?.count || 0);
      const plates = Number(platesResult.rows[0]?.count || 0);
      const recipeRequests = Number(historyResult.rows[0]?.count || 0);

      return {
        ingredients,
        plates,
        recipeRequests,
      };
    } catch (error) {
      console.error("❌ Error fetching user stats:", error);
      return null;
    }
  }
}

export const postgresService = PostgresService.getInstance();
