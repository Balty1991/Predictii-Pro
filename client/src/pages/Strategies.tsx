import DashboardLayout from "@/components/DashboardLayout";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Calculator, ChevronRight, CircleCheck, Layers3, LockKeyhole, RotateCcw, ShieldCheck, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export default function Strategies({ workspace = "all" }: { workspace?: "all" | "tickets" | "pyramids" }) {
  const [target, setTarget] = useState(1.3);
  const [horizonDays, setHorizonDays] = useState(1);
  const [baseStake, setBaseStake] = useState(10);
  const [maxSteps, setMaxSteps] = useState(5);
  const [reinvestRate, setReinvestRate] = useState(50);
  const [profitLockRate, setProfitLockRate] = useState(30);
  const [ticketStake, setTicketStake] = useState(10);
  const [deletingPlanId, setDeletingPlanId] = useState<number | null>(null);
  const [resettingPlanId, setResettingPlanId] = useState<number | null>(null);

  const ticketInput = useMemo(() => ({
    targetOddsMin: Math.max(1.05, target - 0.08),
    targetOddsMax: target + 0.08,
    maxSelections: 4,
    horizonDays,
  }), [horizonDays, target]);

  const utils = trpc.useUtils();
  const suggestion = trpc.tickets.suggest.useQuery(ticketInput);
  const plans = trpc.pyramids.list.useQuery();
  const tickets = trpc.tickets.list.useQuery();
  const syncStatus = trpc.predictions.syncStatus.useQuery();
  const createPlan = trpc.pyramids.create.useMutation({
    onSuccess: () => { toast.success("Piramida a fost creată."); utils.pyramids.list.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const deletePlan = trpc.pyramids.delete.useMutation({
    onSuccess: () => { toast.success("Piramida a fost ștearsă."); setDeletingPlanId(null); utils.pyramids.list.invalidate(); utils.pyramids.recommendations.invalidate(); },
    onError: error => { toast.error(error.message); setDeletingPlanId(null); },
  });
  const resetActiveStep = trpc.pyramids.resetActiveStep.useMutation({
    onSuccess: () => { toast.success("Pasul activ a fost resetat în siguranță."); setResettingPlanId(null); utils.pyramids.list.invalidate(); utils.pyramids.recommendations.invalidate(); },
    onError: error => { toast.error(error.message); setResettingPlanId(null); },
  });
  const createTicket = trpc.tickets.create.useMutation({
    onSuccess: () => { toast.success("Acumulatorul a fost salvat pentru monitorizare."); utils.tickets.list.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const attachTicket = trpc.pyramids.attachTicket.useMutation({
    onSuccess: () => { toast.success("Biletul este urmărit acum de pasul activ al piramidei."); utils.pyramids.list.invalidate(); utils.tickets.list.invalidate(); },
    onError: error => toast.error(error.message),
  });

  const activePyramid = plans.data?.find(plan => plan.status === "active" && plan.steps.some(step => step.status === "active" && !step.ticketId));
  const deletablePlan = plans.data?.find(plan => !plan.steps.some(step => step.ticketId));
  const resettablePlan = plans.data?.find(plan => plan.status === "active" && plan.steps.some(step => step.status === "active" && !step.ticketId));
  const pyramidRecommendations = trpc.pyramids.recommendations.useQuery({ pyramidPlanId: activePyramid?.id ?? 0 }, { enabled: Boolean(activePyramid) });
  const assignRecommendation = trpc.pyramids.assignRecommendation.useMutation({
    onSuccess: () => {
      toast.success("Recomandarea a fost asociată pasului activ și va fi decontată automat din API.");
      utils.pyramids.list.invalidate();
      utils.tickets.list.invalidate();
      utils.pyramids.recommendations.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const pyramidProjection = useMemo(() => {
    let bankroll = baseStake;
    return Array.from({ length: maxSteps }, (_, index) => {
      const retained = index === 0 ? 0 : Math.max(0, bankroll - baseStake) * (profitLockRate / 100);
      const stake = index === 0 ? baseStake : Math.min((bankroll - retained) * (reinvestRate / 100), bankroll * 0.6);
      const potentialReturn = stake * target;
      const profit = potentialReturn - stake;
      bankroll = bankroll - stake + potentialReturn;
      return { step: index + 1, stake, potentialReturn, profit, retained };
    });
  }, [baseStake, maxSteps, profitLockRate, reinvestRate, target]);

  const plan = suggestion.data;
  const busy = createPlan.isPending || deletePlan.isPending || resetActiveStep.isPending || assignRecommendation.isPending;
  const ticketWorkspace = workspace === "tickets";
  const pyramidWorkspace = workspace === "pyramids";
  const pageTitle = ticketWorkspace ? "Acumulatoare reale." : pyramidWorkspace ? "Piramide cu evenimente reale." : "Acumulatoare și pași reali.";
  const pageSubtitle = ticketWorkspace ? "Combină doar selecțiile eligibile, apoi urmărește biletul până la rezultatul confirmat." : pyramidWorkspace ? "Alege un pas, așteaptă un eveniment eligibil și urmărește automat biletul asociat." : "Fără simulări în prim-plan: întâi evenimentul real, apoi biletul și pasul monitorizat.";
  const quotaUnavailable = syncStatus.data?.status === "failed" && syncStatus.data.errorMessage?.includes("limita zilnică");
  const availabilityHint = quotaUnavailable
    ? "Cotele live sunt momentan indisponibile deoarece limita zilnică a furnizorului a fost atinsă. Nu generăm bilete fără prețuri reale; următoarea sincronizare automată va reevalua selecțiile."
    : "Nu există încă o combinație care respectă toate condițiile pentru această țintă. Ajustează intervalul sau reîncearcă după sincronizare.";

  return <DashboardLayout>
    <div className="mx-auto max-w-7xl space-y-5 pb-4 sm:space-y-7">
      <header className="signal-panel rounded-3xl border border-border/70 bg-card/75 p-5 sm:rounded-[2rem] sm:p-7">
        <div className="flex items-center gap-2"><span className="relative flex h-7 w-7 items-center justify-center rounded-lg border border-primary/35 bg-primary/10 text-primary shadow-[0_0_24px_rgba(70,202,142,0.13)]"><ShieldCheck className="h-3.5 w-3.5" /><span className="absolute -bottom-0.5 left-1/2 h-0.5 w-3 -translate-x-1/2 rounded-full bg-primary" /></span><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary sm:text-xs">{ticketWorkspace ? "Acumulatoare" : pyramidWorkspace ? "Piramide" : "Strategii reale"}</p></div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:mt-3 sm:text-3xl">{pageTitle}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{pageSubtitle}</p>
      </header>

      <section className={`${pyramidWorkspace ? "hidden" : "grid"} gap-4 xl:grid-cols-[0.9fr_1.1fr] xl:gap-6`}>
        <div className="rounded-3xl border border-border/70 bg-card/70 p-5 sm:p-6">
          <SectionTitle icon={Calculator} title="Țintă acumulator" subtitle="Alege profilul înainte de a genera o combinație." />
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">{[1.2, 1.3, 1.4, 2].map(value => <Button key={value} variant={target === value ? "default" : "outline"} onClick={() => setTarget(value)} className="min-h-12 rounded-xl">Cotă {value.toFixed(2)}</Button>)}</div>
          <div className="mt-5"><p className="text-sm font-medium text-foreground">Perioadă</p><div className="mt-2 flex flex-wrap gap-2">{([{ days: 1, label: "Doar azi" }, { days: 3, label: "Următoarele 3 zile" }, { days: 7, label: "Săptămâna curentă" }]).map(option => <Button key={option.days} size="sm" variant={horizonDays === option.days ? "default" : "outline"} onClick={() => setHorizonDays(option.days)} className="min-h-10 rounded-full">{option.label}</Button>)}</div></div>
          <div className="mt-5"><Label htmlFor="target">Cotă personalizată</Label><Input id="target" type="number" min="1.05" step="0.05" value={target} onChange={event => setTarget(Number(event.target.value))} className="mt-2 min-h-11 rounded-xl" /></div>
          <p className="mt-4 text-xs leading-5 text-muted-foreground">Ținta implicită de <strong className="text-primary">1,30</strong> este potrivită pentru pașii de piramidă. Interval analizat: {ticketInput.targetOddsMin.toFixed(2)} – {ticketInput.targetOddsMax.toFixed(2)}. Generatorul exclude același meci, repetarea competiției, contextul slab și cota degradată.</p>
        </div>
        <div className="rounded-3xl border border-border/70 bg-card/70 p-5 sm:p-6">
          <SectionTitle icon={Layers3} title="Bilet propus" subtitle="Combină doar selecții fără același eveniment." trailing={plan ? <Signal value={`EV ${plan.expectedValue > 0 ? "+" : ""}${plan.expectedValue.toFixed(1)}%`} /> : undefined} />
          {suggestion.isLoading ? <p className="mt-7 text-sm text-muted-foreground">Evaluez selecțiile actuale…</p> : plan ? <><div className="mt-5 space-y-2.5">{plan.selections.map((selection, index) => <div key={selection.id} className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/30 p-3.5"><div><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Selecția {index + 1}</p><p className="mt-1 font-medium text-foreground">Probabilitate {selection.probability.toFixed(1)}%</p></div><p className="font-mono text-xl font-semibold text-primary">{selection.odds.toFixed(2)}</p></div>)}</div><div className="mt-4 grid grid-cols-2 gap-2"><Metric label="Cotă cumulată" value={plan.totalOdds.toFixed(2)} /><Metric label="Probabilitate" value={`${plan.combinedProbability.toFixed(1)}%`} /></div></> : <EmptyHint className="mt-6">{availabilityHint}</EmptyHint>}
        </div>
      </section>

      <section className={`${ticketWorkspace ? "hidden" : "grid"} gap-4 xl:grid-cols-[0.9fr_1.1fr] xl:gap-6`}>
        <div className="rounded-3xl border border-border/70 bg-card/70 p-5 sm:p-6">
          <SectionTitle icon={ShieldCheck} title="Creează o piramidă" subtitle="Configurează capitalul și protecția profitului." />
          <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4"><Field label="Miză inițială" id="stake" value={baseStake} min={1} onChange={setBaseStake} /><Field label="Pași maxim" id="steps" value={maxSteps} min={1} max={31} onChange={setMaxSteps} /><Field label="Reinvestire (%)" id="reinvest" value={reinvestRate} min={5} max={100} onChange={setReinvestRate} /><Field label="Profit protejat (%)" id="lock" value={profitLockRate} min={0} max={90} onChange={setProfitLockRate} /></div>
          <Button onClick={() => createPlan.mutate({ title: `Piramidă cotă ${target.toFixed(2)}`, baseStake, targetOddsMin: ticketInput.targetOddsMin, targetOddsMax: ticketInput.targetOddsMax, reinvestRate: reinvestRate / 100, profitLockRate: profitLockRate / 100, maxSteps })} disabled={createPlan.isPending} className="mt-5 min-h-12 w-full rounded-xl">Creează planul <ChevronRight className="ml-2 h-4 w-4" /></Button>
        </div>
        <div className="rounded-3xl border border-border/70 bg-card/70 p-5 sm:p-6"><SectionTitle icon={Layers3} title="Piramidele tale" subtitle="Capital și pas următor, fără detalii inutile." trailing={<div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center">{resettablePlan && <Button size="sm" variant="ghost" onClick={() => setResettingPlanId(resettablePlan.id)} className="min-h-11 rounded-xl text-muted-foreground hover:text-primary"><RotateCcw className="mr-2 h-4 w-4" /> Resetează pasul</Button>}{deletablePlan && <Button size="sm" variant="ghost" onClick={() => setDeletingPlanId(deletablePlan.id)} className="min-h-11 rounded-xl text-muted-foreground hover:text-rose-300"><Trash2 className="mr-2 h-4 w-4" /> Șterge</Button>}</div>} />
          {deletablePlan && <AlertDialog open={deletingPlanId === deletablePlan.id} onOpenChange={open => !open && setDeletingPlanId(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Ștergi această piramidă?</AlertDialogTitle><AlertDialogDescription>Planul poate fi șters deoarece nu are încă un bilet real asociat. Pașii nefolosiți vor fi eliminați.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Anulează</AlertDialogCancel><AlertDialogAction onClick={() => deletePlan.mutate({ pyramidPlanId: deletablePlan.id })}>Șterge planul</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>}
          {resettablePlan && <AlertDialog open={resettingPlanId === resettablePlan.id} onOpenChange={open => !open && setResettingPlanId(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Resetezi pasul activ?</AlertDialogTitle><AlertDialogDescription>Poți reseta doar un pas fără bilet asociat. Nu sunt modificate rezultatele sau biletele reale.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Anulează</AlertDialogCancel><AlertDialogAction onClick={() => resetActiveStep.mutate({ pyramidPlanId: resettablePlan.id })}>Resetează pasul</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>}
          <div className="mt-4 space-y-2.5">{plans.data?.length ? plans.data.map(item => <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/25 p-3.5"><div className="min-w-0"><p className="truncate font-medium text-foreground">{item.title}</p><p className="mt-1 text-xs text-muted-foreground">Pasul {item.currentStep}/{item.maxSteps} · reinvestire {(Number(item.reinvestRate) * 100).toFixed(0)}%</p></div><div className="shrink-0 text-right"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Miza</p><p className="font-mono text-lg font-semibold text-primary">{item.projection.stake.toFixed(2)}</p></div></div>) : <EmptyHint>Nu ai încă un plan activ. Începe cu o miză pe care îți permiți să o pierzi.</EmptyHint>}</div>
        </div>
      </section>

      <section aria-hidden="true" className="hidden"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold text-foreground">Simulare pe pași</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Scenariu matematic, nu rezultat anticipat.</p></div><Signal value={`Cotă ${target.toFixed(2)}`} /></div>
        <div className="mt-4 space-y-2.5 md:hidden">{pyramidProjection.map(row => <div key={row.step} className="rounded-2xl border border-border/60 bg-background/25 p-3.5"><div className="flex items-center justify-between"><p className="font-semibold text-foreground">Pasul {row.step}</p><span className="font-mono text-sm text-primary">cotă {target.toFixed(2)}</span></div><div className="mt-3 grid grid-cols-3 gap-2"><SmallMetric label="Miză" value={row.stake.toFixed(2)} /><SmallMetric label="Profit" value={`+${row.profit.toFixed(2)}`} tone="positive" /><SmallMetric label="Protejat" value={row.retained.toFixed(2)} /></div></div>)}</div>
        <div className="mt-5 hidden overflow-x-auto md:block"><table className="w-full min-w-[680px] text-left text-sm"><thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="pb-3">Pas</th><th className="pb-3">Cotă</th><th className="pb-3">Miză</th><th className="pb-3">Câștig potențial</th><th className="pb-3">Profit</th><th className="pb-3">Profit protejat</th></tr></thead><tbody>{pyramidProjection.map(row => <tr key={row.step} className="border-b border-border/50"><td className="py-3 text-foreground">{row.step}</td><td className="py-3 text-muted-foreground">{target.toFixed(2)}</td><td className="py-3 text-muted-foreground">{row.stake.toFixed(2)}</td><td className="py-3 text-foreground">{row.potentialReturn.toFixed(2)}</td><td className="py-3 text-emerald-300">+{row.profit.toFixed(2)}</td><td className="py-3 text-primary">{row.retained.toFixed(2)}</td></tr>)}</tbody></table></div>
      </section>

      <section className={`${ticketWorkspace ? "hidden" : "block"} rounded-3xl border border-border/70 bg-card/70 p-5 sm:p-6`}><SectionTitle icon={CircleCheck} title="Monitorizare piramide" subtitle="Confirmă rezultatul numai după verificarea API." />
        {plans.data?.length ? <div className="mt-5 space-y-4">{plans.data.map(planItem => <div key={planItem.id} className="rounded-2xl border border-border/60 bg-background/25 p-3.5 sm:p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium text-foreground">{planItem.title}</p><p className="mt-1 text-xs text-muted-foreground">Capital {Number(planItem.currentBankroll).toFixed(2)} · pas {planItem.currentStep}/{planItem.maxSteps}</p></div><Signal value={planItem.status} /></div>
          <div className="mt-3 space-y-2 md:hidden">{planItem.steps.map(step => <div key={step.id} className="rounded-xl border border-border/55 bg-card/45 p-3"><div className="flex items-center justify-between gap-3"><p className="font-semibold text-foreground">Pasul {step.stepNumber}</p><p className="font-mono text-sm text-primary">miză {Number(step.stake).toFixed(2)}</p></div><div className="mt-2 flex items-center justify-between gap-2"><p className="text-xs text-muted-foreground">{step.profitLoss ? `P/L ${Number(step.profitLoss).toFixed(2)}` : "În așteptare"}</p>{step.status === "active" ? <span className="text-xs text-primary">Se verifică automat</span> : <span className="text-xs capitalize text-muted-foreground">{step.status}</span>}</div></div>)}</div>
          <div className="mt-4 hidden overflow-x-auto md:block"><table className="w-full min-w-[640px] text-left text-sm"><thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="pb-2">Pas</th><th className="pb-2">Miză</th><th className="pb-2">Retenție</th><th className="pb-2">Profit/Pierdere</th><th className="pb-2">Statut</th><th className="pb-2">Verificare</th></tr></thead><tbody>{planItem.steps.map(step => <tr key={step.id} className="border-b border-border/50"><td className="py-3 text-foreground">{step.stepNumber}</td><td className="py-3 text-muted-foreground">{Number(step.stake).toFixed(2)}</td><td className="py-3 text-muted-foreground">{Number(step.retainedProfit).toFixed(2)}</td><td className={`py-3 ${step.profitLoss && Number(step.profitLoss) < 0 ? "text-rose-300" : "text-emerald-300"}`}>{step.profitLoss ? Number(step.profitLoss).toFixed(2) : "—"}</td><td className="py-3 capitalize text-muted-foreground">{step.status}</td><td className="py-3 text-muted-foreground">{step.status === "active" ? "Automată" : "Finalizată"}</td></tr>)}</tbody></table></div>
        </div>)}</div> : <EmptyHint className="mt-4">Nu există încă piramide de monitorizat.</EmptyHint>}
      </section>

      <section className={`${ticketWorkspace ? "hidden" : "block"} rounded-3xl border border-primary/20 bg-[linear-gradient(135deg,rgba(70,202,142,0.11),rgba(13,19,30,0.74)_52%)] p-5 sm:rounded-[2rem] sm:p-6`}><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary sm:text-xs">Piramidă · recomandare activă</p><h2 className="mt-2 text-xl font-semibold text-foreground">Evenimente reale pentru pasul următor.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Selectăm strict selecțiile cu valoare pozitivă, cotă în interval, meci viitor și risc eligibil.</p></div>{activePyramid && <div className="rounded-xl border border-primary/20 bg-background/35 px-4 py-3 text-left sm:text-right"><p className="text-xs text-muted-foreground">{activePyramid.title} · pas {activePyramid.currentStep}</p><p className="mt-1 font-semibold text-primary">Cotă {Number(activePyramid.targetOddsMin).toFixed(2)} – {Number(activePyramid.targetOddsMax).toFixed(2)}</p></div>}</div>
      {!activePyramid ? <EmptyHint className="mt-5">Creează o piramidă sau finalizează asocierea curentă pentru a primi recomandări pentru următorul pas.</EmptyHint> : pyramidRecommendations.isLoading ? <p className="mt-5 text-sm text-muted-foreground">Selectez evenimente eligibile din fluxul API…</p> : pyramidRecommendations.data?.selections.length ? <div className="mt-5 grid gap-3 lg:grid-cols-2">{pyramidRecommendations.data.selections.map(selection => <article key={selection.id} className="rounded-2xl border border-border/65 bg-background/35 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-xs font-semibold uppercase tracking-[0.12em] text-primary">{selection.competition ?? selection.sport}</p><h3 className="mt-2 font-semibold text-foreground">{selection.homeTeam} <span className="text-muted-foreground">—</span> {selection.awayTeam}</h3><p className="mt-1 text-xs text-muted-foreground">{selection.startsAt.toLocaleString("ro-RO", { dateStyle: "medium", timeStyle: "short" })}</p></div><p className="rounded-lg bg-primary/15 px-2.5 py-1 font-mono text-lg font-bold text-primary">{Number(selection.currentOdds).toFixed(2)}</p></div><div className="mt-4 grid grid-cols-3 gap-2 text-xs"><Metric label="Piață" value={selection.label} /><Metric label="Prob." value={`${Number(selection.probability).toFixed(1)}%`} /><Metric label="Edge" value={`${Number(selection.edge ?? 0).toFixed(1)} pp`} /></div><Button size="sm" onClick={() => assignRecommendation.mutate({ pyramidPlanId: activePyramid.id, selectionId: selection.id })} disabled={busy} className="mt-4 min-h-11 w-full rounded-lg">Folosește la pasul {activePyramid.currentStep}</Button></article>)}</div> : <EmptyHint className="mt-5">{quotaUnavailable ? availabilityHint : "Nu există încă evenimente care respectă simultan cota, valoarea pozitivă și regulile de risc ale pasului activ. Sincronizarea următoare va reevalua automat fluxul."}</EmptyHint>}
      </section>

      <section className={`${pyramidWorkspace ? "hidden" : "grid"} gap-4 xl:grid-cols-[0.8fr_1.2fr] xl:gap-6`}><div className="rounded-3xl border border-border/70 bg-card/70 p-5 sm:p-6"><SectionTitle icon={LockKeyhole} title="Salvează acumulatorul" subtitle="Rezultatele se verifică automat după ultimul rezultat relevant." /><div className="mt-5"><Label htmlFor="ticketStake">Miză</Label><Input id="ticketStake" type="number" min="1" value={ticketStake} onChange={event => setTicketStake(Number(event.target.value))} className="mt-2 min-h-11 rounded-xl" /></div><Button disabled={!plan || createTicket.isPending} onClick={() => plan && createTicket.mutate({ title: `Acumulator ${horizonDays === 1 ? "zilnic" : `${horizonDays} zile`} · cotă ${plan.totalOdds.toFixed(2)}`, ticketType: horizonDays === 1 ? "daily" : "long_run", selectionIds: plan.selections.map(selection => selection.id), stake: ticketStake })} className="mt-5 min-h-12 w-full rounded-xl">Salvează pentru monitorizare</Button></div>
        <div className="rounded-3xl border border-border/70 bg-card/70 p-5 sm:p-6"><SectionTitle icon={Layers3} title="Acumulatoare urmărite" subtitle="Bilete active și rezultatele lor." />{tickets.data?.length ? <div className="mt-4 space-y-2.5">{tickets.data.map(ticket => <div key={ticket.id} className="rounded-2xl border border-border/60 bg-background/25 p-3.5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-medium text-foreground">{ticket.title}</p><p className="mt-1 text-xs text-muted-foreground">{ticket.selections.filter(selection => selection.status === "won").length}/{ticket.selections.length} câștigate · miză {Number(ticket.stake).toFixed(2)}</p></div><p className={`shrink-0 text-sm font-semibold ${ticket.status === "won" ? "text-emerald-300" : ticket.status === "lost" ? "text-rose-300" : "text-primary"}`}>{ticket.status}</p></div>{ticket.status === "published" && <div className="mt-3 flex flex-wrap gap-2 border-t border-border/50 pt-3">{plans.data?.filter(planItem => planItem.status === "active" && planItem.steps.some(step => step.status === "active" && !step.ticketId)).map(planItem => <Button key={planItem.id} size="sm" variant="outline" disabled={attachTicket.isPending} onClick={() => attachTicket.mutate({ pyramidPlanId: planItem.id, ticketId: ticket.id })} className="min-h-10 rounded-lg">Leagă de {planItem.title}</Button>)}</div>}</div>)}</div> : <EmptyHint className="mt-4">Nu ai încă acumulatoare salvate.</EmptyHint>}</div></section>

      <section className={`${pyramidWorkspace ? "hidden" : "block"} rounded-3xl border border-border/70 bg-card/70 p-5 sm:p-6`}><SectionTitle icon={TrendingUp} title="Pași acumulatoare" subtitle="CLV și statutul fiecărei selecții, într-un format potrivit pentru telefon." />
        {tickets.data?.length ? <div className="mt-5 space-y-4">{tickets.data.map(ticket => <div key={ticket.id} className="overflow-hidden rounded-2xl border border-border/60"><div className="flex items-center justify-between gap-3 bg-background/30 px-4 py-3"><p className="truncate font-medium text-foreground">{ticket.title}</p><p className="shrink-0 text-xs font-semibold text-primary">Cotă {Number(ticket.totalOdds).toFixed(2)}</p></div><div className="space-y-2 p-3 md:hidden">{ticket.selections.map(selection => <TicketSelectionCard key={selection.id} selection={selection} />)}</div><div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[780px] text-left text-sm"><thead className="border-b border-border bg-background/15 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-3">#</th><th className="px-4 py-3">Meci</th><th className="px-4 py-3">Selecție</th><th className="px-4 py-3">La intrare</th><th className="px-4 py-3">Ultima cotă</th><th className="px-4 py-3">CLV</th><th className="px-4 py-3">Statut</th></tr></thead><tbody>{ticket.selections.map(selection => { const clv = calculateClv(Number(selection.oddsAtSelection), selection.currentOdds ? Number(selection.currentOdds) : null); return <tr key={selection.id} className="border-b border-border/50"><td className="px-4 py-3 text-muted-foreground">{selection.position}</td><td className="px-4 py-3 text-foreground">{selection.homeTeam} — {selection.awayTeam}</td><td className="px-4 py-3 text-muted-foreground">{selection.label}</td><td className="px-4 py-3 text-muted-foreground">{Number(selection.oddsAtSelection).toFixed(2)}</td><td className="px-4 py-3 text-muted-foreground">{selection.currentOdds ? Number(selection.currentOdds).toFixed(2) : "—"}</td><td className={`px-4 py-3 font-semibold ${clv === null ? "text-muted-foreground" : clv > 0 ? "text-emerald-300" : clv < 0 ? "text-rose-300" : "text-muted-foreground"}`}>{clv === null ? "—" : `${clv > 0 ? "+" : ""}${clv.toFixed(2)}%`}</td><td className={`px-4 py-3 font-medium ${selection.status === "won" ? "text-emerald-300" : selection.status === "lost" ? "text-rose-300" : "text-muted-foreground"}`}>{selection.status}</td></tr>; })}</tbody></table></div><p className="border-t border-border/50 px-4 py-2.5 text-[11px] text-muted-foreground">CLV compară cota la intrare cu ultima cotă disponibilă din feed; devine final când furnizorul transmite prețul apropiat de start.</p></div>)}</div> : <EmptyHint className="mt-4">Pas cu pas va apărea după ce salvezi primul acumulator.</EmptyHint>}
      </section>
    </div>
  </DashboardLayout>;
}

function SectionTitle({ icon: Icon, title, subtitle, trailing }: { icon: typeof Calculator; title: string; subtitle: string; trailing?: React.ReactNode }) { return <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 gap-2.5"><Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><h2 className="text-[15px] font-semibold tracking-tight text-foreground sm:text-base">{title}</h2><p className="mt-1 text-[11px] font-medium leading-5 text-muted-foreground sm:text-xs">{subtitle}</p></div></div>{trailing}</div>; }
function Field({ label, id, value, min, max, onChange }: { label: string; id: string; value: number; min: number; max?: number; onChange: (value: number) => void }) { return <div><Label htmlFor={id} className="text-xs">{label}</Label><Input id={id} type="number" value={value} min={min} max={max} onChange={event => onChange(Number(event.target.value))} className="mt-2 min-h-11 rounded-xl" /></div>; }
function Signal({ value }: { value: string }) { return <span className="signal-chip shrink-0 rounded-full bg-primary/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">{value}</span>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="signal-metric min-w-0 rounded-xl bg-secondary/70 p-3"><p className="truncate text-[10px] font-bold uppercase tracking-[0.11em] text-muted-foreground">{label}</p><p className="mt-1 truncate text-[15px] font-semibold tracking-tight text-foreground sm:text-lg">{value}</p></div>; }
function SmallMetric({ label, value, tone }: { label: string; value: string; tone?: "positive" }) { return <div className="min-w-0"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p><p className={`mt-1 truncate font-mono text-sm font-semibold ${tone === "positive" ? "text-emerald-300" : "text-foreground"}`}>{value}</p></div>; }
function EmptyHint({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <p className={`signal-empty rounded-2xl border border-dashed border-border/70 p-4 text-sm leading-6 text-muted-foreground ${className}`}>{children}</p>; }
function calculateClv(entryOdds: number, latestOdds: number | null) { if (!Number.isFinite(entryOdds) || entryOdds <= 1 || !latestOdds || !Number.isFinite(latestOdds) || latestOdds <= 1) return null; return Number((((entryOdds / latestOdds) - 1) * 100).toFixed(2)); }
function TicketSelectionCard({ selection }: { selection: { position: number; homeTeam: string; awayTeam: string; label: string; oddsAtSelection: string; currentOdds: string | null; status: string } }) { const clv = calculateClv(Number(selection.oddsAtSelection), selection.currentOdds ? Number(selection.currentOdds) : null); const clvTone = clv === null ? "text-muted-foreground" : clv > 0 ? "text-emerald-300" : clv < 0 ? "text-rose-300" : "text-muted-foreground"; return <article className="rounded-xl border border-border/55 bg-card/45 p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-medium text-foreground">{selection.position}. {selection.homeTeam} — {selection.awayTeam}</p><p className="mt-1 truncate text-xs text-muted-foreground">{selection.label}</p></div><span className="shrink-0 text-xs capitalize text-muted-foreground">{selection.status}</span></div><div className="mt-3 grid grid-cols-3 gap-2"><SmallMetric label="Intrare" value={Number(selection.oddsAtSelection).toFixed(2)} /><SmallMetric label="Ultima" value={selection.currentOdds ? Number(selection.currentOdds).toFixed(2) : "—"} /><div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">CLV</p><p className={`mt-1 font-mono text-sm font-semibold ${clvTone}`}>{clv === null ? "—" : `${clv > 0 ? "+" : ""}${clv.toFixed(2)}%`}</p></div></div></article>; }
