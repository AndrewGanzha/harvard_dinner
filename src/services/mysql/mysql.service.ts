import mysql, { Pool, RowDataPacket, ResultSetHeader } from "mysql2/promise";
import dotenv from "dotenv";
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

export class MysqlService {
  private static instance: MysqlService;
  private pool: Pool;

  private constructor() {
    const host = process.env.MYSQL_HOST;
    const port = Number(process.env.MYSQL_PORT || 3306);
    const database = process.env.MYSQL_DATABASE;
    const user = process.env.MYSQL_USER;
    const password = process.env.MYSQL_PASSWORD;
    const connectionLimit = Number(process.env.MYSQL_CONNECTION_LIMIT || 10);

    if (!host || !database || !user || !password) {
      throw new Error("MySQL credentials not found in environment variables");
    }

    this.pool = mysql.createPool({
      host,
      port,
      database,
      user,
      password,
      connectionLimit,
      waitForConnections: true,
      supportBigNumbers: true,
    });
  }

  public static getInstance(): MysqlService {
    if (!MysqlService.instance) {
      MysqlService.instance = new MysqlService();
    }
    return MysqlService.instance;
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
      const [existingRows] = await this.pool.execute<RowDataPacket[]>(
        "select telegram_id, username, email, created_at, updated_at from users where telegram_id = ? limit 1",
        [telegramId],
      );

      if (existingRows.length > 0) {
        const existingUser = existingRows[0] as UserRow;
        let user = existingUser;
        if (username && existingUser.username !== username) {
          await this.pool.execute(
            "update users set username = ? where telegram_id = ?",
            [username, telegramId],
          );
          const [updatedRows] = await this.pool.execute<RowDataPacket[]>(
            "select telegram_id, username, email, created_at, updated_at from users where telegram_id = ? limit 1",
            [telegramId],
          );
          user = (updatedRows[0] as UserRow) || existingUser;
        }
        return { data: user, isNew: false };
      }

      await this.pool.execute(
        "insert into users (telegram_id, username) values (?, ?)",
        [telegramId, username || `user_${telegramId}`],
      );

      const [rows] = await this.pool.execute<RowDataPacket[]>(
        "select telegram_id, username, email, created_at, updated_at from users where telegram_id = ? limit 1",
        [telegramId],
      );

      const newUser = rows[0] as UserRow;
      console.log(`✅ Created new user: ${telegramId}`);
      return { data: newUser, isNew: true };
    } catch (error) {
      console.error("❌ User creation error:", error);
      throw error;
    }
  }

  async getUserByTelegramId(telegramId: number): Promise<UserRow | null> {
    try {
      const [rows] = await this.pool.execute<RowDataPacket[]>(
        "select telegram_id, username, email, created_at, updated_at from users where telegram_id = ? limit 1",
        [telegramId],
      );
      return (rows[0] as UserRow) || null;
    } catch (error) {
      console.error("❌ Error fetching user:", error);
      return null;
    }
  }

  async getUserIngredients(telegramId: number): Promise<IngredientRow[]> {
    try {
      const [rows] = await this.pool.execute<RowDataPacket[]>(
        "select id, telegram_id, name, category, created_at from user_ingredients where telegram_id = ? order by created_at desc",
        [telegramId],
      );
      return rows as IngredientRow[];
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
      await this.pool.execute<ResultSetHeader>(
        "insert into user_ingredients (id, telegram_id, name, category, created_at) values (?, ?, ?, ?, now()) on duplicate key update category = values(category)",
        [id, telegramId, name, category],
      );

      const [rows] = await this.pool.execute<RowDataPacket[]>(
        "select id, telegram_id, name, category, created_at from user_ingredients where telegram_id = ? and name = ? limit 1",
        [telegramId, name],
      );

      return (rows[0] as IngredientRow) || null;
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
      const [result] = await this.pool.execute<ResultSetHeader>(
        "delete from user_ingredients where id = ? and telegram_id = ?",
        [ingredientId, telegramId],
      );
      return result.affectedRows > 0;
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
      await this.pool.execute<ResultSetHeader>(
        "insert into saved_plates (id, telegram_id, name, ingredients, recipe_data, created_at) values (?, ?, ?, ?, ?, now())",
        [
          id,
          telegramId,
          name || null,
          JSON.stringify(ingredients || []),
          recipeData ? JSON.stringify(recipeData) : null,
        ],
      );

      const [rows] = await this.pool.execute<RowDataPacket[]>(
        "select id, telegram_id, name, ingredients, recipe_data, created_at from saved_plates where id = ? limit 1",
        [id],
      );

      const plate = rows[0] as PlateRow;
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
      const [rows] = await this.pool.execute<RowDataPacket[]>(
        "select id, telegram_id, name, ingredients, recipe_data, created_at from saved_plates where telegram_id = ? order by created_at desc",
        [telegramId],
      );

      return (rows as PlateRow[]).map((plate) => ({
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
      const [result] = await this.pool.execute<ResultSetHeader>(
        "delete from saved_plates where id = ? and telegram_id = ?",
        [plateId, telegramId],
      );
      return result.affectedRows > 0;
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
      await this.pool.execute<ResultSetHeader>(
        "insert into recipe_history (id, telegram_id, request_data, response_data, gigachat_usage, created_at) values (?, ?, ?, ?, ?, now())",
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
      const [rows] = await this.pool.execute<RowDataPacket[]>(
        "select id, telegram_id, request_data, response_data, gigachat_usage, created_at from recipe_history where telegram_id = ? order by created_at desc limit ?",
        [telegramId, limit],
      );

      return (rows as RecipeHistoryRow[]).map((item) => ({
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
      const [rows] = await this.pool.execute<RowDataPacket[]>(
        "select id, telegram_id, request_data, response_data, gigachat_usage, created_at from recipe_history where id = ? limit 1",
        [historyId],
      );

      const item = rows[0] as RecipeHistoryRow;
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
      const [ingredientsRows, platesRows, historyRows] = await Promise.all([
        this.pool.execute<RowDataPacket[]>(
          "select count(*) as count from user_ingredients where telegram_id = ?",
          [telegramId],
        ),
        this.pool.execute<RowDataPacket[]>(
          "select count(*) as count from saved_plates where telegram_id = ?",
          [telegramId],
        ),
        this.pool.execute<RowDataPacket[]>(
          "select count(*) as count from recipe_history where telegram_id = ?",
          [telegramId],
        ),
      ]);

      const ingredients = Number(
        (ingredientsRows[0][0] as { count: number | string }).count,
      );
      const plates = Number(
        (platesRows[0][0] as { count: number | string }).count,
      );
      const recipeRequests = Number(
        (historyRows[0][0] as { count: number | string }).count,
      );

      return {
        ingredients: ingredients || 0,
        plates: plates || 0,
        recipeRequests: recipeRequests || 0,
      };
    } catch (error) {
      console.error("❌ Error fetching user stats:", error);
      return null;
    }
  }
}

export const mysqlService = MysqlService.getInstance();
