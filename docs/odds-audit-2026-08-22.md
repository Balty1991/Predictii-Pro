# Audit cote și endpointuri — 22 august 2026

Auditul a comparat documentația oficială cu răspunsurile efective ale cheii configurate, fără a expune cheia în fișiere sau în browser.

| Verificare | Rezultat | Concluzie operațională |
|---|---|---|
| `GET /api/v2/predictions/?limit=200` | 200 predicții în prima pagină, 461 raportate în șapte zile | Predicțiile și probabilitățile sunt disponibile. |
| `GET /api/v2/odds/?is_max_quote=true&limit=200` | HTTP 200, `count: 0` | Nu există rânduri de cote returnate pentru cheia/fereastra interogată. |
| `GET /api/v2/odds/?market=over_under_15&is_max_quote=true&min_decimal_odds=1.2&max_decimal_odds=2.1&limit=200` | HTTP 200, `count: 0` | Nici filtrarea pieței și a intervalului nu produce cote verificabile acum. |
| `GET /api/v2/events/{id}/odds/?limit=200` | răspuns de validare: `limit` este necunoscut | Shortcutul per-eveniment nu acceptă parametrii de paginare. |
| `GET /api/v2/events/212208/odds/` | HTTP 200 cu obiect compact `odds` | Ruta corectă livrează cote reale: 1X2, total goluri și BTTS, plus momentele de actualizare. |
| Pagina publică `/matches/212208/` → fila Odds | cote de consens și „best price” vizibile pentru Kashima–Avispa | Furnizorul deține cote pentru eveniment; trebuie identificată calea API exactă care alimentează această randare server-side. |

Documentația furnizorului specifică `/api/v2/odds/` drept feedul de cote, cu filtre pe `event_id`, `league_id`, piață, rezultat, interval de preț și `is_max_quote`; pentru o cheie gratuită, răspunsul ar trebui să fie prețul de consens, fără identitatea bookmakerului. [1] Documentația indică de asemenea că `null` reprezintă indisponibilitatea cotei pentru piața respectivă. [2]

> Un răspuns HTTP 200 cu `count: 0` nu demonstrează că funcția de cote lipsește din API; demonstrează doar că nu există linii de cote returnate prin ruta și cheia interogate în acel moment. Aplicația nu va transforma acest gol într-o cotă estimată.

Pe pagina publică a evenimentului 212208, fila **Odds** a afișat cote de consens pentru 1X2, dublă șansă, BTTS, total goluri și cornere, precum și „best price” din mai mulți bookmakeri. Această confirmare vizuală a dus la verificarea shortcutului corect: `GET /api/v2/events/212208/odds/` **fără** `limit`. Răspunsul a conținut cote pentru victorie gazde/egal/oaspeți, peste/sub 1.5–3.5 goluri și BTTS, cu `last_update_at`, `next_update_at` și intervalul de reîmprospătare. Problema a fost, așadar, parametrul neacceptat adăugat de integrarea inițială, nu inexistența cotelor. [3]

## Decizie de implementare

Noul feed va cere predicțiile o dată și apoi shortcutul `GET /events/{id}/odds/` fără parametri de paginare pentru maximum patru evenimente apropiate. Astfel respectă plafonul de cinci cereri pe sincronizare și activează Acumulatorul/Piramida cu prețuri reale imediat ce sunt disponibile. În paralel, predicțiile furnizorului rămân semnale informative, cu filtre distincte de eligibilitatea de bilet.

## Referințe

[1] [BSD — Odds & predictions](https://sports.bzzoiro.com/docs/football/odds-predictions/)

[2] [BSD — convenții API](https://sports.bzzoiro.com/docs/)

[3] [BSD — Kashima Antlers vs Avispa Fukuoka](https://sports.bzzoiro.com/matches/212208/)
