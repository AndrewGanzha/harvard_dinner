import request from "supertest";
import App from "../src/app";

jest.mock("../src/middleware/auth.middleware", () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { telegram_id: 100000001 };
    next();
  },
}));

jest.mock("../src/services/gigachat/gigachat.service", () => ({
  gigaChatService: {
    checkAvailability: async () => true,
    generateRecipe: async () => ({
      id: "recipe-id",
      title: "Тестовый рецепт",
      description: "Описание",
      cookingTime: 30,
      difficulty: "easy",
      ingredients: [
        { name: "Помидор", quantity: "1", category: "vegetable" },
      ],
      steps: ["Шаг 1"],
      nutritionalInfo: {
        calories: 100,
        proteins: 10,
        carbs: 10,
        fats: 5,
        fiber: 3,
      },
      plateAnalysis: "OK",
      tips: ["Совет"],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    }),
  },
}));

jest.mock("../src/services/postgres/postgres.service", () => ({
  postgresService: {
    logRecipeRequest: async () => undefined,
  },
}));

describe("Recipe API", () => {
  const app = new App();

  describe("POST /api/recipes/generate", () => {
    it("должен генерировать рецепт при валидных данных", async () => {
      const response = await request(app.app)
        .post("/api/recipes/generate")
        .set("Authorization", "Bearer test-token")
        .send({
          ingredients: [
            { name: "Помидор", category: "vegetable" },
            { name: "Огурец", category: "vegetable" },
            { name: "Куриная грудка", category: "protein" },
          ],
          userPrompt: "Сделай салат",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("title");
      expect(response.body.data).toHaveProperty("ingredients");
      expect(response.body.data).toHaveProperty("steps");
    });

    it("должен возвращать ошибку при невалидных данных", async () => {
      const response = await request(app.app)
        .post("/api/recipes/generate")
        .set("Authorization", "Bearer test-token")
        .send({
          ingredients: [],
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });
});
