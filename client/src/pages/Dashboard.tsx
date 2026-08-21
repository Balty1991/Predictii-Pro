import DashboardLayout from "@/components/DashboardLayout";
import PredictionCard, { type PredictionCardData } from "@/components/PredictionCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { BarChart3, CircleAlert, Filter, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export default function Dashboard() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [filter, setFilter] = useState<"all" | "recommended" | "value" | "favorites">("all");
  const [sportFilter, setSportFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<"today" | "upcoming">("today");
  const [visibleCount, setVisibleCount] = useState(24);
  const predictionsQuery = trpc.predictions.list.useQuery();
  const statsQuery = trpc.predictions.statistics.useQuery();
  const toggleFavorite = trpc.favorites.toggle.useMutation({ onSuccess: () => utils.predictions.list.invalidate() });
  const explainPrediction = trpc.predictions.explain.useMutation({ onSuccess: () => { utils.predictions.list.invalidate(); toast.success("Explicația AI a fost adăugată selecției."); }, onError: error => toast.error(error.message) });
  const refresh = trpc.predictions.refresh.useMutation({
    onSuccess: result => {
      toast.success(`Sincronizare finalizată: ${result.savedSelections} selecții procesate.`);
      utils.predictions.list.invalidate();
      utils.predictions.statistics.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const sports = useMemo(() => Array.from(new Set((predictionsQuery.data ?? []).map(prediction => prediction.sport))).sort(), [predictionsQuery.data]);
  const predictions = useMemo(() => (predictionsQuery.data ?? []).filter(prediction => {
    const localDate = prediction.startsAt.toLocaleDateString("en-CA", { timeZone: "Europe/Bucharest" });
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Bucharest" });
    if (dateFilter === "today" && localDate !== today) return false;
    if (sportFilter !== "all" && prediction.sport !== sportFilter) return false;
    if (filter === "recommended") return prediction.recommendationStatus === "recommended";
    if (filter === "value") return prediction.valueStatus === "positive";
    if (filter === "favorites") return prediction.isFavorite;
    return true;
  }), [dateFilter, filter, sportFilter, predictionsQuery.data]);
  useEffect(() => setVisibleCount(24), [dateFilter, filter, sportFilter]);
  const visiblePredictions = predictions.slice(0, visibleCount);
  const groupedPredictions = useMemo(() => visiblePredictions.reduce<Record<string, typeof visiblePredictions>>((groups, prediction) => {
    const key = `${prediction.sport} · ${prediction.competition ?? "Alte competiții"}`;
    groups[key] = [...(groups[key] ?? []), prediction];
    return groups;
  }, {}), [visiblePredictions]);
  const stats = statsQuery.data;
  const winRate = stats && stats.won + stats.lost > 0 ? Math.round((stats.won / (stats.won + stats.lost)) * 100) : null;
  const focusPick = predictions.find(item => item.recommendationStatus === "recommended" && item.valueStatus === "positive") ?? predictions[0];

  return <DashboardLayout>
    <div className="mx-auto max-w-7xl space-y-7 pb-12">
      <header className="flex flex-col gap-5 rounded-[2rem] border border-border/70 bg-card/75 px-6 py-7 shadow-[0_18px_70px_rgba(0,0,0,0.16)] backdrop-blur md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Prediction intelligence</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Predicții cu context, nu promisiuni.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Datele API, mișcarea cotei și argumentele AI sunt evaluate împreună pentru a face fiecare selecție mai ușor de înțeles.</p>
        </div>
        {user?.role === "admin" && <Button onClick={() => refresh.mutate()} disabled={refresh.isPending} className="rounded-xl bg-primary px-5 text-primary-foreground hover:bg-primary/90"><RefreshCw className={`mr-2 h-4 w-4 ${refresh.isPending ? "animate-spin" : ""}`} /> Actualizează datele</Button>}
      </header>

      {focusPick && <section className="relative overflow-hidden rounded-[2rem] border border-primary/25 bg-[linear-gradient(120deg,rgba(70,202,142,0.12),rgba(12,18,28,0.76)_55%)] p-6 shadow-[0_20px_64px_rgba(0,0,0,0.2)]"><div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-primary/15 blur-3xl" /><div className="relative grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Selecția prioritară</p><h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{focusPick.homeTeam} <span className="text-muted-foreground">—</span> {focusPick.awayTeam}</h2><p className="mt-2 text-sm text-muted-foreground">{focusPick.competition ?? "Competiție"} · {focusPick.startsAt.toLocaleString("ro-RO", { dateStyle: "medium", timeStyle: "short" })}</p><div className="mt-5 flex flex-wrap gap-2"><span className="rounded-full bg-background/50 px-3 py-1 text-sm font-semibold text-foreground">{focusPick.label}</span><span className="rounded-full bg-primary/15 px-3 py-1 text-sm font-semibold text-primary">Prob. {Number(focusPick.probability).toFixed(1)}%</span>{focusPick.grade && <span className="rounded-full border border-primary/25 px-3 py-1 text-sm font-semibold text-foreground">Grad {focusPick.grade.replace("_", "+")}</span>}</div></div><div className="grid grid-cols-3 gap-2 rounded-2xl border border-border/65 bg-background/35 p-3 text-center"><div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Cotă</p><p className="mt-1 text-lg font-semibold text-foreground">{focusPick.currentOdds ? Number(focusPick.currentOdds).toFixed(2) : "—"}</p></div><div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Fair</p><p className="mt-1 text-lg font-semibold text-foreground">{focusPick.fairOdds ? Number(focusPick.fairOdds).toFixed(2) : "—"}</p></div><div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Edge</p><p className="mt-1 text-lg font-semibold text-primary">{focusPick.edge ? `+${Number(focusPick.edge).toFixed(1)}` : "—"}</p></div></div></div></section>}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Insight label="Selecții în analiză" value={stats ? String(stats.total) : "—"} note="Toate piețele persistate" />
        <Insight label="În așteptare" value={stats ? String(stats.pending) : "—"} note="Necesită rezultat confirmat" />
        <Insight label="Rată confirmată" value={winRate === null ? "—" : `${winRate}%`} note="Doar selecții finalizate" />
        <Insight label="Favoriți personali" value={String(predictionsQuery.data?.filter(item => item.isFavorite).length ?? 0)} note="Salvează ce urmărești" />
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-border/65 bg-card/60 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground"><Filter className="h-4 w-4 text-primary" /> Filtre rapide</div>
        <div className="flex flex-wrap gap-2">
          {([ ["all", "Toate"], ["recommended", "Recomandate"], ["value", "Valoare pozitivă"], ["favorites", "Favorite"] ] as const).map(([key, label]) => <Button key={key} size="sm" variant={filter === key ? "default" : "outline"} onClick={() => setFilter(key)} className="rounded-full">{label}</Button>)}
        </div>
      </section>
      <section className="flex flex-wrap gap-2"><span className="mr-2 self-center text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Sport</span><Button size="sm" variant={sportFilter === "all" ? "default" : "outline"} onClick={() => setSportFilter("all")} className="rounded-full">Toate</Button>{sports.map(sport => <Button key={sport} size="sm" variant={sportFilter === sport ? "default" : "outline"} onClick={() => setSportFilter(sport)} className="rounded-full capitalize">{sport}</Button>)}</section>
      <section className="flex flex-wrap gap-2"><span className="mr-2 self-center text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Interval</span><Button size="sm" variant={dateFilter === "today" ? "default" : "outline"} onClick={() => setDateFilter("today")} className="rounded-full">Predicțiile de azi</Button><Button size="sm" variant={dateFilter === "upcoming" ? "default" : "outline"} onClick={() => setDateFilter("upcoming")} className="rounded-full">Toate viitoarele</Button></section>

      {predictionsQuery.isLoading ? <div className="grid gap-5 lg:grid-cols-2">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-[390px] rounded-3xl bg-card" />)}</div> : predictionsQuery.isError ? <section className="rounded-3xl border border-rose-300/25 bg-rose-300/5 p-7"><CircleAlert className="h-6 w-6 text-rose-300" /><h2 className="mt-4 text-lg font-semibold text-foreground">Predicțiile nu pot fi încărcate.</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{predictionsQuery.error.message}</p><Button variant="outline" onClick={() => predictionsQuery.refetch()} className="mt-5 rounded-xl">Reîncearcă</Button></section> : predictions.length > 0 ? <><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Flux curent</p><h2 className="mt-1 text-xl font-semibold text-foreground">Selecții ordonate după momentul de start și valoare.</h2></div><p className="text-sm text-muted-foreground">Afișate {visiblePredictions.length} din {predictions.length}</p></div><div className="space-y-8">{Object.entries(groupedPredictions).map(([competition, competitionPredictions]) => <section key={competition}><div className="mb-4 flex items-center gap-3"><h3 className="text-sm font-semibold text-foreground">{competition}</h3><span className="h-px flex-1 bg-border" /><span className="text-xs text-muted-foreground">{competitionPredictions.length} selecții</span></div><div className="grid gap-5 lg:grid-cols-2">{competitionPredictions.map(prediction => <PredictionCard key={prediction.id} prediction={prediction as PredictionCardData} onToggleFavorite={id => toggleFavorite.mutate({ selectionId: id })} onGenerateExplanation={id => explainPrediction.mutate({ selectionId: id })} explanationPending={explainPrediction.isPending} />)}</div></section>)}</div>{visibleCount < predictions.length && <div className="flex justify-center"><Button variant="outline" onClick={() => setVisibleCount(count => count + 24)} className="rounded-xl">Arată încă 24 de selecții</Button></div>}</> : <EmptyState isAdmin={user?.role === "admin"} onRefresh={() => refresh.mutate()} refreshing={refresh.isPending} />}
      <p className="flex items-start gap-2 rounded-xl border border-border/50 bg-background/20 p-4 text-xs leading-5 text-muted-foreground"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Analizele sunt informative. Probabilitățile, edge-ul și rezultatele istorice nu elimină riscul și nu reprezintă o garanție de câștig.</p>
    </div>
  </DashboardLayout>;
}

function Insight({ label, value, note }: { label: string; value: string; note: string }) { return <div className="rounded-2xl border border-border/65 bg-card/70 p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</p><p className="mt-1 text-xs text-muted-foreground">{note}</p></div>; }
function EmptyState({ isAdmin, onRefresh, refreshing }: { isAdmin: boolean; onRefresh: () => void; refreshing: boolean }) { return <section className="rounded-[2rem] border border-dashed border-border bg-card/45 px-6 py-16 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary"><Sparkles className="h-6 w-6" /></div><h2 className="mt-5 text-xl font-semibold text-foreground">Așteptăm primul flux de date.</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">Meciurile și predicțiile sunt preluate numai din API. Când sincronizarea se încheie, aici vor apărea selecțiile reale, fără date demonstrative.</p>{isAdmin && <Button onClick={onRefresh} disabled={refreshing} className="mt-6 rounded-xl"><BarChart3 className="mr-2 h-4 w-4" /> Pornește sincronizarea</Button>}</section>; }
