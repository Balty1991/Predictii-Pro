# Audit de acoperire a feedului — 22 august 2026

Auditul a fost făcut cu două cereri autorizate, pe intervalul 22–29 august 2026, apoi fără cereri suplimentare prin analizarea răspunsurilor salvate.

| Indicator | Rezultat verificat | Implicație în GitHub Pages |
|---|---:|---|
| Predicții raportate de furnizor în interval | 461 | Există suficient volum pentru un feed mai larg. |
| Predicții returnate în prima pagină | 200 | Feedul public poate selecta o fereastră reprezentativă fără paginare suplimentară. |
| Evenimente raportate de furnizor | 725 | Endpointul oferă acoperire mult peste lista inițială. |
| Predicții cu încredere de model | 200 din 200 | Încrederea poate fi afișată separat de cota reală. |
| Predicții cu recomandări/piețe | 200 din 200 | Semnalele furnizorului pot fi prezentate transparent. |
| Evenimente publicate în aplicație | 60 | Lista nu mai este limitată artificial la patru evenimente. |
| Cote directe pentru primele patru evenimente | 0 | Semnalele nu devin bilete până nu există prețuri verificabile. |

Feedul static publică acum până la 60 de evenimente viitoare, cu primele trei semnale calculate de furnizor și încrederea modelului. Cotele directe continuă să fie verificate numai pentru primele patru evenimente, păstrând plafonul de maximum cinci cereri pe sincronizare.

> Predicțiile și probabilitățile sunt informații analitice, nu promisiuni de profit. Un bilet este permis numai după validarea unei cote reale.

## Referință

[1] [BSD Sports API — documentație](https://sports.bzzoiro.com/docs/)
