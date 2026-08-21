import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, Star, Target, TrendingDown, TrendingUp } from "lucide-react";

export type PredictionCardData = {
  id: number;
  label: string;
  probability: string;
  confidence: string | null;
  fairOdds: string | null;
  currentOdds: string | null;
  openingOdds: string | null;
  expectedValue: string | null;
  edge: string | null;
  grade: "A_PLUS" | "A" | "B" | "C" | "D" | "WATCH" | null;
  valueStatus: "positive" | "neutral" | "negative" | "unavailable";
  recommendationStatus: "recommended" | "watch" | "excluded";
  contextScore: string | null;
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

export default function PredictionCard({ prediction, onToggleFavorite, onGenerateExplanation, explanationPending }: { prediction: PredictionCardData; onToggleFavorite: (id: number) => void; onGenerateExplanation: (id: number) => void; explanationPending?: boolean }) {
  const odds = asNumber(prediction.currentOdds);
  const openingOdds = asNumber(prediction.openingOdds);
  const ev = asNumber(prediction.expectedValue);
  const reasons = Array.isArray(prediction.reasonCodes) ? prediction.reasonCodes.filter((reason): reason is string => typeof reason === "string") : [];
  const isPositive = prediction.valueStatus === "positive";

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

      <div className="relative mt-4 grid grid-cols-3 gap-2">
        <Metric label="Probabilitate" value={`${Number(prediction.probability).toFixed(1)}%`} />
        <Metric label="Cotă corectă" value={prediction.fairOdds ? Number(prediction.fairOdds).toFixed(2) : "—"} />
        <Metric label="Edge" value={prediction.edge ? `${Number(prediction.edge).toFixed(1)} pp` : "—"} accent={isPositive} />
      </div>

      {ev !== null && (
        <div className={`relative mt-4 flex items-center gap-2 text-sm ${isPositive ? "text-emerald-300" : "text-muted-foreground"}`}>
          {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          <span>Valoare estimată: <strong>{ev > 0 ? "+" : ""}{ev.toFixed(1)}%</strong></span>
        </div>
      )}
      {prediction.valueStatus !== "positive" && <div className="relative mt-3 rounded-xl border border-amber-300/20 bg-amber-300/5 px-3 py-2 text-xs leading-5 text-amber-100">Avantajul estimat nu este pozitiv la prețul actual; selecția rămâne informativă și nu intră în acumulatorul automat.</div>}

      {odds !== null && openingOdds !== null && <div className={`relative mt-3 flex items-center gap-2 text-xs ${odds < openingOdds * 0.95 ? "text-amber-200" : "text-muted-foreground"}`}><TrendingDown className="h-3.5 w-3.5" /><span>Cotă la deschidere {openingOdds.toFixed(2)} → acum {odds.toFixed(2)}{odds < openingOdds * 0.95 ? " · avantajul s-a redus" : ""}</span></div>}

      <div className="relative mt-4 rounded-2xl border border-border/70 bg-background/35 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.11em] text-primary"><Target className="h-3.5 w-3.5" /> Analiză AI</div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{prediction.aiExplanation ?? "Poți genera analiza AI direct aici; aceasta va folosi probabilitatea, cota și semnalele contextual disponibile pentru selecție."}</p>
        {!prediction.aiExplanation && <Button size="sm" variant="outline" onClick={() => onGenerateExplanation(prediction.id)} disabled={explanationPending} className="mt-3 rounded-lg"><Bot className="mr-2 h-3.5 w-3.5" />{explanationPending ? "Generez…" : "Generează explicația AI"}</Button>}
        {reasons.length > 0 && <p className="mt-3 text-xs leading-5 text-muted-foreground/85">{reasons.join(" · ")}</p>}
      </div>
    </article>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return <div className="rounded-xl border border-border/55 bg-background/30 px-3 py-2.5"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p><p className={`mt-1 text-sm font-semibold ${accent ? "text-emerald-300" : "text-foreground"}`}>{value}</p></div>;
}
