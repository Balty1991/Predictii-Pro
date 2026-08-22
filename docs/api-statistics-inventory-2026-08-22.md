# Inventar statistic Sports Data API — 22 august 2026

## Principiu de integrare

Feedul GitHub Pages rămâne limitat la **cinci cereri externe pe sincronizare**. În configurația actuală, o cerere colectează predicțiile, iar patru cereri colectează cote reale de consens pentru meciuri. Extinderea scorului va consuma mai întâi toate câmpurile de predicție deja primite în prima cerere, fără a reduce numărul de meciuri cu cote și fără a fabrica informații lipsă.

| Grup de date | Câmpuri utilizabile direct din predicții | Utilizare în scor | Stare în feed |
| --- | --- | --- | --- |
| Model | `model.confidence`, versiune | Pondere de încredere | Disponibil când API-ul îl livrează |
| Rezultat 1X2 | probabilități gazde/egal/oaspeți | Alinierea pieței 1X2 | Disponibil |
| Goluri | xG gazde/oaspeți, probabilități O/U 1.5/2.5/3.5, scor probabil | Alinierea piețelor de goluri | Disponibil |
| BTTS | probabilitate Da | Alinierea pieței BTTS | Disponibil |
| Cornere | probabilități praguri de cornere | Context informativ; fără selecție automată până există o cotă verificată | Disponibil în predicții |
| Cotă | cotă consens, probabilitate implicită, edge, valoare, actualizare | Validarea prețului și control de risc | Disponibil pentru meciurile cotate |

> Endpointul de predicții documentează probabilități pentru rezultat, xG, total goluri, BTTS, scor probabil, draw-no-bet și cornere; probabilitățile de piață sunt în intervalul 0–100, iar `model.confidence` este în intervalul 0–1. [1]

## Statistici suplimentare ale API-ului

API-ul poate oferi statistici de meci, formații, H2H, arbitru, teren și deplasare. Acestea sunt accesibile prin endpointuri separate per eveniment, deci nu pot fi cerute pentru fiecare meci fără a depăși bugetul actual de cinci cereri.

| Sursă | Date expuse | Regula de consum în aplicație |
| --- | --- | --- |
| Detaliu eveniment | antrenori, arbitru, stadion, vreme, teren, distanță, derby, teren neutru, H2H sumar | Folosit numai dacă datele există deja în feed; nu este dedus |
| Statistici eveniment | posesie, șuturi, șuturi pe poartă, xG, shotmap, momentum, poziții medii | Utilizat numai pentru meciuri live/istorice când este sincronizat; xG estimat este marcat distinct |
| Formații | XI confirmat/predicție, bancă, indisponibili, încrederea formației | Factor de context doar cu `lineup_status` explicit |
| Lot | disponibil/injury/doubtful/suspended, tip accidentare, revenire estimată | Folosit numai ca disponibilitate publicată, fără presupunere de fitness |
| Arbitru | medii de cartonașe, faulturi, penalty-uri | Doar context; nu generează selecții de cartonașe fără cotă actuală |

Documentația precizează că detaliul de eveniment include arbitru, vreme, teren, deplasare și H2H, iar subresursele oferă stats, lineups, H2H și player-stats. [2] Datele de lot disting explicit `available`, `injured`, `doubtful` și `suspended`. [3] Pentru arbitri sunt documentate agregări pe cartonașe, faulturi și penalty-uri. [4]

## Limită de integritate

Niciun factor nu este transformat în selecție dacă nu are o cotă reală asociată în feed. Statisticile lipsă rămân marcate ca indisponibile; nu sunt înlocuite cu medii inventate. Pentru piețele sau detaliile care cer apeluri suplimentare, aplicația va folosi date deja sincronizate sau va afișa explicit lipsa lor până la o extindere aprobată a bugetului de apeluri.

## Rezultat de validare cu feed real

Sincronizarea din 22 august 2026 a încheiat **5/5 cereri**, cu 60 de evenimente reale. Pentru eșantionul cotat verificat, feedul a transmis probabilități 1X2, goluri, BTTS și cornere, xG, scor probabil și încrederea modelului. Aceste valori sunt expuse în foaia de analiză împreună cu un scor de context calculat transparent. Nu au fost primite, în acest eșantion, scoruri contextuale pentru formă, H2H, lot/line-up, antrenori, arbitru, deplasare sau condiții; aplicația le enumeră ca indisponibile și nu le substituie cu valori locale.

## Referințe

[1] [BSD — Odds & predictions](https://sports.bzzoiro.com/docs/football/odds-predictions/)

[2] [BSD — Events & live scores](https://sports.bzzoiro.com/docs/football/events/)

[3] [BSD — Teams, players & transfers](https://sports.bzzoiro.com/docs/football/teams-players/)

[4] [BSD — Managers, referees & venues](https://sports.bzzoiro.com/docs/football/managers-referees-venues/)
