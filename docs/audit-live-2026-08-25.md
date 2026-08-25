# Audit live — 25 august 2026

## Constatare

Versiunea publică de la `https://balty1991.github.io/Predictii-Pro/` servește un feed mai vechi decât cel din ramura principală. La verificare, pagina publică și fișierul `data/feed.json` au indicat `updatedAt: 2026-08-22T10:06:46.619Z`, în timp ce repository-ul conține actualizări ale `docs/data/feed.json` până la `2026-08-25T14:35:00Z`.

| Element | Versiunea publică | Ramura principală locală |
| --- | --- | --- |
| Timestamp feed | 22 august 2026, 10:06 UTC | 25 august 2026, 14:35 UTC |
| Stare feed | `unavailable` | `unavailable` |
| Cauză afișată | Răspuns 429 de la furnizor | Răspuns 429 de la furnizor |
| Funcții de strategie | Blocate corect, fără cote verificate | Blocate corect, fără cote verificate |

## Diagnostic

Există două probleme distincte. Prima este operațională: feedul live nu primește ultimele comiteri, deși execuțiile de actualizare și de publicare apar ca reușite. A doua este de date: plafonul furnizorului este atins, astfel încât sincronizarea salvează corect o stare de indisponibilitate, însă aplicația nu poate oferi selecții eligibile până la disponibilitatea unor cote verificabile.

Aplicația evită, în mod corect, să afișeze cote vechi drept recomandări. Rezolvarea nu trebuie să relaxeze această regulă; trebuie să îmbunătățească publicarea feedului și recuperarea de la limita furnizorului.
