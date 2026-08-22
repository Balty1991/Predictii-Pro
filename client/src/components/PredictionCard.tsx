import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import React from "react";
import { Bot, CircleDot, Minus, Star, Target, TrendingDown, TrendingUp } from "lucide-react";
import { ContextFactorGrid } from "@/components/ContextFactorGrid";
import { SignalConsensusPanel } from "@/components/SignalConsensusPanel";
import { trpc } from "@/lib/trpc";
import { calculateOddsMovement } from "@shared/oddsMovement";
import { buildSignalConsensus } from "@shared/signalConsensus";

export type PredictionCardData = {
  id: number;
  label: string;
  probability: string;
  confidence: string | null;
  impliedProbability: string | null;
  fairOdds: string | null;
  currentOdds: string | null;
  openingOdds: string | null;
  expectedValue: string | null;
  edge: string | null;
  grade: "A_PLUS" | "A" | "B" | "C" | "D" | "WATCH" | null;
  valueStatus: "positive" | "neutral" | "negative" | "unavailable";
  recommendationStatus: "recommended" | "watch" | "excluded";
  contextScore: string | null;
  consensusScore?: string | null;
  aiExplanation: string | null;
  reasonCodes: unknown;
  competition: string | null;
  homeTeam: string;
  awayTeam: string;
  startsAt: Date;
  isFavorite: boolean;
};

const gradeClass: Record<NonNullable<PredictionCardData["grade"]>, string> = {
  A_PLUS: "bg-amber-300/15 text-amber-200 border-amber-300/30",
  A: "bg-emerald-300/15 text-emerald-200 border-emerald-300/30",
  B: "bg-sky-300/15 text-sky-200 border-sky-300/30",
  C: "bg-slate-300/10 text-slate-200 border-slate-300/20",
  D: "bg-orange-300/15 text-orange-200 border-orange-300/30",
  WATCH: "bg-rose-300/15 text-rose-200 border-rose-300/30",
};

function asNumber(value: string | null) {
  return value ? Number(value) : null;
}

export default function PredictionCard({ prediction, onToggleFavorite, onGenerateExplanation, explanationPending, explanationError, onDismissExplanationError }: { prediction: PredictionCardData; onToggleFavorite: (id: number) => void; onGenerateExplanation: (id: number) => void; explanationPending?: boolean; explanationError?: string; onDismissExplanationError?: () => void }) {
  const odds = asNumber(prediction.currentOdds);
  const openingOdds = asNumber(prediction.openingOdds);
  const ev = asNumber(prediction.expectedValue);
  const reasons = Array.isArray(prediction.reasonCodes) ? prediction.reasonCodes.filter((reason): reason is string => typeof reason === "string") : [];
  const isPositive = prediction.valueStatus === "positive";
  const consensus = buildSignalConsensus({ modelProbability: Number(prediction.probability), marketProbability: asNumber(prediction.impliedProbability), modelConfidence: asNumber(prediction.confidence), contextScore: asNumber(prediction.contextScore), recommended: prediction.recommendationStatus === "recommended" });
  const oddsHistory = trpc.predictions.oddsHistory.useQuery({ selectionId: prediction.id }, { enabled: odds !== null });
  const movement = calculateOddsMovement(odds, openingOdds);
  const snapshotCount = oddsHistory.data?.length ?? 0;

  return (
    <article className="relative overflow-hidden rounded-3xl border border-border/80 bg-card/85 p-5 shadow-[0_14px_50px_rgba(0,0,0,0.2)] backdrop-blur transition-transform duration-200 hover:-translate-y-0.5">
      <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-[5rem] bg-primary/8" />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">{prediction.competition ?? "Competiție"}</p>
          <h3 className="mt-2 text-lg font-semibold tracking-tight text-foreground">{prediction.homeTeam} <span className="text-muted-foreground">—</span> {prediction.awayTeam}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{prediction.startsAt.toLocaleString("ro-RO", { dateStyle: "medium", timeStyle: "short" })}</p>
        </div>
        <div className="flex items-center gap-2">
          {prediction.grade && <Badge variant="outline" className={gradeClass[prediction.grade]}>{prediction.grade.replace("_", "+")}</Badge>}
          <Button variant="ghost" size="icon" onClick={() => onToggleFavorite(prediction.id)} aria-label="Salvează selecția" className="rounded-full hover:bg-primary/10">
            <Star className={`h-4 w-4 ${prediction.isFavorite ? "fill-amber-300 text-amber-300" : "text-muted-foreground"}`} />
          </Button>
        </div>
      </div>

      <div className="relative mt-5 flex items-center justify-between rounded-2xl bg-secondary/70 px-4 py-3">
        <div>
          <p className="text-xs text-muted-foreground">Selecție</p>
          <p className="mt-0.5 font-semibold text-foreground">{prediction.label}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Cotă curentă</p>
          <p className="mt-0.5 text-xl font-bold text-foreground">{odds ? odds.toFixed(2) : "—"}</p>
        </div>
      </div>

      <div className="relative mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric label="Probabilitate" value={`${Number(prediction.probability).toFixed(1)}%`} />
        <Metric label="Cotă corectă" value={prediction.fairOdds ? Number(prediction.fairOdds).toFixed(2) : "—"} />
        <Metric label="Edge" value={prediction.edge ? `${Number(prediction.edge).toFixed(1)} pp` : "—"} accent={isPositive} />
        <Metric label="Consens" value={consensus ? `${consensus.score.toFixed(0)}%` : "—"} />
      </div>

      {ev !== null && (
        <div className={`relative mt-4 flex items-center gap-2 text-sm ${isPositive ? "text-emerald-300" : "text-muted-foreground"}`}>
          {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          <span>Valoare estimată: <strong>{ev > 0 ? "+" : ""}{ev.toFixed(1)}%</strong></span>
        </div>
      )}
      {prediction.valueStatus !== "positive" && <div className="relative mt-3 rounded-xl border border-amber-300/20 bg-amber-300/5 px-3 py-2 text-xs leading-5 text-amber-100">Avantajul estimat nu este pozitiv la prețul actual; selecția rămâne informativă și nu intră în acumulatorul automat.</div>}

      <SignalConsensusPanel modelProbability={Number(prediction.probability)} marketProbability={asNumber(prediction.impliedProbability)} modelConfidence={asNumber(prediction.confidence)} contextScore={asNumber(prediction.contextScore)} recommended={prediction.recommendationStatus === "recommended"} />

      {prediction.contextScore && <div className="relative mt-3 rounded-xl border border-border/60 bg-background/25 px-3 py-3"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">Context model</p><p className="mt-1 text-xs text-muted-foreground">Factori calculați exclusiv din semnalele disponibile.</p></div><p className="font-mono text-lg font-semibold text-foreground">{Number(prediction.contextScore).toFixed(0)}<span className="text-xs text-muted-foreground">/100</span></p></div><ContextFactorGrid reasonCodes={reasons} /><p className="mt-3 text-[11px] leading-5 text-muted-foreground">Forma, confruntările directe, lotul, antrenorii, arbitrul, deplasarea și condițiile sunt afișate numai când feedul le furnizează; scorul contextual contribuie cu 20% la consensul local.</p></div>}

      {movement && <div className={`relative mt-3 flex items-center gap-2 text-xs ${movement.direction === "shortening" ? "text-amber-200" : movement.direction === "drifting" ? "text-emerald-300" : "text-muted-foreground"}`}>{movement.direction === "shortening" ? <TrendingDown className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}<span>Deschidere {openingOdds?.toFixed(2)} → acum {odds?.toFixed(2)} · {movement.direction === "shortening" ? "scădere" : movement.direction === "drifting" ? "creștere" : "stabilă"} {Math.abs(movement.percentDelta).toFixed(1)}%{movement.direction === "shortening" && movement.percentDelta <= -5 ? " · avantajul s-a redus" : ""}</span></div>}

      {odds !== null && (oddsHistory.isLoading ? <div className="relative mt-4 rounded-xl border border-border/60 bg-background/25 px-3 py-2 text-xs text-muted-foreground">Se încarcă istoricul real al cotei…</div> : oddsHistory.isError ? <div className="relative mt-4 rounded-xl border border-amber-300/20 bg-amber-300/5 px-3 py-2 text-xs text-amber-100">Istoricul cotei nu este disponibil momentan. Prețul curent rămâne afișat separat.</div> : snapshotCount ? <div className="relative mt-4 rounded-2xl border border-border/70 bg-background/25 p-4"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.11em] text-primary"><CircleDot className="h-3.5 w-3.5" /> Monitor cotă</div><p className="text-[11px] text-muted-foreground">{snapshotCount} snapshoturi API</p></div><div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">{[...(oddsHistory.data ?? [])].reverse().slice(-4).map((snapshot, index) => <OddsSnapshotTile key={`${snapshot.observedAt.getTime()}-${index}`} snapshot={snapshot} />)}</div><p className="mt-3 text-[11px] text-muted-foreground">{snapshotCount === 1 ? "Primul reper este salvat; evoluția devine comparabilă după următorul snapshot." : "Shortening semnalează cotă în scădere, iar drifting cotă în creștere față de reperul anterior."}</p></div> : <div className="relative mt-4 rounded-xl border border-dashed border-border/70 px-3 py-2 text-xs text-muted-foreground">Monitorul de cote va afișa evoluția imediat ce furnizorul publică primul snapshot.</div>)}

      <div className="relative mt-4 rounded-2xl border border-border/70 bg-background/35 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.11em] text-primary"><Target className="h-3.5 w-3.5" /> Analiză AI</div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{prediction.aiExplanation ?? "Poți genera analiza AI direct aici; aceasta va folosi probabilitatea, cota și semnalele contextual disponibile pentru selecție."}</p>
        {explanationError && <AiExplanationFailure message={explanationError} onDismiss={onDismissExplanationError} />}
        {!prediction.aiExplanation && <Button size="sm" variant="outline" onClick={() => onGenerateExplanation(prediction.id)} disabled={explanationPending} className="mt-3 rounded-lg"><Bot className="mr-2 h-3.5 w-3.5" />{explanationPending ? "Generez…" : explanationError ? "Reîncearcă generarea AI" : "Generează explicația AI"}</Button>}
        {reasons.length > 0 && <p className="mt-3 text-xs leading-5 text-muted-foreground/85">{reasons.join(" · ")}</p>}
      </div>
    </article>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return <div className="rounded-xl border border-border/55 bg-background/30 px-3 py-2.5"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p><p className={`mt-1 text-sm font-semibold ${accent ? "text-emerald-300" : "text-foreground"}`}>{value}</p></div>;
}

export function AiExplanationFailure({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  return <div role="alert" className="mt-3 rounded-xl border border-amber-300/25 bg-amber-300/5 px-3 py-3 text-xs leading-5 text-amber-100"><p>{message}</p>{onDismiss && <Button size="sm" variant="ghost" onClick={onDismiss} className="mt-1 h-8 px-2 text-amber-100 hover:text-amber-50">Ascunde mesajul</Button>}</div>;
}

type OddsSnapshotTileData = {
  decimalOdds: string;
  previousDecimalOdds: string | null;
  openingDecimalOdds: string | null;
  movement: "SHORTENING" | "DRIFTING" | null;
  observedAt: Date;
  bookmakerName: string | null;
};

function OddsSnapshotTile({ snapshot }: { snapshot: OddsSnapshotTileData }) {
  const previousOdds = asNumber(snapshot.previousDecimalOdds);
  const movementFromPrices = calculateOddsMovement(Number(snapshot.decimalOdds), previousOdds);
  const direction = snapshot.movement === "SHORTENING" ? "shortening" : snapshot.movement === "DRIFTING" ? "drifting" : movementFromPrices?.direction ?? "flat";
  const tone = direction === "shortening" ? "text-amber-200 border-amber-300/20 bg-amber-300/5" : direction === "drifting" ? "text-emerald-300 border-emerald-300/20 bg-emerald-300/5" : "text-muted-foreground border-border/55 bg-card/60";
  const label = direction === "shortening" ? "Shortening" : direction === "drifting" ? "Drifting" : "Stabilă";
  const Icon = direction === "shortening" ? TrendingDown : direction === "drifting" ? TrendingUp : Minus;

  return <div className={`rounded-lg border px-3 py-2.5 ${tone}`}><div className="flex items-start justify-between gap-2"><div><p className="font-mono text-sm font-semibold text-foreground">{Number(snapshot.decimalOdds).toFixed(2)}</p><p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{snapshot.observedAt.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })} · {snapshot.bookmakerName ?? "Furnizor piață"}</p></div><span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide"><Icon className="h-3 w-3" />{label}</span></div>{movementFromPrices ? <p className="mt-2 text-[11px] text-muted-foreground">Față de precedent: {movementFromPrices.absoluteDelta > 0 ? "+" : ""}{movementFromPrices.absoluteDelta.toFixed(2)} ({movementFromPrices.percentDelta > 0 ? "+" : ""}{movementFromPrices.percentDelta.toFixed(1)}%)</p> : <p className="mt-2 text-[11px] text-muted-foreground">Reper inițial al pieței</p>}</div>;
}
