# Direcție de produs: Predicții Pro

## Poziționare

Predicții Pro este un studio de decizie pentru predicții sportive, nu o listă de recomandări. Fiecare selecție trebuie să răspundă rapid la cinci întrebări: **ce alegere este propusă, de ce, la ce preț, ce risc are și ce s-a întâmplat ulterior**.

## Principii de experiență

| Principiu | Decizie de design | Măsură de calitate |
|---|---|---|
| Decizie în câteva secunde | Prioritizează selecțiile relevante și expune simultan probabilitate, edge, cotă corectă și statutul prețului | Utilizatorul poate evalua eligibilitatea fără a deschide un panou suplimentar |
| Rigoare înainte de volum | Nu produce recomandări pentru a umple lista; stările goale explică de ce filtrele nu au aprobat o selecție | Nicio recomandare nu apare fără date și criterii minime |
| Strategie urmărită, nu presupusă | Acumulatorul și piramida au pași, miză, rezultat, P/L și progres vizibile | Orice rezultat poate fi urmărit din bilet spre selecțiile componente |
| Date separat de concluzii | Predicțiile, rezultatele verificate și istoricul API rămân module distincte | Interfața nu confundă datele brute cu validarea performanței |
| Automatizare auditabilă | Rulările programate, sincronizările și notificările păstrează trasabilitate | Fiecare actualizare are sursă, moment și statut |

## Priorități de implementare

1. Consolidarea identității vizuale într-un sistem recognoscibil de tip „decision studio”, nu un dashboard SaaS generic.
2. Evidențierea selecției prioritare și a motivelor de eligibilitate; lista completă rămâne secundară.
3. Introducerea indicatorilor de decizie lipsă: istoric al prețului, CLV, heatmap confirmat și consens între semnale.
4. Pregătirea unui front-end static pentru GitHub Pages numai ca prezentare/redirect, păstrând serverul securizat pentru date, OAuth și automatizări.

## KPI-uri de acceptanță

| Domeniu | Indicator verificabil | Ținta Predicții Pro | Verificare |
|---|---|---|---|
| Viteză | Verificare TypeScript și teste de server | Fără erori de tip; toate testele Vitest existente trec | `pnpm check` și `pnpm test` |
| Viteză | Compilare de producție | Build finalizat fără erori | `pnpm build` |
| Claritate | Datele de decizie vizibile în fluxul principal | Selecția prioritară afișează meci, piață, probabilitate, cotă actuală, cotă corectă și edge | Captură dashboard desktop și mobil |
| Rigoare | Statut fără recomandare | Când filtrele nu găsesc selecții, interfața arată o stare goală explicativă, fără date inventate | Test manual al stării goale |
| Automatizare | Rulare programată | Un job activ are cale, cron și identificator auditabil | `manus-heartbeat list` și jurnal de sincronizare |
| Trasabilitate | Bilet și piramidă | Fiecare strategie persistată afișează pașii, statutul și P/L după decontare | Flux tRPC și ecranul Strategii |
| Acces | Domeniu public | Interfața de autentificare răspunde public, iar datele sensibile rămân în spatele OAuth | Navigare la domeniul de producție |

## Verificare portal public

Portalul static a fost verificat local în format desktop. Ierarhia afișează clar diferența dintre portalul public, aplicația full-stack și repository-ul de cod, iar cele două butoane principale conduc spre aplicația de producție și repository-ul GitHub public.
