# Analiză inițială a Sports Data API

Sursa principală este [Sports Data Hub](https://sports.bzzoiro.com/docs/). Integrarea va rula exclusiv pe server și va utiliza antetul `Authorization: Token <API_KEY>`, pentru a nu expune cheia către browser.

| Arie | Capacitate confirmată | Utilizare în aplicație |
|---|---|---|
| Convenții comune | Paginare cu `limit` și `offset`; răspunsuri de listă cu `count`, `next`, `previous`, `results`; date UTC în ISO 8601 | Client robust de sincronizare și persistare cu timpi UTC |
| Fotbal v2 | Baza este `https://sports.bzzoiro.com/api/v2/`; v2 este versiunea recomandată | Primul sport implementat end-to-end |
| Meciuri | `/events/`, `/events/live/`, `/events/{id}/` și subresurse pentru statistici, echipe, incidente, confruntări directe și cote | Predicții zilnice, pagină de rezultat și explicații contextuale |
| Predicții și cote | `/predictions/`, `/odds/`, `/odds/best/`, `/bookmakers/` | Recomandări, cote recomandate și compararea prețurilor disponibile |
| Sezonalitate | `/coverage/` nu cere token și expune sporturile cu evenimente viitoare, cote și statut de sezon | Planificarea sincronizării doar pentru sporturile active |
| Statuturi | `upcoming`, `live`, `finished`, `cancelled`, `postponed` | Actualizarea ciclului de viață al predicției și confirmarea rezultatelor |
| Erori | `401` pentru token lipsă/invald, `402` pentru add-on necesar, `429` pentru limitare de rată | Mesaje clare pentru administrator și mecanisme de reîncercare controlată |

Documentația confirmă, de asemenea, API-uri distincte pentru tenis, baschet, hochei, darts, CS2 și curse de cai. Disponibilitatea lor şi endpointurile exacte vor fi activate numai după validarea nivelului de acces al cheii API.

## Capabilități avansate confirmate

| Capacitate | Date disponibile | Funcționalitate propusă |
|---|---|---|
| Filtrare inteligentă | Predicțiile acceptă fereastră de date, statut, ligă, echipă, prag de încredere și indicatorul `recommended` | Ecranul principal va afișa selecții eligibile, filtrabile după risc, cotă, sport și încredere |
| Motor de valoare | Probabilități pe piețe, cote zecimale și cote de deschidere permit compararea probabilității modelului cu prețul curent | Scor de edge, cotă corectă, probabilitate implicită și etichetă de valoare pentru fiecare selecție |
| Mișcarea cotei | Cota actuală, cea precedentă și cea de deschidere, plus direcția `SHORTENING` sau `DRIFTING` | Semnal de schimbare de preț și avertisment privind deteriorarea cotei înainte de includerea în bilet |
| Piețe disponibile | 1X2, goluri totale pe reprize, BTTS, șansă dublă, cornere, clean sheet și win-to-nil pe endpointul de meci | Constructor de bilete care selectează piețe potrivite profilului de risc și evită piețele fără date actuale |
| Cote și nivel de acces | Cheia gratuită oferă cote de consens; cea eligibilă pentru Football Unlimited deblochează cote per casă și cele mai bune cote | Interfața va indica clar sursa cotei și va activa compararea ofertelor doar când API-ul permite |
| Semnal de piață | Pentru unele meciuri există probabilități de pe piața de predicții, lichiditate, spread bid–ask și variații temporale | Indicator opțional de consens de piață pentru verificarea independentă a unei predicții |
| Context al meciului | Detalii de eveniment: statistici, xG, echipe, antrenori, arbitru, vreme, deplasare, head-to-head, faza competiției și tur precedent | Explicații AI cu fapte verificabile, etichete de risc și justificări pentru fiecare selecție |

Pentru sincronizarea incrementală a cotelor, aplicația va reține cel mai recent `updated_at` și va trimite acest moment prin `updated_after`. O schimbare de cotă va fi determinată din diferența de preț, nu doar dintr-un timestamp de observație.

## Funcționalități selectate din repository-urile de referință

Analiza repository-urilor existente arată că valoarea reală nu este doar în lista de predicții, ci în controlul calității acestora pe termen lung. Noul produs va reuni aceste capabilități într-un model de date comun și o interfață coerentă, fără a prezenta drept garantate rezultate ale pariurilor.

| Modul selectat | Utilitate în noua aplicație |
|---|---|
| Jurnal de selecții și rezultate | Baza pentru rezultate verificate, profit/pierdere, rată de reușită, ROI, yield și drawdown |
| CLV / Market Beat Rate | Compară cota capturată la selecție cu evoluția ulterioară a pieței, ca indicator de calitate a prețului |
| Heatmap de performanță | Arată performanța pe piață, ligă, cotă și interval temporal, inclusiv volatilitatea și volumul de date |
| Scor contextual | Sintetizează contextul disponibil: xG, formă, loturi, statistici de manager, arbitru, confruntări directe și condițiile meciului |
| Calibrare și praguri adaptive | Aplică modificări doar când există rezultate istorice suficiente; protejează utilizatorul de încrederea exagerată a unui model |
| Consens între surse | Explică dacă semnalul API, cota de piață și estimarea calculată converg sau se contrazic |
| Asistent de piramidă | Gestionează pașii, reinvestirea, profitul blocat, resetarea și limitele de risc, cu istoric verificabil |
| Alertă de valoare | Semnalează separat predicțiile unde cota actuală este peste cota corectă calculată și cele al căror avantaj a fost erodat |

> Predicțiile și strategiile sunt analize informative, nu garanții de rezultat. Interfața va pune accent pe probabilități, risc, criterii de selecție și rezultate istorice verificabile.

## Surse

1. [API Documentation — Sports Data Hub](https://sports.bzzoiro.com/docs/)
2. [Football API v2 — Sports Data Hub](https://sports.bzzoiro.com/docs/football/)
3. [Odds & predictions — Sports Data Hub](https://sports.bzzoiro.com/docs/football/odds-predictions/)
4. [Events & live scores — Sports Data Hub](https://sports.bzzoiro.com/docs/football/events/)
