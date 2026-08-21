import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import * as db from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { buildAccumulator, projectPyramidStep } from "./predictionMath";
import { generatePredictionExplanation } from "./predictionExplanation";
import { synchronizePredictions } from "./predictionSyncService";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  predictions: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const [predictions, favoriteIds] = await Promise.all([
        db.listDashboardPredictions(),
        db.listFavoriteIds(ctx.user.id),
      ]);
      const favorites = new Set(favoriteIds);
      return predictions.map(prediction => ({ ...prediction, isFavorite: favorites.has(prediction.id) }));
    }),
    statistics: protectedProcedure.query(() => db.getStatistics()),
    refresh: adminProcedure.mutation(() => synchronizePredictions()),
    explain: protectedProcedure.input(z.object({ selectionId: z.number().int().positive() })).mutation(async ({ input }) => {
      const selection = await db.getSelectionExplanationInput(input.selectionId);
      if (!selection) throw new Error("Selecția nu a fost găsită.");
      const explanation = await generatePredictionExplanation({
        fixture: `${selection.homeTeam} – ${selection.awayTeam}`,
        competition: selection.competition,
        marketLabel: selection.label,
        probability: Number(selection.probability),
        confidence: selection.confidence ? Number(selection.confidence) : null,
        currentOdds: selection.currentOdds ? Number(selection.currentOdds) : null,
        fairOdds: selection.fairOdds ? Number(selection.fairOdds) : null,
        edge: selection.edge ? Number(selection.edge) : null,
        expectedValue: selection.expectedValue ? Number(selection.expectedValue) : null,
        reasons: Array.isArray(selection.reasonCodes) ? selection.reasonCodes.filter((item): item is string => typeof item === "string") : [],
      });
      if (!explanation) throw new Error("Explicația AI nu este disponibilă momentan.");
      await db.updateSelectionExplanation(selection.id, explanation);
      return { explanation };
    }),
  }),
  favorites: router({
    toggle: protectedProcedure.input(z.object({ selectionId: z.number().int().positive() }))
      .mutation(({ ctx, input }) => db.toggleFavorite(ctx.user.id, input.selectionId)),
  }),
  tickets: router({
    suggest: protectedProcedure.input(z.object({
      targetOddsMin: z.number().min(1.05).max(10),
      targetOddsMax: z.number().min(1.06).max(20),
      maxSelections: z.number().int().min(1).max(4).default(4),
      horizonDays: z.number().int().min(1).max(14).default(1),
    }).refine(input => input.targetOddsMax >= input.targetOddsMin, { message: "Interval de cote invalid" }))
      .query(async ({ input }) => {
        const predictions = await db.listDashboardPredictions();
        const now = new Date();
        const cutoff = new Date(now);
        cutoff.setUTCDate(cutoff.getUTCDate() + input.horizonDays);
        return buildAccumulator(
          predictions
            .filter(prediction => prediction.eventStatus === "upcoming" && prediction.currentOdds && prediction.recommendationStatus === "recommended" && prediction.startsAt >= now && prediction.startsAt <= cutoff)
            .map(prediction => ({
              id: prediction.id,
              eventId: prediction.eventId,
              competitionId: prediction.competitionId,
              odds: Number(prediction.currentOdds),
              openingOdds: prediction.openingOdds ? Number(prediction.openingOdds) : null,
              probability: Number(prediction.probability),
              contextScore: prediction.contextScore ? Number(prediction.contextScore) : null,
              confidence: prediction.confidence ? Number(prediction.confidence) : null,
            })),
          input.targetOddsMin,
          input.targetOddsMax,
          input.maxSelections,
        );
      }),
  }),
  pyramids: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const plans = await db.listPyramidPlans(ctx.user.id);
      return plans.map(plan => ({
        ...plan,
        projection: projectPyramidStep({
          baseStake: Number(plan.baseStake),
          currentBankroll: Number(plan.currentBankroll),
          initialBankroll: Number(plan.baseStake),
          reinvestRate: Number(plan.reinvestRate),
          profitLockRate: Number(plan.profitLockRate),
          currentStep: plan.currentStep,
          maxSteps: plan.maxSteps,
          targetOdds: (Number(plan.targetOddsMin) + Number(plan.targetOddsMax)) / 2,
        }),
      }));
    }),
    create: protectedProcedure.input(z.object({
      title: z.string().min(2).max(120),
      baseStake: z.number().positive().max(100000),
      targetOddsMin: z.number().min(1.05).max(10),
      targetOddsMax: z.number().min(1.06).max(20),
      reinvestRate: z.number().min(0.05).max(1),
      profitLockRate: z.number().min(0).max(0.9),
      maxSteps: z.number().int().min(1).max(31),
    }).refine(input => input.targetOddsMax >= input.targetOddsMin, { message: "Interval de cote invalid" }))
      .mutation(({ ctx, input }) => db.createPyramidPlan({
        userId: ctx.user.id,
        title: input.title,
        baseStake: input.baseStake.toFixed(2),
        currentBankroll: input.baseStake.toFixed(2),
        targetOddsMin: input.targetOddsMin.toFixed(3),
        targetOddsMax: input.targetOddsMax.toFixed(3),
        reinvestRate: input.reinvestRate.toFixed(4),
        profitLockRate: input.profitLockRate.toFixed(4),
        maxSteps: input.maxSteps,
      })),
  }),
  profile: router({
    notificationPreferences: protectedProcedure.query(({ ctx }) => db.ensureNotificationPreferences(ctx.user.id)),
  }),
  results: router({
    history: protectedProcedure.query(() => db.listRecentResults()),
    breakdown: protectedProcedure.query(() => db.getPerformanceBreakdown()),
  }),
  notifications: router({
    list: protectedProcedure.query(({ ctx }) => db.listUserNotifications(ctx.user.id)),
  }),
});

export type AppRouter = typeof appRouter;
