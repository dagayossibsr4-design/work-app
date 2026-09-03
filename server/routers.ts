import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { getUserAppState, saveUserAppState } from "./db";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { z } from "zod";
import {
  beginGarminConnection,
  disconnectGarmin,
  getGarminStatus,
  requestGarminSync,
} from "./integrations/garmin/routes";

const numericValue = (fallback: number, positive = false) => z.preprocess(
  (value) => typeof value === "string" ? Number(value.replace(",", ".")) : value,
  positive ? z.number().finite().positive().default(fallback) : z.number().finite().nonnegative().default(fallback),
);

const foodLabelResultSchema = z.object({
  name: z.string().default(""),
  brand: z.string().default(""),
  calories: numericValue(0),
  protein: numericValue(0),
  carbohydrates: numericValue(0),
  fats: numericValue(0),
  servingGrams: numericValue(100, true),
  confidence: z.preprocess((value) => typeof value === "string" ? Number(value) : value, z.number().finite().min(0).max(1).default(0)),
  note: z.string().default("יש לאמת את הערכים מול אריזת המוצר."),
});

type FoodLabelResult = z.infer<typeof foodLabelResultSchema>;

const parseFoodLabelResponse = (content: unknown): FoodLabelResult => {
  const text = typeof content === "string"
    ? content
    : Array.isArray(content)
      ? content.map((part) => {
          if (typeof part === "string") return part;
          if (part && typeof part === "object" && "text" in part && typeof part.text === "string") return part.text;
          return "";
        }).filter(Boolean).join("\n")
      : content && typeof content === "object" && "text" in content && typeof content.text === "string"
        ? content.text
        : "";
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  if (!cleaned) throw new Error("חילוץ התווית החזיר תשובה ריקה");
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("חילוץ התווית החזיר JSON לא תקין");
    parsed = JSON.parse(cleaned.slice(start, end + 1));
  }
  return foodLabelResultSchema.parse(parsed);
};

export const appRouter = router({
  system: systemRouter,
  garmin: router({
    status: protectedProcedure.query(({ ctx }) => getGarminStatus(ctx.user.id)),
    beginConnection: protectedProcedure.mutation(({ ctx }) => beginGarminConnection(ctx.user.id)),
    syncNow: protectedProcedure.mutation(({ ctx }) => requestGarminSync(ctx.user.id)),
    disconnect: protectedProcedure.mutation(({ ctx }) => disconnectGarmin(ctx.user.id)),
  }),
  barcodeLookup: publicProcedure
    .input(z.object({ barcode: z.string().trim().regex(/^[0-9A-Za-z-]{6,32}$/) }))
    .mutation(async ({ input }) => {
      const barcode = input.barcode.replace(/[-\s]/g, "");
      const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=code,product_name,brands,nutriments,serving_size`, {
        headers: { "User-Agent": "ProLifto/1.0 (nutrition barcode lookup)" },
      });
      if (!response.ok) throw new Error(`Open Food Facts lookup failed: ${response.status}`);
      const payload = await response.json() as {
        status?: number;
        product?: {
          product_name?: string;
          brands?: string;
          serving_size?: string;
          nutriments?: Record<string, number | string | undefined>;
        };
      };
      if (payload.status !== 1 || !payload.product) return { found: false as const, barcode };
      const nutriments = payload.product.nutriments ?? {};
      const toNumber = (value: number | string | undefined) => {
        const parsed = typeof value === "number" ? value : Number(String(value ?? "").replace(",", "."));
        return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
      };
      return {
        found: true as const,
        barcode,
        name: payload.product.product_name ?? "",
        brand: payload.product.brands ?? "",
        servingSize: payload.product.serving_size ?? "",
        calories: toNumber(nutriments["energy-kcal_100g"]),
        protein: toNumber(nutriments["proteins_100g"]),
        carbohydrates: toNumber(nutriments["carbohydrates_100g"]),
        fats: toNumber(nutriments["fat_100g"]),
      };
    }),
  foodLabel: publicProcedure
    .input(z.object({ imageDataUrl: z.string().startsWith("data:image/").max(8_000_000) }))
    .mutation(async ({ input }) => {
      const response = await invokeLLM({
        model: "gpt-4o-mini",
        maxTokens: 4096,
        messages: [
          {
            role: "system",
            content: "חלץ תווית תזונתית מתמונה. החזר JSON בלבד. חובה לחלץ תמיד את הערכים מטור ה־100 גרם (או 100 מ\"ל). אם בתווית יש רק ערכים למנה, בצע המרה מתמטית מדויקת ל־100 גרם לפי משקל המנה. כל הערכים המספריים חייבים לייצג בדיוק 100 גרם מוצר. אין להמציא נתונים; אם ערך אינו קריא החזר 0."
          },
          {
            role: "user",
            content: [
              { type: "text", text: "חלץ שם מוצר, מותג, קלוריות, חלבון, פחמימות ושומן ל־100 גרם. קבע servingGrams כ-100, הוסף confidence והערת אימות קצרה בעברית." },
              { type: "image_url", image_url: { url: input.imageDataUrl, detail: "high" } }
            ]
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "food_label",
            strict: true,
            schema: {
              type: "object",
              properties: {
                name: { type: "string" },
                brand: { type: "string" },
                calories: { type: "number" },
                protein: { type: "number" },
                carbohydrates: { type: "number" },
                fats: { type: "number" },
                servingGrams: { type: "number" },
                confidence: { type: "number" },
                note: { type: "string" },
              },
              required: ["name", "brand", "calories", "protein", "carbohydrates", "fats", "servingGrams", "confidence", "note"],
              additionalProperties: false,
            },
          },
        },
      });
      const content = response.choices?.[0]?.message?.content;
      if (!content) throw new Error("חילוץ התווית לא החזיר תוכן");
      return parseFoodLabelResponse(content);
    }),
  appState: router({
    get: protectedProcedure.query(({ ctx }) => getUserAppState(ctx.user.id)),
    save: protectedProcedure.input(z.object({ payload: z.record(z.string(), z.unknown()) })).mutation(({ ctx, input }) => saveUserAppState(ctx.user.id, input.payload)),
  }),
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
});

export type AppRouter = typeof appRouter;