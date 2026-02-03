import { createClient, SupabaseClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

// Типы данных (генерируются автоматически supabase)
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          telegram_id: number | null;
          username: string | null;
          email: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["users"]["Row"],
          "created_at" | "updated_at"
        >;
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
      };
      user_ingredients: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          category: "vegetable" | "grain" | "protein" | "fat";
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["user_ingredients"]["Row"],
          "id" | "created_at"
        >;
        Update: Partial<
          Database["public"]["Tables"]["user_ingredients"]["Insert"]
        >;
      };
      saved_plates: {
        Row: {
          id: string;
          user_id: string;
          name: string | null;
          ingredients: any[];
          recipe_data: any | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["saved_plates"]["Row"],
          "id" | "created_at"
        >;
        Update: Partial<
          Database["public"]["Tables"]["saved_plates"]["Insert"]
        >;
      };
      recipe_history: {
        Row: {
          id: string;
          user_id: string;
          request_data: any;
          response_data: any;
          gigachat_usage: any;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["recipe_history"]["Row"],
          "id" | "created_at"
        >;
        Update: Partial<
          Database["public"]["Tables"]["recipe_history"]["Insert"]
        >;
      };
    };
  };
}

export class SupabaseService {
  private static instance: SupabaseService;
  private client: SupabaseClient<Database>;

  private constructor() {
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        "Supabase credentials not found in environment variables",
      );
    }

    this.client = createClient<Database>(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  public static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService();
    }
    return SupabaseService.instance;
  }

  public getClient(): SupabaseClient<Database> {
    return this.client;
  }

  // ============ МЕТОДЫ ДЛЯ ПОЛЬЗОВАТЕЛЕЙ ============

  async createOrGetUser(telegramId: number, username?: string) {
    try {
      // Проверяем существующего пользователя
      const { data: existingUser, error: fetchError } = await this.client
        .from("users")
        .select("*")
        .eq("telegram_id", telegramId)
        .single();

      if (existingUser && !fetchError) {
        return { data: existingUser, isNew: false };
      }

      // Создаем нового пользователя
      const { data: newUser, error: createError } = await this.client
        .from("users")
        .insert({
          telegram_id: telegramId,
          username: username || `user_${telegramId}`,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        console.error("Error creating user:", createError);
        throw createError;
      }

      console.log(`✅ Created new user: ${telegramId}`);
      return { data: newUser, isNew: true };
    } catch (error) {
      console.error("❌ User creation error:", error);
      throw error;
    }
  }

  // ============ МЕТОДЫ ДЛЯ ИНГРЕДИЕНТОВ ============

  async getUserIngredients(userId: string): Promise<any[]> {
    try {
      const { data, error } = await this.client
        .from("user_ingredients")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("❌ Error fetching ingredients:", error);
      return [];
    }
  }

  async addUserIngredient(
    userId: string,
    name: string,
    category: "vegetable" | "grain" | "protein" | "fat",
  ): Promise<any | null> {
    try {
      const { data, error } = await this.client
        .from("user_ingredients")
        .upsert(
          {
            user_id: userId,
            name,
            category,
            created_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,name",
          },
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("❌ Error adding ingredient:", error);
      return null;
    }
  }

  async deleteUserIngredient(
    userId: string,
    ingredientId: string,
  ): Promise<boolean> {
    try {
      const { error } = await this.client
        .from("user_ingredients")
        .delete()
        .eq("id", ingredientId)
        .eq("user_id", userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("❌ Error deleting ingredient:", error);
      return false;
    }
  }

  // ============ МЕТОДЫ ДЛЯ ТАРЕЛОК ============

  async saveUserPlate(
    userId: string,
    ingredients: any[],
    name?: string,
    recipeData?: any,
  ): Promise<any | null> {
    try {
      const { data, error } = await this.client
        .from("saved_plates")
        .insert({
          user_id: userId,
          name: name || `Plate ${new Date().toLocaleDateString("ru-RU")}`,
          ingredients,
          recipe_data: recipeData || null,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("❌ Error saving plate:", error);
      return null;
    }
  }

  async getUserPlates(userId: string): Promise<any[]> {
    try {
      const { data, error } = await this.client
        .from("saved_plates")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("❌ Error fetching plates:", error);
      return [];
    }
  }

  async deleteUserPlate(userId: string, plateId: string): Promise<boolean> {
    try {
      const { error } = await this.client
        .from("saved_plates")
        .delete()
        .eq("id", plateId)
        .eq("user_id", userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("❌ Error deleting plate:", error);
      return false;
    }
  }

  // ============ МЕТОДЫ ДЛЯ ИСТОРИИ ============

  async logRecipeRequest(
    userId: string,
    requestData: any,
    responseData?: any,
    gigachatUsage?: any,
  ): Promise<void> {
    try {
      await this.client.from("recipe_history").insert({
        user_id: userId,
        request_data: requestData,
        response_data: responseData || null,
        gigachat_usage: gigachatUsage || null,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error("❌ Error logging recipe request:", error);
    }
  }

  async getUserRecipeHistory(userId: string, limit = 20): Promise<any[]> {
    try {
      const { data, error } = await this.client
        .from("recipe_history")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("❌ Error fetching recipe history:", error);
      return [];
    }
  }

  // ============ СТАТИСТИКА ============

  async getUserStats(userId: string) {
    try {
      const [ingredientsCount, platesCount, recipeRequestsCount] =
        await Promise.all([
          this.client
            .from("user_ingredients")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId),
          this.client
            .from("saved_plates")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId),
          this.client
            .from("recipe_history")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId),
        ]);

      return {
        ingredients: ingredientsCount.count || 0,
        plates: platesCount.count || 0,
        recipeRequests: recipeRequestsCount.count || 0,
      };
    } catch (error) {
      console.error("❌ Error fetching user stats:", error);
      return null;
    }
  }
}

export const supabaseService = SupabaseService.getInstance();
