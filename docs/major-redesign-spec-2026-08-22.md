# Specificație de redesign major — Predicții Pro

## Poziționare

Predicții Pro devine o aplicație mobilă de **analiză a deciziilor sportive**, nu un agregator de tipuri sau un formular de simulare. Produsul trebuie să ajute utilizatorul să observe ce este disponibil, să înțeleagă semnalul, să verifice cota și să țină local evidența unei decizii. Nu se afirmă şi nu se garantează venit sau profit.

## Arhitectura mobilă

| Zonă | Întrebarea utilizatorului | Conținut principal | Acțiune de bază |
| --- | --- | --- | --- |
| Azi | „Ce merită analizat acum?” | Rezumat de feed, shortlist de analize prioritare, stare cote, structură de risc. | Deschide analiza unei selecții verificate. |
| Explorară | „Ce alte meciuri şi semnale există?” | Căutare locală, competiții, filtre, listă progresivă şi toate semnalele disponibile. | Adaugă numai piața cu cotă verificată în spațiul de lucru. |
| Strategii | „Cum construiesc o combinație sau un plan?” | Segmente Acumulator/Piramidă, profil de cotă, expunere, diversificare şi progres local. | Cere combinație verificată sau asociază selecția la pasul activ. |
| Jurnal | „Ce am analizat şi salvat?” | Bilete, planuri, metrice locale şi reguli de evaluare. | Consultă decizii salvate; fără decontare inventată. |

Pe mobil, navigarea devine o bară inferioară persistentă cu patru ținte mari. Antetul rămâne compact şi informativ; nu mai ocupă primul ecran cu un mesaj de marketing. Pe desktop, aceeași arhitectură se afișează într-o bară superioară contextuală.

## Ierarhia ecranului „Azi”

Primul viewport trebuie să arate **un statut real**, **un shortlist** și **următorul pas**, înainte de filtre sau de 60 de evenimente.

| Ordine | Componentă | Date | Rol |
| --- | --- | --- | --- |
| 1 | Bară de stare | momentul feedului, apeluri, evenimente, piețe eligibile | Încredere şi prospețime. |
| 2 | Panou de context | selecții cu preț confirmat, semnale de model, stare de risc | Răspuns rapid la disponibilitate. |
| 3 | „Analize prioritare” | maximum trei selecții eligibile, ordonate după valoare estimată şi edge | Intrare rapidă în analiză; nu este o promisiune de rezultat. |
| 4 | Alertă de integritate | diferența dintre semnal, cotă verificată şi selecție eligibilă | Previne interpretarea greșită. |
| 5 | Acces la explorare | toate evenimentele şi filtrele | Păstrează detaliul ca nivel secundar. |

## Analiză de meci

Analiza deschisă dintr-un card folosește strict datele existente în feed. Ea are patru blocuri: **piață şi preț**, **probabilitate şi edge**, **semnale disponibile** şi **stare de actualizare a cotei**. Când datele de context extins nu sunt în feed, interfața spune „indisponibil în sincronizarea curentă”; nu fabrică formă, accidentări sau statistici.

Se păstrează o cale de extindere către detaliu de meci, lineups, statistici şi clasamente, însă aceasta rămâne în afara sincronizării zilnice până la stabilirea unui buget de apeluri separat.

## Reguli pentru strategii

| Regula | Acumulator | Piramidă |
| --- | --- | --- |
| Sursă selecții | Numai `eligible === true` şi cote reale. | Numai `eligible === true` şi cotă în interval. |
| Diversificare | Maximum patru selecții; niciodată două din același eveniment sau aceeași competiție în propunerea automată. | Un singur eveniment real pentru pasul activ. |
| Interval | Ținta trebuie atinsă în fereastra `țintă - 0,08` până la `țintă + 0,12`. | Ținta are toleranță explicită ±0,08. |
| Risc | Afișează cotă totală, probabilitate combinată, valoare estimată şi numărul de selecții. | Afișează pas, miză locală, reinvestire, cotă şi selecție asociată. |
| Rezultat | Salvat local şi nedecontat până la confirmare reală. | Plan local; fără pași marcați câștigați/pierduți manual. |

## Model de date extins fără apeluri suplimentare

Generatorul folosește în continuare un apel pentru predicții şi maximum patru shortcuturi per-eveniment pentru cote. El va adăuga la obiectele deja primite, fără a interoga alte rute:

| Câmp | Origine | Utilizare UI |
| --- | --- | --- |
| `expectedGoals` | `prediction.markets.expected_goals` | Context model compact în analiza de meci. |
| `mostLikelyScore` | `prediction.markets.score.most_likely` | Etichetă contextuală, nu predicție de pariat. |
| `oddsFreshness` | `last_update_at`, `next_update_at`, `update_interval_seconds`, `update_reason` din shortcutul cotei | Etichetă de prospețime şi momentul următoarei actualizări. |
| `requestPriority` | scor local determinist din confidence, probabilitate şi diversificarea pe competiții | Explică de ce numai patru evenimente primesc cote în bugetul curent. |
| `analysisFacts` | probabilități de piață şi semnale existente | Conținut pentru detaliu fără API suplimentar. |

## Măsuri de performanță

Redesignul nu adaugă framework, biblioteci sau imagini grele. Lista completă se randază progresiv; cardurile detaliate se construiesc doar când utilizatorul le deschide. CSS-ul este mobile-first, cu 44 px pentru acțiunile principale şi `prefers-reduced-motion`. Fereastra de start prezintă maximum trei analize, nu 60 de carduri.

## Notă de validare mobilă intermediară

Randările locale la **390 px** şi **430 px** confirmă structura mobilă nouă: antet compact, primul card de decizie lizibil, metrici pe trei coloane, alertă de integritate şi navigare inferioară cu patru ținte tactile.

După publicare, versiunea GitHub Pages a fost verificată la aceleași lățimi cu feedul complet: **60 de evenimente**, **6 piețe eligibile**, **3 analize prioritare** şi **5/5 cereri externe**. La 390 px, conținutul prioritar rămâne vizibil deasupra navigării inferioare; la 430 px, cardurile prioritare şi cele două acțiuni secundare rămân lizibile fără depășire orizontală. Pe versiunea live au fost verificate: deschiderea analizei, afișarea xG/scor model doar când există în feed, adăugarea unei piețe reale în spațiul de strategie, propunerea automată 1,40 în intervalul 1,32–1,52, crearea/atașarea și ștergerea confirmată a unei piramide locale. Testul de risc a blocat a doua piață din același eveniment.
