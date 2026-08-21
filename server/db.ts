import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  notificationPreferences,
  oddsSnapshots,
  predictionFavorites,
  predictionSelections,
  predictionTickets,
  ticketSelections,
  providerPredictions,
  pyramidPlans,
  pyramidSteps,
  sportsEvents,
  syncRuns,
  userNotifications,
  users,
} from "../drizzle/schema";
import { ENV } from './_core/env';
import { projectPyramidStep } from "./predictionMath";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

type EventUpsert = {
  providerEventId: number;
  sport: string;
  competitionId?: number | null;
  competitionName?: string | null;
  seasonId?: number | null;
  homeTeamId?: number | null;
  homeTeamName: string;
  awayTeamId?: number | null;
  awayTeamName: string;
  startsAt: Date;
  status: "upcoming" | "live" | "finished" | "cancelled" | "postponed" | "unresolved";
  homeScore?: number | null;
  awayScore?: number | null;
  halftimeHomeScore?: number | null;
  halftimeAwayScore?: number | null;
  hasXg?: boolean;
  rawPayload: unknown;
  sourceUpdatedAt?: Date | null;
};

export async function upsertSportsEvent(values: EventUpsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  await db.insert(sportsEvents).values(values).onDuplicateKeyUpdate({
    set: {
      ...values,
      updatedAt: new Date(),
    },
  });
  return (await db.select().from(sportsEvents).where(eq(sportsEvents.providerEventId, values.providerEventId)).limit(1))[0];
}

export async function upsertProviderPrediction(values: {
  providerPredictionId: number;
  eventId: number;
  modelVersion?: string | null;
  modelConfidence?: string | null;
  expectedHomeGoals?: string | null;
  expectedAwayGoals?: string | null;
  mostLikelyScore?: string | null;
  rawPayload: unknown;
  sourceUpdatedAt?: Date | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  await db.insert(providerPredictions).values(values).onDuplicateKeyUpdate({
    set: { ...values, updatedAt: new Date() },
  });
  return (await db.select().from(providerPredictions).where(eq(providerPredictions.providerPredictionId, values.providerPredictionId)).limit(1))[0];
}

export async function upsertPredictionSelection(values: {
  eventId: number;
  providerPredictionId?: number | null;
  market: string;
  outcome: string;
  label: string;
  predictedProbability: string;
  modelConfidence?: string | null;
  impliedProbability?: string | null;
  fairOdds?: string | null;
  currentOdds?: string | null;
  openingOdds?: string | null;
  expectedValue?: string | null;
  edge?: string | null;
  contextScore?: string | null;
  grade?: "A_PLUS" | "A" | "B" | "C" | "D" | "WATCH" | null;
  valueStatus: "positive" | "neutral" | "negative" | "unavailable";
  recommendationStatus: "recommended" | "watch" | "excluded";
  reasonCodes: string[];
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  await db.insert(predictionSelections).values(values).onDuplicateKeyUpdate({
    set: { ...values, updatedAt: new Date() },
  });
  return (await db.select().from(predictionSelections)
    .where(sql`${predictionSelections.eventId} = ${values.eventId} AND ${predictionSelections.market} = ${values.market} AND ${predictionSelections.outcome} = ${values.outcome}`)
    .limit(1))[0];
}

export async function recordOddsSnapshot(values: {
  eventId: number;
  market: string;
  outcome: string;
  bookmakerSlug: string;
  bookmakerName?: string | null;
  decimalOdds: string;
  previousDecimalOdds?: string | null;
  openingDecimalOdds?: string | null;
  movement?: "SHORTENING" | "DRIFTING" | null;
  observedAt: Date;
  openingAt?: Date | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(oddsSnapshots).values(values);
}

export async function startSyncRun(jobType: "daily_predictions" | "odds_delta" | "results_confirmation" | "explanations", scheduleCronTaskUid?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(syncRuns).values({ jobType, status: "started", scheduleCronTaskUid: scheduleCronTaskUid ?? null });
  return Number(result[0].insertId);
}

export async function completeSyncRun(id: number, status: "completed" | "partial" | "failed" | "skipped", summary: unknown, errorMessage?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(syncRuns).set({ status, summary, errorMessage: errorMessage ?? null, completedAt: new Date() }).where(eq(syncRuns.id, id));
}

export async function listDashboardPredictions() {
  const db = await getDb();
  if (!db) return [];

  return db.select({
    id: predictionSelections.id,
    market: predictionSelections.market,
    outcome: predictionSelections.outcome,
    label: predictionSelections.label,
    probability: predictionSelections.predictedProbability,
    confidence: predictionSelections.modelConfidence,
    fairOdds: predictionSelections.fairOdds,
    currentOdds: predictionSelections.currentOdds,
    openingOdds: predictionSelections.openingOdds,
    expectedValue: predictionSelections.expectedValue,
    edge: predictionSelections.edge,
    grade: predictionSelections.grade,
    valueStatus: predictionSelections.valueStatus,
    recommendationStatus: predictionSelections.recommendationStatus,
    settlementStatus: predictionSelections.settlementStatus,
    contextScore: predictionSelections.contextScore,
    consensusScore: predictionSelections.consensusScore,
    aiExplanation: predictionSelections.aiExplanation,
    reasonCodes: predictionSelections.reasonCodes,
    eventId: sportsEvents.id,
    sport: sportsEvents.sport,
    competitionId: sportsEvents.competitionId,
    competition: sportsEvents.competitionName,
    homeTeam: sportsEvents.homeTeamName,
    awayTeam: sportsEvents.awayTeamName,
    startsAt: sportsEvents.startsAt,
    eventStatus: sportsEvents.status,
  }).from(predictionSelections)
    .innerJoin(sportsEvents, eq(predictionSelections.eventId, sportsEvents.id))
    .orderBy(asc(sportsEvents.startsAt), desc(predictionSelections.expectedValue))
    .limit(160);
}

export async function getStatistics() {
  const db = await getDb();
  if (!db) return { total: 0, won: 0, lost: 0, pending: 0 };

  const result = await db.select({
    total: sql<number>`count(*)`,
    won: sql<number>`sum(case when ${predictionSelections.settlementStatus} = 'won' then 1 else 0 end)`,
    lost: sql<number>`sum(case when ${predictionSelections.settlementStatus} = 'lost' then 1 else 0 end)`,
    pending: sql<number>`sum(case when ${predictionSelections.settlementStatus} = 'pending' then 1 else 0 end)`,
  }).from(predictionSelections);
  const stats = result[0];
  return {
    total: Number(stats?.total ?? 0),
    won: Number(stats?.won ?? 0),
    lost: Number(stats?.lost ?? 0),
    pending: Number(stats?.pending ?? 0),
  };
}

export async function listFavoriteIds(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ selectionId: predictionFavorites.predictionSelectionId })
    .from(predictionFavorites)
    .where(eq(predictionFavorites.userId, userId));
  return rows.map(row => row.selectionId);
}

export async function toggleFavorite(userId: number, selectionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const current = await db.select().from(predictionFavorites)
    .where(sql`${predictionFavorites.userId} = ${userId} AND ${predictionFavorites.predictionSelectionId} = ${selectionId}`)
    .limit(1);
  if (current[0]) {
    await db.delete(predictionFavorites).where(eq(predictionFavorites.id, current[0].id));
    return false;
  }
  await db.insert(predictionFavorites).values({ userId, predictionSelectionId: selectionId });
  return true;
}

export async function ensureNotificationPreferences(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(notificationPreferences).values({ userId }).onDuplicateKeyUpdate({ set: { userId } });
  return (await db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId)).limit(1))[0];
}

export async function createPyramidPlan(input: {
  userId: number;
  title: string;
  baseStake: string;
  currentBankroll: string;
  targetOddsMin: string;
  targetOddsMax: string;
  reinvestRate: string;
  profitLockRate: string;
  maxSteps: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const created = await db.insert(pyramidPlans).values(input);
  const id = Number(created[0].insertId);
  await db.insert(pyramidSteps).values({ pyramidPlanId: id, stepNumber: 1, stake: input.baseStake, status: "active" });
  return (await db.select().from(pyramidPlans).where(eq(pyramidPlans.id, id)).limit(1))[0];
}

export async function listPyramidPlans(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pyramidPlans).where(eq(pyramidPlans.userId, userId)).orderBy(desc(pyramidPlans.updatedAt));
}

export async function listPyramidSteps(userId: number, pyramidPlanId: number) {
  const db = await getDb();
  if (!db) return [];
  const plan = (await db.select({ id: pyramidPlans.id }).from(pyramidPlans)
    .where(sql`${pyramidPlans.id} = ${pyramidPlanId} AND ${pyramidPlans.userId} = ${userId}`).limit(1))[0];
  if (!plan) return [];
  return db.select().from(pyramidSteps).where(eq(pyramidSteps.pyramidPlanId, plan.id)).orderBy(asc(pyramidSteps.stepNumber));
}

export async function attachTicketToActivePyramidStep(input: { userId: number; pyramidPlanId: number; ticketId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const plan = (await db.select().from(pyramidPlans)
    .where(sql`${pyramidPlans.id} = ${input.pyramidPlanId} AND ${pyramidPlans.userId} = ${input.userId} AND ${pyramidPlans.status} = 'active'`).limit(1))[0];
  if (!plan) throw new Error("Piramida activă nu a fost găsită.");
  const ticket = (await db.select().from(predictionTickets)
    .where(sql`${predictionTickets.id} = ${input.ticketId} AND ${predictionTickets.createdByUserId} = ${input.userId} AND ${predictionTickets.status} = 'published'`).limit(1))[0];
  if (!ticket) throw new Error("Biletul eligibil nu a fost găsit sau este deja decontat.");
  const ticketOdds = Number(ticket.totalOdds);
  if (ticketOdds < Number(plan.targetOddsMin) || ticketOdds > Number(plan.targetOddsMax)) {
    throw new Error("Cota biletului nu se încadrează în intervalul activ al piramidei.");
  }
  const activeStep = (await db.select().from(pyramidSteps)
    .where(sql`${pyramidSteps.pyramidPlanId} = ${plan.id} AND ${pyramidSteps.status} = 'active'`).limit(1))[0];
  if (!activeStep) throw new Error("Nu există un pas activ pentru această piramidă.");
  if (activeStep.ticketId) throw new Error("Pasul activ are deja un bilet asociat.");
  await db.update(pyramidSteps).set({ ticketId: ticket.id, resultNote: `Bilet acumulator #${ticket.id} asociat automat.` }).where(eq(pyramidSteps.id, activeStep.id));
  return { pyramidPlanId: plan.id, stepId: activeStep.id, ticketId: ticket.id };
}

export async function settlePyramidStep(input: {
  userId: number;
  pyramidPlanId: number;
  outcome: "won" | "lost" | "void";
  resultNote?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const plan = (await db.select().from(pyramidPlans)
    .where(sql`${pyramidPlans.id} = ${input.pyramidPlanId} AND ${pyramidPlans.userId} = ${input.userId}`).limit(1))[0];
  if (!plan) throw new Error("Planul de piramidă nu a fost găsit.");
  if (plan.status !== "active") throw new Error("Planul nu este activ.");
  const step = (await db.select().from(pyramidSteps)
    .where(sql`${pyramidSteps.pyramidPlanId} = ${plan.id} AND ${pyramidSteps.status} = 'active'`).limit(1))[0];
  if (!step) throw new Error("Nu există un pas activ de decontat.");

  const stake = Number(step.stake);
  const targetOdds = (Number(plan.targetOddsMin) + Number(plan.targetOddsMax)) / 2;
  const projectedReturn = stake * targetOdds;
  const profitLoss = input.outcome === "won" ? projectedReturn - stake : input.outcome === "lost" ? -stake : 0;
  const nextBankroll = Math.max(0, Number(plan.currentBankroll) + profitLoss);
  await db.update(pyramidSteps).set({
    status: input.outcome,
    projectedReturn: projectedReturn.toFixed(2),
    profitLoss: profitLoss.toFixed(2),
    resultNote: input.resultNote ?? null,
    settledAt: new Date(),
  }).where(eq(pyramidSteps.id, step.id));

  if (input.outcome === "won" && plan.currentStep < plan.maxSteps) {
    const nextStepNumber = plan.currentStep + 1;
    const projection = projectPyramidStep({
      baseStake: Number(plan.baseStake),
      currentBankroll: nextBankroll,
      initialBankroll: Number(plan.baseStake),
      reinvestRate: Number(plan.reinvestRate),
      profitLockRate: Number(plan.profitLockRate),
      currentStep: nextStepNumber,
      maxSteps: plan.maxSteps,
      targetOdds,
    });
    await db.insert(pyramidSteps).values({
      pyramidPlanId: plan.id,
      stepNumber: nextStepNumber,
      stake: projection.stake.toFixed(2),
      retainedProfit: projection.retainedProfit.toFixed(2),
      projectedReturn: projection.projectedReturn.toFixed(2),
      status: "active",
    });
    await db.update(pyramidPlans).set({ currentBankroll: nextBankroll.toFixed(2), currentStep: nextStepNumber }).where(eq(pyramidPlans.id, plan.id));
  } else {
    const status = input.outcome === "won" ? "completed" : input.outcome === "lost" ? "reset" : "paused";
    await db.update(pyramidPlans).set({ currentBankroll: nextBankroll.toFixed(2), status }).where(eq(pyramidPlans.id, plan.id));
  }
  return { outcome: input.outcome, profitLoss, currentBankroll: nextBankroll };
}

export async function updateSelectionExplanation(selectionId: number, explanation: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(predictionSelections)
    .set({ aiExplanation: explanation, aiExplanationUpdatedAt: new Date() })
    .where(eq(predictionSelections.id, selectionId));
}

export async function getSelectionExplanationInput(selectionId: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select({
    id: predictionSelections.id,
    label: predictionSelections.label,
    probability: predictionSelections.predictedProbability,
    confidence: predictionSelections.modelConfidence,
    currentOdds: predictionSelections.currentOdds,
    fairOdds: predictionSelections.fairOdds,
    edge: predictionSelections.edge,
    expectedValue: predictionSelections.expectedValue,
    reasonCodes: predictionSelections.reasonCodes,
    competition: sportsEvents.competitionName,
    homeTeam: sportsEvents.homeTeamName,
    awayTeam: sportsEvents.awayTeamName,
  }).from(predictionSelections).innerJoin(sportsEvents, eq(predictionSelections.eventId, sportsEvents.id))
    .where(eq(predictionSelections.id, selectionId)).limit(1))[0];
}

export async function notifyUsersAboutDailyPredictions(dateLabel: string, count: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const recipients = await db.select({ userId: users.id })
    .from(users)
    .innerJoin(notificationPreferences, eq(notificationPreferences.userId, users.id))
    .where(eq(notificationPreferences.dailyPredictions, true));
  const title = `Predicții noi · ${dateLabel}`;

  for (const recipient of recipients) {
    const existing = await db.select({ id: userNotifications.id }).from(userNotifications)
      .where(sql`${userNotifications.userId} = ${recipient.userId} AND ${userNotifications.title} = ${title}`)
      .limit(1);
    if (!existing[0]) {
      await db.insert(userNotifications).values({
        userId: recipient.userId,
        notificationType: "daily_predictions",
        title,
        content: `${count} selecții noi au fost sincronizate. Deschide tabloul de bord pentru context, cote și risc.`,
      });
    }
  }
  return recipients.length;
}

export async function listPendingSelectionsForEvent(eventId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(predictionSelections)
    .where(sql`${predictionSelections.eventId} = ${eventId} AND ${predictionSelections.settlementStatus} = 'pending'`);
}

export async function settlePredictionSelection(selectionId: number, status: "won" | "lost" | "void" | "cancelled") {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(predictionSelections).set({ settlementStatus: status, settledAt: new Date() }).where(eq(predictionSelections.id, selectionId));
  await settleTicketsForSelection(selectionId, status);
}

export async function notifyUsersAboutConfirmedResults(dateLabel: string, count: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const recipients = await db.select({ userId: users.id })
    .from(users)
    .innerJoin(notificationPreferences, eq(notificationPreferences.userId, users.id))
    .where(eq(notificationPreferences.resultsConfirmed, true));
  const title = `Rezultate confirmate · ${dateLabel}`;
  for (const recipient of recipients) {
    const existing = await db.select({ id: userNotifications.id }).from(userNotifications)
      .where(sql`${userNotifications.userId} = ${recipient.userId} AND ${userNotifications.title} = ${title}`)
      .limit(1);
    if (!existing[0]) await db.insert(userNotifications).values({
      userId: recipient.userId,
      notificationType: "results_confirmed",
      title,
      content: `${count} selecții au primit un rezultat verificat de API. Consultă pagina de performanță pentru istoricul actualizat.`,
    });
  }
  return recipients.length;
}

export async function listUserNotifications(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(userNotifications)
    .where(eq(userNotifications.userId, userId))
    .orderBy(desc(userNotifications.createdAt))
    .limit(limit);
}

export async function listRecentResults(limit = 120) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: predictionSelections.id,
    label: predictionSelections.label,
    market: predictionSelections.market,
    settlementStatus: predictionSelections.settlementStatus,
    currentOdds: predictionSelections.currentOdds,
    expectedValue: predictionSelections.expectedValue,
    settledAt: predictionSelections.settledAt,
    sport: sportsEvents.sport,
    competition: sportsEvents.competitionName,
    homeTeam: sportsEvents.homeTeamName,
    awayTeam: sportsEvents.awayTeamName,
    homeScore: sportsEvents.homeScore,
    awayScore: sportsEvents.awayScore,
  }).from(predictionSelections)
    .innerJoin(sportsEvents, eq(predictionSelections.eventId, sportsEvents.id))
    .where(sql`${predictionSelections.settlementStatus} IN ('won', 'lost', 'void', 'cancelled')`)
    .orderBy(desc(predictionSelections.settledAt))
    .limit(limit);
}

export async function getPerformanceBreakdown() {
  const rows = await listRecentResults(1000);
  const grouped = new Map<string, { sport: string; market: string; total: number; won: number; lost: number; voided: number; oddsTotal: number; oddsCount: number }>();
  for (const row of rows) {
    const key = `${row.sport}::${row.market}`;
    const current = grouped.get(key) ?? { sport: row.sport, market: row.market, total: 0, won: 0, lost: 0, voided: 0, oddsTotal: 0, oddsCount: 0 };
    current.total += 1;
    if (row.settlementStatus === "won") current.won += 1;
    if (row.settlementStatus === "lost") current.lost += 1;
    if (row.settlementStatus === "void" || row.settlementStatus === "cancelled") current.voided += 1;
    if (row.currentOdds) {
      current.oddsTotal += Number(row.currentOdds);
      current.oddsCount += 1;
    }
    grouped.set(key, current);
  }
  return Array.from(grouped.values()).map(item => ({
    ...item,
    winRate: item.won + item.lost ? Number(((item.won / (item.won + item.lost)) * 100).toFixed(1)) : null,
    avgOdds: item.oddsCount ? Number((item.oddsTotal / item.oddsCount).toFixed(2)) : null,
  })).sort((a, b) => b.total - a.total);
}

export async function createAccumulatorTicket(input: {
  userId: number;
  title: string;
  ticketType: "daily" | "long_run" | "custom";
  selectionIds: number[];
  stake: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const uniqueIds = Array.from(new Set(input.selectionIds));
  if (uniqueIds.length < 2 || uniqueIds.length > 4) throw new Error("Un acumulator trebuie să conțină între 2 și 4 selecții.");
  const selections = await db.select({
    id: predictionSelections.id,
    odds: predictionSelections.currentOdds,
    probability: predictionSelections.predictedProbability,
  }).from(predictionSelections).where(inArray(predictionSelections.id, uniqueIds));
  if (selections.length !== uniqueIds.length || selections.some(item => !item.odds)) throw new Error("Una sau mai multe selecții nu mai au o cotă disponibilă.");
  const totalOdds = selections.reduce((total, item) => total * Number(item.odds), 1);
  const combinedProbability = selections.reduce((total, item) => total * (Number(item.probability) / 100), 1) * 100;
  const expectedValue = ((combinedProbability / 100) * totalOdds - 1) * 100;
  const result = await db.insert(predictionTickets).values({
    createdByUserId: input.userId,
    title: input.title,
    ticketType: input.ticketType,
    totalOdds: totalOdds.toFixed(3),
    targetOdds: totalOdds.toFixed(3),
    combinedProbability: combinedProbability.toFixed(2),
    expectedValue: expectedValue.toFixed(4),
    stake: input.stake.toFixed(2),
    status: "published",
  });
  const ticketId = Number(result[0].insertId);
  await db.insert(ticketSelections).values(selections.map((selection, index) => ({
    ticketId,
    predictionSelectionId: selection.id,
    position: index + 1,
    oddsAtSelection: Number(selection.odds).toFixed(3),
  })));
  return (await db.select().from(predictionTickets).where(eq(predictionTickets.id, ticketId)).limit(1))[0];
}

export async function listAccumulatorTickets(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const tickets = await db.select().from(predictionTickets)
    .where(eq(predictionTickets.createdByUserId, userId)).orderBy(desc(predictionTickets.createdAt));
  return Promise.all(tickets.map(async ticket => ({
    ...ticket,
    selections: await db.select({
      id: ticketSelections.id,
      position: ticketSelections.position,
      oddsAtSelection: ticketSelections.oddsAtSelection,
      status: ticketSelections.status,
      label: predictionSelections.label,
      homeTeam: sportsEvents.homeTeamName,
      awayTeam: sportsEvents.awayTeamName,
      startsAt: sportsEvents.startsAt,
    }).from(ticketSelections)
      .innerJoin(predictionSelections, eq(ticketSelections.predictionSelectionId, predictionSelections.id))
      .innerJoin(sportsEvents, eq(predictionSelections.eventId, sportsEvents.id))
      .where(eq(ticketSelections.ticketId, ticket.id)).orderBy(asc(ticketSelections.position)),
  })));
}

async function settleTicketsForSelection(selectionId: number, selectionStatus: "won" | "lost" | "void" | "cancelled") {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const links = await db.select().from(ticketSelections).where(eq(ticketSelections.predictionSelectionId, selectionId));
  for (const link of links) {
    await db.update(ticketSelections).set({ status: selectionStatus }).where(eq(ticketSelections.id, link.id));
    const items = await db.select().from(ticketSelections).where(eq(ticketSelections.ticketId, link.ticketId));
    const ticket = (await db.select().from(predictionTickets).where(eq(predictionTickets.id, link.ticketId)).limit(1))[0];
    if (!ticket || !["published", "draft"].includes(ticket.status)) continue;
    const statuses = items.map(item => item.status);
    if (statuses.includes("lost")) {
      await db.update(predictionTickets).set({ status: "lost", profitLoss: (-Number(ticket.stake)).toFixed(2), settledAt: new Date() }).where(eq(predictionTickets.id, ticket.id));
      await settleLinkedPyramidStepsForTicket(ticket.id, "lost");
    } else if (statuses.every(item => item === "won")) {
      const profitLoss = Number(ticket.stake) * Number(ticket.totalOdds) - Number(ticket.stake);
      await db.update(predictionTickets).set({ status: "won", profitLoss: profitLoss.toFixed(2), settledAt: new Date() }).where(eq(predictionTickets.id, ticket.id));
      await settleLinkedPyramidStepsForTicket(ticket.id, "won");
    } else if (statuses.every(item => ["won", "void", "cancelled"].includes(item))) {
      await db.update(predictionTickets).set({ status: "void", profitLoss: "0.00", settledAt: new Date() }).where(eq(predictionTickets.id, ticket.id));
      await settleLinkedPyramidStepsForTicket(ticket.id, "void");
    }
  }
}

async function settleLinkedPyramidStepsForTicket(ticketId: number, outcome: "won" | "lost" | "void") {
  const db = await getDb();
  if (!db) return;
  const links = await db.select().from(pyramidSteps)
    .where(sql`${pyramidSteps.ticketId} = ${ticketId} AND ${pyramidSteps.status} = 'active'`);
  for (const step of links) {
    const plan = (await db.select().from(pyramidPlans).where(eq(pyramidPlans.id, step.pyramidPlanId)).limit(1))[0];
    if (!plan || plan.status !== "active") continue;
    await settlePyramidStep({
      userId: plan.userId,
      pyramidPlanId: plan.id,
      outcome,
      resultNote: `Decontat automat din biletul acumulator #${ticketId}.`,
    });
  }
}
