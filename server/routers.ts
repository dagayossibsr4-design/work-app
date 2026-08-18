import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
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

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  garmin: router({
    status: protectedProcedure.query(({ ctx }) => getGarminStatus(ctx.user.id)),
    beginConnection: protectedProcedure.mutation(({ ctx }) =>
      beginGarminConnection(ctx.user.id),
    ),
    syncNow: protectedProcedure.mutation(({ ctx }) => requestGarminSync(ctx.user.id)),
    disconnect: protectedProcedure.mutation(({ ctx }) => disconnectGarmin(ctx.user.id)),
  }),
  foodLabel: publicProcedure.input(z.object({ imageDataUrl: z.string().startsWith("data:image/").max(12_000_000) })).mutation(async ({ input }) => {
    const response = await invokeLLM({
      model: "gemini-3-flash-preview",
      messages: [
        { role: "system", content: "חלץ תווית תזונתית מתמונה. החזר JSON בלבד. אין להמציא ערכים; אם ערך אינו קריא החזר 0 והוסף confidence נמוך. כל הערכים הם ל־100 גרם או למנה כפי שמופיע בתווית, והמר ל־100 גרם רק אם נתוני גודל המנה ברורים." },
        { role: "user", content: [{ type: "text", text: "חלץ שם מוצר, מותג, קלוריות, חלבון, פחמימות ושומן. החזר גם servingGrams, confidence והערת אימות בעברית." }, { type: "image_url", image_url: { url: input.imageDataUrl, detail: "high" } }] },
      ],
      response_format: { type: "json_schema", json_schema: { name: "food_label", strict: true, schema: { type: "object", properties: { name: { type: "string" }, brand: { type: "string" }, calories: { type: "number" }, protein: { type: "number" }, carbohydrates: { type: "number" }, fats: { type: "number" }, servingGrams: { type: "number" }, confidence: { type: "number" }, note: { type: "string" } }, required: ["name", "brand", "calories", "protein", "carbohydrates", "fats", "servingGrams", "confidence", "note"], additionalProperties: false } } },
    });
    const content = response.choices[0]?.message?.content;
    const text = typeof content === "string" ? content : Array.isArray(content) ? content.filter((part) => part.type === "text").map((part) => part.text).join("\n") : "";
    return JSON.parse(text) as { name: string; brand: string; calories: number; protein: number; carbohydrates: number; fats: number; servingGrams: number; confidence: number; note: string };
  }),
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
