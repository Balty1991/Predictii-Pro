# Inventar statistic BSD Sports Data API — 22 august 2026

## Principiu de integrare

Feedul GitHub Pages are un plafon strict de **maximum cinci cereri externe pe sincronizare**. Arhitectura prudentă este o cerere pentru predicții și patru interogări batch ale endpointului de cote, toate filtrate la 1,20–1,70. Nu există apeluri browser-side și cheia rămâne secret GitHub.

| Ordine | Endpoint / piață | Scop | Regula de integritate |
| --- | --- | --- | --- |
| 1 | `/predictions/` | Evenimente, model, probabilități, xG, scor probabil și context primit | O singură cerere pe interval |
| 2 | `/odds/` · `over_under_15` | Piețe Peste/Sub 1,5 | Numai cote returnate de API |
| 3 | `/odds/` · `double_chance` | Piețe 1X/12/X2 | Prețul nu este calculat din probabilități |
| 4 | `/odds/` · `1x2` | Victorie gazde/egal/victorie oaspeți | Numai cote returnate de API |
| 5 | `/odds/` · `btts` | Ambele marchează da/nu | Numai cote returnate de API |

Etichetele și probabilitățile de model pot fi normalizate pentru prezentare, inclusiv la Double Chance, însă **niciodată nu se sintetizează o cotă** din acea probabilitate. Dacă interogările batch nu livrează rânduri, aplicația arată lipsa acoperirii în loc să completeze datele.

## Statistici utilizabile direct

| Grup de date | Câmpuri utilizabile din predicții | Utilizare în scor | Stare în feed |
| --- | --- | --- | --- |
| Model | `model.confidence`, versiune | Încredere API | Disponibil când API-ul îl livrează |
| Rezultat 1X2 | Probabilități gazde/egal/oaspeți | Alinierea pieței 1X2 | Disponibil |
| Goluri | xG gazde/oaspeți, O/U 1,5/2,5/3,5, scor probabil | Alinierea piețelor de goluri | Disponibil |
| BTTS | Probabilitate da | Alinierea pieței BTTS | Disponibil |
| Cornere | Praguri de cornere | Context informativ, fără selecție fără cotă | Disponibil când este primit |
| Cotă | Consens, probabilitate implicită, edge, valoare, actualizare | Validarea prețului și control de risc | Numai pentru rândurile de cote primite |

> Endpointul de predicții documentează probabilități pentru rezultat, xG, total goluri, BTTS, scor probabil, draw-no-bet și cornere; probabilitățile de piață sunt în intervalul 0–100, iar `model.confidence` este în intervalul 0–1. [1]

## Statistici suplimentare ale API-ului

API-ul poate expune detaliu de eveniment, statistici, formații, lot, H2H, arbitru, teren și deplasare. Acestea necesită endpointuri suplimentare pe eveniment și nu sunt cerute în sincronizarea curentă, deoarece ar depăși plafonul de cinci apeluri.

| Sursă | Date posibile | Regula de consum |
| --- | --- | --- |
| Detaliu eveniment | Antrenori, arbitru, stadion, vreme, teren, deplasare, H2H sumar | Doar dacă există deja în feed |
| Statistici eveniment | Posesie, șuturi, șuturi pe poartă, xG, shotmap, momentum | Doar când este sincronizat explicit |
| Formații și lot | XI, indisponibili, statut lot | Doar cu statut explicit primit |
| Arbitru | Cartonașe, faulturi, penalty-uri | Numai context; fără piață fără cotă reală |

Documentația precizează că detaliul de eveniment include arbitru, vreme, teren, deplasare și H2H, iar subresursele oferă statistici, formații, H2H și player-stats. [2] Datele de lot disting explicit `available`, `injured`, `doubtful` și `suspended`. [3] Pentru arbitri sunt documentate agregări pe cartonașe, faulturi și penalty-uri. [4]

## Limită de integritate și stare curentă

Niciun factor nu devine selecție dacă nu are o cotă reală asociată în feed. Statisticile lipsă sunt afișate ca indisponibile și nu sunt înlocuite cu medii inventate. În cazul unui 429 sau al unui alt eșec de sincronizare, feedul este marcat `partial` sau `unavailable`, iar strategiile sunt blocate până la un feed `ready`.

Ultima încercare de sincronizare a primit 429 la prima cerere de predicții; nu a ajuns să verifice cele patru piețe batch. O revalidare va fi făcută doar după cooldown, cu următoarele condiții: `calls <= 5`, status `ready`, rânduri batch mapate la evenimente reale și raportare transparentă dacă o piață nu are rezultate.

## Referințe

[1] [BSD — Odds & predictions](https://sports.bzzoiro.com/docs/football/odds-predictions/)

[2] [BSD — Events & live scores](https://sports.bzzoiro.com/docs/football/events/)

[3] [BSD — Teams, players & transfers](https://sports.bzzoiro.com/docs/football/teams-players/)

[4] [BSD — Managers, referees & venues](https://sports.bzzoiro.com/docs/football/managers-referees-venues/)
