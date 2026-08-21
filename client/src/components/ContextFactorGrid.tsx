import { buildContextFactors } from "@shared/contextFactors";
import React from "react";

export function ContextFactorGrid({ reasonCodes }: { reasonCodes: string[] }) {
  const factors = buildContextFactors(reasonCodes);
  if (!factors.length) return null;

  return <div className="mt-3 grid grid-cols-2 gap-2" aria-label="Factori contextuali">
    {factors.map((factor, index) => <div key={`${factor.label}-${index}`} className="rounded-lg border border-border/55 bg-card/55 px-2.5 py-2"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">{factor.label}</p><p className={`mt-1 truncate text-xs font-semibold ${factor.tone === "positive" ? "text-emerald-200" : "text-foreground"}`}>{factor.value}</p></div>)}
  </div>;
}
