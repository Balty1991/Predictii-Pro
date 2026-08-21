import type { Request, Response } from "express";
import { notifyOwner } from "./_core/notification";
import { sdk } from "./_core/sdk";
import * as db from "./db";
import { synchronizePredictions } from "./predictionSyncService";
import { synchronizeResults } from "./resultSettlement";

export async function scheduledSportsRefresh(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });

    const [result, resultsSync] = await Promise.all([synchronizePredictions(new Date(), 3, 30, user.taskUid), synchronizeResults()]);
    const dateLabel = new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", timeZone: "Europe/Bucharest" }).format(new Date());
    const notifiedUsers = result.savedSelections > 0
      ? await db.notifyUsersAboutDailyPredictions(dateLabel, result.savedSelections)
      : 0;
    const resultRecipients = resultsSync.settled > 0
      ? await db.notifyUsersAboutConfirmedResults(dateLabel, resultsSync.settled)
      : 0;

    if (result.savedSelections > 0 || resultsSync.settled > 0) {
      await notifyOwner({
        title: "Predicții sincronizate",
        content: `${result.savedSelections} selecții noi și ${resultsSync.settled} rezultate au fost procesate; notificări în aplicație: ${notifiedUsers} pentru predicții, ${resultRecipients} pentru rezultate.`,
      });
    }
    return res.json({ ok: true, ...result, resultsSync, notifiedUsers, resultRecipients });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown scheduled refresh error";
    return res.status(500).json({ error: message, timestamp: new Date().toISOString() });
  }
}
