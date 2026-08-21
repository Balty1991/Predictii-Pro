# Model de domeniu

Aplicația separă intenționat datele brute ale furnizorului de selecțiile analizabile și de strategiile utilizatorului. Această delimitare permite resincronizarea API-ului fără a altera istoricul unei selecții, al unui bilet sau al unei piramide.

| Domeniu | Entități principale | Rol |
|---|---|---|
| Date sportive | `sportsEvents`, `providerPredictions`, `oddsSnapshots` | Păstrează evenimentele, predicția furnizorului și observațiile de cote în timp UTC |
| Analiză | `predictionSelections` | Reprezintă o piață atomică ce poate fi evaluată prin probabilitate, cotă corectă, edge, context și explicație AI |
| Personalizare | `predictionFavorites`, `notificationPreferences`, `userNotifications` | Reține selecțiile urmărite și notificările din aplicație pentru fiecare utilizator autentificat |
| Bilete | `predictionTickets`, `ticketSelections` | Păstrează acumulatoarele zilnice, pe termen lung și cele definite de utilizator, împreună cu cota blocată la selecție |
| Strategie | `pyramidPlans`, `pyramidSteps` | Modelează reinvestirea, limita de pași, miza, profitul blocat și statutul transparent al fiecărei etape |
| Operațiuni | `syncRuns` | Oferă trasabilitate pentru sincronizări, cursor incremental, erori și execuțiile recurente |

> Toate momentele persistate sunt UTC. Aplicația va afișa orele în fusul orar salvat pentru fiecare utilizator.
