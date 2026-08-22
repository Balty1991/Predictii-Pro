import DashboardLayout from "@/components/DashboardLayout";
import PredictionCard, { type PredictionCardData } from "@/components/PredictionCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getSafeSportsSyncError } from "@shared/syncError";
import { BarChart3, ChevronDown, ChevronUp, CircleAlert, Clock3, Filter, RefreshCw, Sparkles, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type DashboardPrediction = PredictionCardData & {
  eventId: number;
  sport: string;
  eventStatus: string;
  competitionId: number | null;
};

type EventDecision = {
  eventId: number;
  primary: DashboardPrediction;
  selections: DashboardPrediction[];
};

export default function Dashboard() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [qualityFilter, setQualityFilter] = useState<"all" | "recommended" | "value" | "favorites">("all");
  const [sportFilter, setSportFilter] = useState("all");
  const [oddsFilter, setOddsFilter] = useState<"all" | "1.20-1.40" | "1.40-2.00" | "2.00+">("all");
  const [dateFilter, setDateFilter] = useState<"today" | "upcoming">("upcoming");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(32);
  const predictionsQuery = trpc.predictions.list.useQuery();
  const fallbackEventsQuery = trpc.predictions.fallbackEvents.useQuery();
  const statsQuery = trpc.predictions.statistics.useQuery();
  const syncStatus = trpc.predictions.syncStatus.useQuery();
  const toggleFavorite = trpc.favorites.toggle.useMutation({ onSuccess: () => utils.predictions.list.invalidate() });
  const explainPrediction = trpc.predictions.explain.useMutation({ onSuccess: () => { utils.predictions.list.invalidate(); toast.success("Explicația AI a fost adăugată selecției."); }, onError: error => toast.error(error.message) });
  const refresh = trpc.predictions.refresh.useMutation({
    onSuccess: result => {
      if (result.status === "skipped") {
        const retryInSeconds = "retryInSeconds" in result ? result.retryInSeconds : 60;
        toast.info(`Actualizarea este în pauză pentru a proteja cota furnizorului. Reîncearcă peste aproximativ ${Math.max(1, Math.ceil(retryInSeconds / 60))} minute.`);
        return;
      }
      if (result.incompleteOdds > 0) {
        toast.warning(`Sincronizare parțială: ${result.savedSelections} selecții procesate prin ${result.externalCalls} cereri externe, dar ${result.incompleteOdds} evenimente nu au primit cote. Reîncercarea este automată.`);
      } else {
        toast.success(`Sincronizare finalizată: ${result.savedSelections} selecții procesate prin ${result.externalCalls} cereri externe.`);
      }
      utils.predictions.list.invalidate();
      utils.predictions.fallbackEvents.invalidate();
      utils.predictions.statistics.invalidate();
      utils.pyramids.recommendations.invalidate();
      utils.tickets.suggest.invalidate();
    },
    onError: error => toast.error(getSafeSportsSyncError(error.message)),
  });
  const generateMissingExplanations = trpc.predictions.generateMissingExplanations.useMutation({
    onSuccess: result => {
      toast.success(result.generated ? `${result.generated} analize AI au fost generate.` : "Nu există analize AI lipsă în acest lot.");
      utils.predictions.list.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const allPredictions = (predictionsQuery.data ?? []) as DashboardPrediction[];
  const sports = useMemo(() => Array.from(new Set(allPredictions.map(prediction => prediction.sport))).sort(), [allPredictions]);
  const filteredPredictions = useMemo(() => allPredictions.filter(prediction => {
    if (prediction.eventStatus !== "upcoming" || prediction.startsAt.getTime() <= Date.now()) return false;
    const localDate = prediction.startsAt.toLocaleDateString("en-CA", { timeZone: "Europe/Bucharest" });
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Bucharest" });
    if (dateFilter === "today" && localDate !== today) return false;
    if (sportFilter !== "all" && prediction.sport !== sportFilter) return false;
    const odds = prediction.currentOdds ? Number(prediction.currentOdds) : null;
    if (oddsFilter === "1.20-1.40" && (odds === null || odds < 1.2 || odds > 1.4)) return false;
    if (oddsFilter === "1.40-2.00" && (odds === null || odds < 1.4 || odds > 2)) return false;
    if (oddsFilter === "2.00+" && (odds === null || odds < 2)) return false;
    if (qualityFilter === "recommended") return prediction.recommendationStatus === "recommended";
    if (qualityFilter === "value") return prediction.valueStatus === "positive";
    if (qualityFilter === "favorites") return prediction.isFavorite;
    return true;
  }), [allPredictions, dateFilter, qualityFilter, sportFilter]);
  const visiblePredictions = filteredPredictions.slice(0, visibleCount);
  const groups = useMemo(() => {
    const grouped = new Map<string, { sport: string; competition: string; events: Map<number, DashboardPrediction[]> }>();
    for (const prediction of visiblePredictions) {
      const competition = prediction.competition ?? "Alte competiții";
      const key = `${prediction.sport}::${competition}`;
      const current = grouped.get(key) ?? { sport: prediction.sport, competition, events: new Map<number, DashboardPrediction[]>() };
      current.events.set(prediction.eventId, [...(current.events.get(prediction.eventId) ?? []), prediction]);
      grouped.set(key, current);
    }
    return Array.from(grouped.values()).map(group => ({
      sport: group.sport,
      competition: group.competition,
      events: Array.from(group.events.entries()).map(([eventId, selections]) => ({
        eventId,
        primary: [...selections].sort((a, b) => selectionPriority(b) - selectionPriority(a))[0]!,
        selections,
      })).sort((a, b) => a.primary.startsAt.getTime() - b.primary.startsAt.getTime()),
    }));
  }, [visiblePredictions]);
  const stats = statsQuery.data;
  const winRate = stats && stats.won + stats.lost > 0 ? Math.round((stats.won / (stats.won + stats.lost)) * 100) : null;
  const focusPick = filteredPredictions.find(item => item.recommendationStatus === "recommended" && item.valueStatus === "positive") ?? filteredPredictions[0];
  const quotaUnavailable = syncStatus.data?.status === "failed" && syncStatus.data.errorMessage?.includes("limita zilnică");

  return <DashboardLayout>
    <div className="mx-auto max-w-[1500px] space-y-5 pb-6 sm:space-y-6">
      <header className="overflow-hidden rounded-[2rem] border border-border/70 bg-card/75 shadow-[0_18px_70px_rgba(0,0,0,0.16)]">
        <div className="grid gap-4 px-5 py-5 sm:gap-6 sm:px-6 sm:py-7 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:px-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary sm:text-xs">Centrul de decizie · {dateFilter === "today" ? "astăzi" : "meciuri viitoare"}</p>
            <h1 className="mt-2 max-w-2xl text-2xl font-semibold tracking-tight text-foreground sm:mt-3 sm:text-4xl">Mai puține semnale. Mai multă claritate.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:mt-3">Selecțiile sunt ordonate ca un flux de lucru: întâi evenimentul, piața și cota; argumentele AI și metricele detaliate apar numai când le deschizi.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-2xl border border-border/65 bg-background/30 p-3">
            <HeaderMetric label="Analizate" value={stats ? String(stats.total) : "—"} />
            <HeaderMetric label="Confirmate" value={winRate === null ? "—" : `${winRate}%`} />
            <HeaderMetric label="În flux" value={String(filteredPredictions.length)} />
          </div>
        </div>
        <div className="flex flex-col gap-3 border-t border-border/65 bg-background/20 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p className="flex items-center gap-2 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5 text-primary" /> Orele sunt afișate în fusul tău local. Rezultatele rămân verificabile după confirmare.</p>
          {user?.role === "admin" && <div className="flex flex-col gap-2 sm:flex-row"><Button size="sm" variant="outline" onClick={() => generateMissingExplanations.mutate({ limit: 12 })} disabled={generateMissingExplanations.isPending} className="min-h-10 rounded-lg"><Sparkles className={`mr-2 h-3.5 w-3.5 ${generateMissingExplanations.isPending ? "animate-pulse" : ""}`} /> Analize AI</Button><Button size="sm" onClick={() => refresh.mutate()} disabled={refresh.isPending} className="min-h-10 rounded-lg"><RefreshCw className={`mr-2 h-3.5 w-3.5 ${refresh.isPending ? "animate-spin" : ""}`} /> Actualizează fluxul</Button></div>}
        </div>
      </header>

      {quotaUnavailable && <section className="flex items-start gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/5 p-4 text-sm leading-6 text-amber-50/85"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" /><p><strong className="font-semibold text-amber-200">Cote live în pauză.</strong> Limita zilnică a furnizorului a fost atinsă, astfel că prețurile lipsă nu sunt estimate. Aplicația va reîncerca automat după resetarea sursei.</p></section>}

      {focusPick && <section className="relative overflow-hidden rounded-3xl border border-primary/25 bg-[linear-gradient(120deg,rgba(70,202,142,0.13),rgba(12,18,28,0.78)_54%)] p-5 shadow-[0_20px_64px_rgba(0,0,0,0.18)] sm:rounded-[2rem] sm:p-6"><div className="absolute -right-8 -top-10 h-48 w-48 rounded-full bg-primary/15 blur-3xl" /><div className="relative grid gap-4 sm:gap-5 lg:grid-cols-[1fr_auto] lg:items-center"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary sm:text-xs">Semnal prioritar</p><div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 sm:mt-3"><h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{focusPick.homeTeam} <span className="text-muted-foreground">—</span> {focusPick.awayTeam}</h2><span className="text-xs text-muted-foreground sm:text-sm">{focusPick.startsAt.toLocaleString("ro-RO", { dateStyle: "medium", timeStyle: "short" })}</span></div><p className="mt-2 text-sm text-muted-foreground">{focusPick.competition ?? "Competiție"} · {focusPick.label}</p></div><div className="grid grid-cols-3 gap-2 rounded-2xl border border-border/65 bg-background/35 p-3 text-center"><HeaderMetric label="Cotă" value={focusPick.currentOdds ? Number(focusPick.currentOdds).toFixed(2) : "—"} /><HeaderMetric label="Prob." value={`${Number(focusPick.probability).toFixed(0)}%`} /><HeaderMetric label="Edge" value={focusPick.edge ? `+${Number(focusPick.edge).toFixed(1)}` : "—"} accent /></div></div></section>}

      <section className="rounded-2xl border border-border/65 bg-card/60 p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div className="flex items-center gap-2 text-sm font-semibold text-foreground"><Filter className="h-4 w-4 text-primary" /> Controlează fluxul</div><div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{([ ["recommended", "Recomandate"], ["value", "Valoare pozitivă"], ["favorites", "Favorite"], ["all", "Toate"] ] as const).map(([key, label]) => <FilterChip key={key} active={qualityFilter === key} onClick={() => { setQualityFilter(key); setVisibleCount(32); }}>{label}</FilterChip>)}</div></div>
        <div className="mt-4 grid gap-3 border-t border-border/60 pt-4"><div className="grid gap-3 lg:grid-cols-[auto_1fr_auto]"><div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"><span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Interval</span><FilterChip active={dateFilter === "today"} onClick={() => { setDateFilter("today"); setVisibleCount(32); }}>Azi</FilterChip><FilterChip active={dateFilter === "upcoming"} onClick={() => { setDateFilter("upcoming"); setVisibleCount(32); }}>Următoarele zile</FilterChip></div><div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"><span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Sport</span><FilterChip active={sportFilter === "all"} onClick={() => { setSportFilter("all"); setVisibleCount(32); }}>Toate</FilterChip>{sports.map(sport => <FilterChip key={sport} active={sportFilter === sport} onClick={() => { setSportFilter(sport); setVisibleCount(32); }}>{sport}</FilterChip>)}</div><p className="self-center text-right text-xs text-muted-foreground">{visiblePredictions.length} / {filteredPredictions.length} selecții</p></div><div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"><span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Cotă live</span>{([ ["all", "Toate"], ["1.20-1.40", "1.20–1.40"], ["1.40-2.00", "1.40–2.00"], ["2.00+", "2.00+"] ] as const).map(([key, label]) => <FilterChip key={key} active={oddsFilter === key} onClick={() => { setOddsFilter(key); setVisibleCount(32); }}>{label}</FilterChip>)}</div></div>
      </section>

      {predictionsQuery.isLoading ? <div className="space-y-5">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-2xl bg-card" />)}</div> : predictionsQuery.isError ? <FailureState message={getSafeSportsSyncError(predictionsQuery.error.message)} retry={() => predictionsQuery.refetch()} /> : filteredPredictions.length ? <section className="space-y-6">{groups.map(group => <CompetitionGroup key={`${group.sport}-${group.competition}`} group={group} expandedId={expandedId} onToggle={(id) => setExpandedId(current => current === id ? null : id)} onToggleFavorite={id => toggleFavorite.mutate({ selectionId: id })} onGenerateExplanation={id => explainPrediction.mutate({ selectionId: id })} explanationPending={explainPrediction.isPending} />)}{visibleCount < filteredPredictions.length && <div className="flex justify-center"><Button variant="outline" onClick={() => setVisibleCount(current => current + 32)} className="rounded-xl">Încarcă următoarele selecții</Button></div>}</section> : fallbackEventsQuery.data?.length ? <FallbackEventList events={fallbackEventsQuery.data} /> : <EmptyState isAdmin={user?.role === "admin"} onRefresh={() => refresh.mutate()} refreshing={refresh.isPending} />}
      <p className="flex items-start gap-2 rounded-xl border border-border/50 bg-background/20 p-4 text-xs leading-5 text-muted-foreground"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Analizele sunt informative. Probabilitățile, edge-ul și istoricul nu elimină riscul și nu reprezintă o garanție de câștig.</p>
    </div>
  </DashboardLayout>;
}

function CompetitionGroup({ group, expandedId, onToggle, onToggleFavorite, onGenerateExplanation, explanationPending }: { group: { sport: string; competition: string; events: EventDecision[] }; expandedId: number | null; onToggle: (id: number) => void; onToggleFavorite: (id: number) => void; onGenerateExplanation: (id: number) => void; explanationPending: boolean }) {
  return <section className="overflow-hidden rounded-2xl border border-border/70 bg-card/65 shadow-[0_12px_40px_rgba(0,0,0,0.11)]"><header className="flex flex-col gap-2 border-b border-border/65 bg-background/25 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">{group.sport}</p><h2 className="mt-1 text-base font-semibold text-foreground">{group.competition}</h2></div><p className="text-xs text-muted-foreground">{group.events.length} meciuri · după ora de start</p></header><div>{group.events.map((decision, index) => <DecisionRow key={decision.eventId} decision={decision} index={index} expanded={expandedId === decision.eventId} onToggle={() => onToggle(decision.eventId)} onToggleFavorite={() => onToggleFavorite(decision.primary.id)} onGenerateExplanation={onGenerateExplanation} explanationPending={explanationPending} />)}</div></section>;
}

function DecisionRow({ decision, index, expanded, onToggle, onToggleFavorite, onGenerateExplanation, explanationPending }: { decision: EventDecision; index: number; expanded: boolean; onToggle: () => void; onToggleFavorite: () => void; onGenerateExplanation: (id: number) => void; explanationPending: boolean }) {
  const prediction = decision.primary;
  const odds = prediction.currentOdds ? Number(prediction.currentOdds).toFixed(2) : "—";
  const edge = prediction.edge ? Number(prediction.edge).toFixed(1) : "—";
  const startTime = prediction.startsAt.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
  const startDate = prediction.startsAt.toLocaleDateString("ro-RO", { day: "2-digit", month: "short" });
  const positive = prediction.valueStatus === "positive";
  return <article className={`border-b border-border/55 last:border-b-0 ${expanded ? "bg-background/25" : ""}`}><div className="flex items-center gap-2 px-3 py-3.5 sm:gap-3 sm:px-5 sm:py-4"><button onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-3.5 text-left" aria-expanded={expanded}><div className="w-11 shrink-0 text-center sm:w-auto"><p className="font-mono text-base font-semibold tracking-tight text-foreground sm:text-sm">{startTime}</p><p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{startDate}</p></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-1.5"><p className="truncate text-[15px] font-semibold leading-5 text-foreground sm:text-base">{prediction.homeTeam} <span className="text-muted-foreground">—</span> {prediction.awayTeam}</p>{index === 0 && positive && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">prioritar</span>}</div><p className="mt-1 truncate text-[11px] font-medium tracking-[0.02em] text-muted-foreground sm:text-xs">{prediction.label}{decision.selections.length > 1 ? ` · +${decision.selections.length - 1} piețe` : ""}</p></div><div className="hidden w-32 shrink-0 sm:block"><p className="text-xs text-muted-foreground">Probabilitate · edge</p><p className={`mt-1 text-sm font-semibold ${positive ? "text-primary" : "text-foreground"}`}>{Number(prediction.probability).toFixed(1)}% <span className="font-normal text-muted-foreground">· {edge} pp</span></p></div><div className="w-12 shrink-0 text-right sm:w-16"><p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">Cotă</p><p className="mt-1 font-mono text-xl font-bold tracking-tight text-foreground">{odds}</p></div></button><Button size="icon" variant="ghost" onClick={onToggleFavorite} aria-label="Salvează selecția" className="h-11 w-11 shrink-0 rounded-xl sm:h-10 sm:w-10"><Star className={`h-4 w-4 ${prediction.isFavorite ? "fill-amber-300 text-amber-300" : "text-muted-foreground"}`} /></Button></div>{expanded && <div className="border-t border-border/55 bg-background/15 p-3 sm:p-5"><div className="mb-3 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Piețe, risc și analiză</p><p className="mt-1 text-xs text-muted-foreground">{decision.selections.length} selecții analizate pentru acest meci</p></div><Button size="sm" variant="ghost" onClick={onToggle} className="min-h-11 rounded-lg text-muted-foreground sm:min-h-10">Închide <ChevronUp className="ml-1 h-3.5 w-3.5" /></Button></div><div className="grid gap-3 xl:grid-cols-2">{decision.selections.map(selection => <PredictionCard key={selection.id} prediction={selection} onToggleFavorite={onToggleFavorite} onGenerateExplanation={onGenerateExplanation} explanationPending={explanationPending} />)}</div></div>}{!expanded && <button onClick={onToggle} className="flex min-h-11 w-full items-center justify-center gap-1 border-t border-border/45 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:bg-background/30 hover:text-primary sm:min-h-10">Vezi piețele și analiza <ChevronDown className="h-3 w-3" /></button>}</article>;
}

function selectionPriority(selection: DashboardPrediction) {
  const recommendation = selection.recommendationStatus === "recommended" ? 1_000 : 0;
  const value = selection.valueStatus === "positive" ? 500 : 0;
  return recommendation + value + Number(selection.expectedValue ?? 0) * 4 + Number(selection.probability ?? 0) + Number(selection.contextScore ?? 0) / 10;
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <Button size="sm" variant={active ? "default" : "outline"} onClick={onClick} className="min-h-11 shrink-0 rounded-full px-4 text-xs sm:min-h-8 sm:px-3">{children}</Button>; }
function HeaderMetric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) { return <div className="min-w-0 text-center"><p className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</p><p className={`mt-1 text-lg font-semibold ${accent ? "text-primary" : "text-foreground"}`}>{value}</p></div>; }
function FailureState({ message, retry }: { message: string; retry: () => void }) { return <section className="rounded-3xl border border-rose-300/25 bg-rose-300/5 p-7"><CircleAlert className="h-6 w-6 text-rose-300" /><h2 className="mt-4 text-lg font-semibold text-foreground">Predicțiile nu pot fi încărcate.</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{message}</p><Button variant="outline" onClick={retry} className="mt-5 rounded-xl">Reîncearcă</Button></section>; }
function EmptyState({ isAdmin, onRefresh, refreshing }: { isAdmin: boolean; onRefresh: () => void; refreshing: boolean }) { return <section className="rounded-[2rem] border border-dashed border-border bg-card/45 px-6 py-16 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary"><Sparkles className="h-6 w-6" /></div><h2 className="mt-5 text-xl font-semibold text-foreground">Așteptăm primul flux de date.</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">Meciurile și predicțiile sunt preluate numai din API. Când sincronizarea se încheie, aici apar selecțiile reale, fără date demonstrative.</p>{isAdmin && <Button onClick={onRefresh} disabled={refreshing} className="mt-6 rounded-xl"><BarChart3 className="mr-2 h-4 w-4" /> Pornește sincronizarea</Button>}</section>; }
function FallbackEventList({ events }: { events: Array<{ id: number; sport: string; competition: string | null; homeTeam: string; awayTeam: string; startsAt: Date }> }) { return <section className="overflow-hidden rounded-2xl border border-primary/25 bg-card/65"><header className="border-b border-primary/15 bg-primary/5 px-5 py-4"><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">Meciuri reale în așteptarea analizei</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Feedul de predicții este temporar indisponibil. Acestea sunt evenimente reale din API; nu au cote sau recomandări inventate.</p></header><div>{events.map(event => <article key={event.id} className="flex items-center gap-3.5 border-b border-border/55 px-4 py-4.5 last:border-b-0 sm:px-5"><div className="w-12 shrink-0 text-center"><p className="font-mono text-base font-semibold tracking-tight text-foreground">{event.startsAt.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}</p><p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{event.startsAt.toLocaleDateString("ro-RO", { day: "2-digit", month: "short" })}</p></div><div className="min-w-0 flex-1"><p className="truncate text-[15px] font-semibold leading-5 text-foreground sm:text-base">{event.homeTeam} <span className="text-muted-foreground">—</span> {event.awayTeam}</p><p className="mt-1 truncate text-[11px] font-medium tracking-[0.02em] text-muted-foreground sm:text-xs">{event.competition ?? event.sport} · analiză și cote în curs de recuperare</p></div></article>)}</div></section>; }
