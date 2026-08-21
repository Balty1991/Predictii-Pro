import {
  boolean,
  decimal,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  timezone: varchar("timezone", { length: 64 }).default("Europe/Bucharest").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const sportsEvents = mysqlTable(
  "sportsEvents",
  {
    id: int("id").autoincrement().primaryKey(),
    providerEventId: int("providerEventId").notNull(),
    sport: varchar("sport", { length: 32 }).notNull(),
    competitionId: int("competitionId"),
    competitionName: varchar("competitionName", { length: 180 }),
    seasonId: int("seasonId"),
    homeTeamId: int("homeTeamId"),
    homeTeamName: varchar("homeTeamName", { length: 160 }).notNull(),
    awayTeamId: int("awayTeamId"),
    awayTeamName: varchar("awayTeamName", { length: 160 }).notNull(),
    startsAt: timestamp("startsAt").notNull(),
    status: mysqlEnum("status", ["upcoming", "live", "finished", "cancelled", "postponed", "unresolved"])
      .default("upcoming")
      .notNull(),
    homeScore: int("homeScore"),
    awayScore: int("awayScore"),
    halftimeHomeScore: int("halftimeHomeScore"),
    halftimeAwayScore: int("halftimeAwayScore"),
    hasXg: boolean("hasXg").default(false).notNull(),
    rawPayload: json("rawPayload"),
    sourceUpdatedAt: timestamp("sourceUpdatedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("sports_events_provider_event_unique").on(table.providerEventId),
    index("sports_events_starts_at_idx").on(table.startsAt),
    index("sports_events_sport_status_idx").on(table.sport, table.status),
    index("sports_events_competition_idx").on(table.competitionId),
  ],
);

export const providerPredictions = mysqlTable(
  "providerPredictions",
  {
    id: int("id").autoincrement().primaryKey(),
    providerPredictionId: int("providerPredictionId").notNull(),
    eventId: int("eventId")
      .notNull()
      .references(() => sportsEvents.id, { onDelete: "cascade" }),
    modelVersion: varchar("modelVersion", { length: 64 }),
    modelConfidence: decimal("modelConfidence", { precision: 6, scale: 4 }),
    expectedHomeGoals: decimal("expectedHomeGoals", { precision: 5, scale: 2 }),
    expectedAwayGoals: decimal("expectedAwayGoals", { precision: 5, scale: 2 }),
    mostLikelyScore: varchar("mostLikelyScore", { length: 16 }),
    rawPayload: json("rawPayload").notNull(),
    sourceUpdatedAt: timestamp("sourceUpdatedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("provider_predictions_provider_unique").on(table.providerPredictionId),
    uniqueIndex("provider_predictions_event_unique").on(table.eventId),
  ],
);

export const predictionSelections = mysqlTable(
  "predictionSelections",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("eventId")
      .notNull()
      .references(() => sportsEvents.id, { onDelete: "cascade" }),
    providerPredictionId: int("providerPredictionId").references(() => providerPredictions.id, { onDelete: "set null" }),
    market: varchar("market", { length: 64 }).notNull(),
    outcome: varchar("outcome", { length: 64 }).notNull(),
    label: varchar("label", { length: 180 }).notNull(),
    predictedProbability: decimal("predictedProbability", { precision: 5, scale: 2 }).notNull(),
    modelConfidence: decimal("modelConfidence", { precision: 6, scale: 4 }),
    impliedProbability: decimal("impliedProbability", { precision: 5, scale: 2 }),
    fairOdds: decimal("fairOdds", { precision: 7, scale: 3 }),
    currentOdds: decimal("currentOdds", { precision: 7, scale: 3 }),
    openingOdds: decimal("openingOdds", { precision: 7, scale: 3 }),
    expectedValue: decimal("expectedValue", { precision: 7, scale: 4 }),
    edge: decimal("edge", { precision: 6, scale: 2 }),
    contextScore: decimal("contextScore", { precision: 5, scale: 2 }),
    consensusScore: decimal("consensusScore", { precision: 5, scale: 2 }),
    grade: mysqlEnum("grade", ["A_PLUS", "A", "B", "C", "D", "WATCH"]),
    valueStatus: mysqlEnum("valueStatus", ["positive", "neutral", "negative", "unavailable"])
      .default("unavailable")
      .notNull(),
    recommendationStatus: mysqlEnum("recommendationStatus", ["recommended", "watch", "excluded"])
      .default("watch")
      .notNull(),
    settlementStatus: mysqlEnum("settlementStatus", ["pending", "won", "lost", "void", "cancelled"])
      .default("pending")
      .notNull(),
    settledAt: timestamp("settledAt"),
    aiExplanation: text("aiExplanation"),
    aiExplanationUpdatedAt: timestamp("aiExplanationUpdatedAt"),
    reasonCodes: json("reasonCodes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("prediction_selection_event_market_outcome_unique").on(table.eventId, table.market, table.outcome),
    index("prediction_selection_recommendation_idx").on(table.recommendationStatus, table.grade),
    index("prediction_selection_settlement_idx").on(table.settlementStatus),
    index("prediction_selection_event_idx").on(table.eventId),
  ],
);

export const oddsSnapshots = mysqlTable(
  "oddsSnapshots",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("eventId")
      .notNull()
      .references(() => sportsEvents.id, { onDelete: "cascade" }),
    market: varchar("market", { length: 64 }).notNull(),
    outcome: varchar("outcome", { length: 64 }).notNull(),
    bookmakerSlug: varchar("bookmakerSlug", { length: 80 }).notNull(),
    bookmakerName: varchar("bookmakerName", { length: 120 }),
    decimalOdds: decimal("decimalOdds", { precision: 7, scale: 3 }).notNull(),
    previousDecimalOdds: decimal("previousDecimalOdds", { precision: 7, scale: 3 }),
    openingDecimalOdds: decimal("openingDecimalOdds", { precision: 7, scale: 3 }),
    movement: mysqlEnum("movement", ["SHORTENING", "DRIFTING"]),
    observedAt: timestamp("observedAt").notNull(),
    openingAt: timestamp("openingAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("odds_snapshot_event_market_idx").on(table.eventId, table.market, table.outcome),
    index("odds_snapshot_observed_idx").on(table.observedAt),
  ],
);

export const predictionFavorites = mysqlTable(
  "predictionFavorites",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    predictionSelectionId: int("predictionSelectionId")
      .notNull()
      .references(() => predictionSelections.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [uniqueIndex("prediction_favorite_user_selection_unique").on(table.userId, table.predictionSelectionId)],
);

export const predictionTickets = mysqlTable(
  "predictionTickets",
  {
    id: int("id").autoincrement().primaryKey(),
    createdByUserId: int("createdByUserId").references(() => users.id, { onDelete: "set null" }),
    title: varchar("title", { length: 160 }).notNull(),
    ticketType: mysqlEnum("ticketType", ["daily", "long_run", "custom", "pyramid"])
      .default("daily")
      .notNull(),
    targetOdds: decimal("targetOdds", { precision: 7, scale: 3 }),
    totalOdds: decimal("totalOdds", { precision: 8, scale: 3 }).notNull(),
    combinedProbability: decimal("combinedProbability", { precision: 6, scale: 2 }),
    expectedValue: decimal("expectedValue", { precision: 7, scale: 4 }),
    riskLevel: mysqlEnum("riskLevel", ["conservative", "balanced", "growth", "aggressive"])
      .default("balanced")
      .notNull(),
    status: mysqlEnum("status", ["draft", "published", "won", "lost", "void", "cancelled"])
      .default("draft")
      .notNull(),
    startsAt: timestamp("startsAt"),
    settledAt: timestamp("settledAt"),
    strategyMetadata: json("strategyMetadata"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("prediction_tickets_status_idx").on(table.status, table.ticketType),
    index("prediction_tickets_creator_idx").on(table.createdByUserId),
  ],
);

export const ticketSelections = mysqlTable(
  "ticketSelections",
  {
    id: int("id").autoincrement().primaryKey(),
    ticketId: int("ticketId")
      .notNull()
      .references(() => predictionTickets.id, { onDelete: "cascade" }),
    predictionSelectionId: int("predictionSelectionId")
      .notNull()
      .references(() => predictionSelections.id, { onDelete: "restrict" }),
    position: int("position").notNull(),
    oddsAtSelection: decimal("oddsAtSelection", { precision: 7, scale: 3 }).notNull(),
    status: mysqlEnum("status", ["pending", "won", "lost", "void", "cancelled"])
      .default("pending")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("ticket_selection_position_unique").on(table.ticketId, table.position),
    uniqueIndex("ticket_selection_item_unique").on(table.ticketId, table.predictionSelectionId),
  ],
);

export const pyramidPlans = mysqlTable(
  "pyramidPlans",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 120 }).notNull(),
    status: mysqlEnum("status", ["active", "completed", "reset", "paused"])
      .default("active")
      .notNull(),
    baseStake: decimal("baseStake", { precision: 10, scale: 2 }).notNull(),
    currentBankroll: decimal("currentBankroll", { precision: 10, scale: 2 }).notNull(),
    targetOddsMin: decimal("targetOddsMin", { precision: 6, scale: 3 }).notNull(),
    targetOddsMax: decimal("targetOddsMax", { precision: 6, scale: 3 }).notNull(),
    reinvestRate: decimal("reinvestRate", { precision: 5, scale: 4 }).notNull(),
    profitLockRate: decimal("profitLockRate", { precision: 5, scale: 4 }).default("0.0000").notNull(),
    maxSteps: int("maxSteps").notNull(),
    currentStep: int("currentStep").default(1).notNull(),
    configuration: json("configuration"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("pyramid_plan_user_status_idx").on(table.userId, table.status)],
);

export const pyramidSteps = mysqlTable(
  "pyramidSteps",
  {
    id: int("id").autoincrement().primaryKey(),
    pyramidPlanId: int("pyramidPlanId")
      .notNull()
      .references(() => pyramidPlans.id, { onDelete: "cascade" }),
    ticketId: int("ticketId").references(() => predictionTickets.id, { onDelete: "set null" }),
    stepNumber: int("stepNumber").notNull(),
    stake: decimal("stake", { precision: 10, scale: 2 }).notNull(),
    retainedProfit: decimal("retainedProfit", { precision: 10, scale: 2 }).default("0.00").notNull(),
    projectedReturn: decimal("projectedReturn", { precision: 10, scale: 2 }),
    status: mysqlEnum("status", ["planned", "active", "won", "lost", "void", "skipped"])
      .default("planned")
      .notNull(),
    settledAt: timestamp("settledAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("pyramid_step_number_unique").on(table.pyramidPlanId, table.stepNumber),
    index("pyramid_step_status_idx").on(table.status),
  ],
);

export const notificationPreferences = mysqlTable(
  "notificationPreferences",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    dailyPredictions: boolean("dailyPredictions").default(true).notNull(),
    resultsConfirmed: boolean("resultsConfirmed").default(true).notNull(),
    oddsMovement: boolean("oddsMovement").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("notification_preferences_user_unique").on(table.userId)],
);

export const userNotifications = mysqlTable(
  "userNotifications",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    notificationType: mysqlEnum("notificationType", ["daily_predictions", "results_confirmed", "odds_movement", "system"])
      .notNull(),
    title: varchar("title", { length: 160 }).notNull(),
    content: text("content").notNull(),
    destination: varchar("destination", { length: 512 }),
    readAt: timestamp("readAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("user_notifications_user_read_idx").on(table.userId, table.readAt)],
);

export const syncRuns = mysqlTable(
  "syncRuns",
  {
    id: int("id").autoincrement().primaryKey(),
    jobType: mysqlEnum("jobType", ["daily_predictions", "odds_delta", "results_confirmation", "explanations"])
      .notNull(),
    status: mysqlEnum("status", ["started", "completed", "partial", "failed", "skipped"])
      .default("started")
      .notNull(),
    scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }),
    cursorValue: varchar("cursorValue", { length: 128 }),
    summary: json("summary"),
    errorMessage: text("errorMessage"),
    startedAt: timestamp("startedAt").defaultNow().notNull(),
    completedAt: timestamp("completedAt"),
  },
  table => [
    index("sync_runs_job_status_idx").on(table.jobType, table.status),
    index("sync_runs_cron_uid_idx").on(table.scheduleCronTaskUid),
  ],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type SportsEvent = typeof sportsEvents.$inferSelect;
export type PredictionSelection = typeof predictionSelections.$inferSelect;
export type PredictionTicket = typeof predictionTickets.$inferSelect;
export type PyramidPlan = typeof pyramidPlans.$inferSelect;
