import { synchronizePredictions } from "../server/predictionSyncService.ts";

const result = await synchronizePredictions(new Date(), 2, 12, 2);
console.log(JSON.stringify(result));
