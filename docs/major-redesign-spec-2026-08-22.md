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

Ecranul **Explorare** a fost validat prin deep-link public la 390 px și 430 px. Ambele randări păstrează câmpul de căutare, benzile derulabile de filtre, cardurile de meci şi bara inferioară fără suprapunere. Pe feedul live, filtrele au returnat: Semnale API **60**, Cu cotă **3**, Eligibile **3**, Model + valoare **2**, Rată 60%+ **54** şi competiția J1 League **7** carduri. Valorile reflectă definițiile UI ale filtrului, nu rate de câștig.

## Măsurare de încărcare live

Măsurarea a fost făcută prin cereri HTTP către GitHub Pages, cu agent mobil Android şi cache-busting, la cele două lățimi de referință. Aceste valori sunt un control de regresie al livrării statice în mediul de test, nu o promisiune pentru o rețea mobilă reală.

| Lățime simulată | Document UI | Feed JSON | Observație |
| --- | --- | --- | --- |
| 390 px | 45.867 B; TTFB 0,178 s; total 0,188 s | 62.859 B; TTFB 0,113 s; total 0,125 s | Același payload static, fără imagini grele. |
| 430 px | 45.867 B; TTFB 0,083 s; total 0,094 s | 62.859 B; TTFB 0,062 s; total 0,074 s | CSS responsive; nu se livrează bundle suplimentar pentru lățime. |

În browser, Navigation Timing a raportat documentul la 12.819 B transferați, `DOMContentLoaded` la 115 ms şi `load` la 173 ms; resursa `feed.json` a avut 5.408 B transferați în cache-ul acelui test. Diferențele față de măsurarea HTTP sunt normale: cache-ul, compresia şi momentul cererii diferă.

## Validare mobilă a strategiilor

Deep-link-ul `?tab=strategies` a fost randat pe live la 390 px şi 430 px pentru **Acumulator**, iar `?tab=strategies&strategy=pyramids` pentru **Piramidă**. În ambele lățimi, titlul, selectorul de mod, formularul, acțiunile de cel puțin 44 px şi bara de navigare rămân vizibile fără tabel orizontal. Piramida a afișat numai candidata verificată la 1,37 din intervalul țintei 1,30; Acumulatorul a păstrat explicit regula de evenimente şi competiții distincte.

Deep-link-ul `?tab=journal` a fost verificat la 390 px şi 430 px. Jurnalul a păstrat grila de patru metrici, starea goală informativă, măsura de risc şi bara inferioară fără suprapuneri. Într-o sesiune cu date locale, jurnalul a afișat cronologic analizarea, propunerea Acumulatorului, asocierea şi ștergerea Piramidei; în sesiunea izolată de randare, starea goală a rămas explicită şi corectă.

## Checklist live al navigării directe

| URL verificat | Zonă deschisă | Rezultat |
| --- | --- | --- |
| `?tab=today` | Azi | A afișat statusul feedului, shortlistul de trei analize şi rezumatul de risc. |
| `?tab=explore` | Explorare | A afișat lista de 60 de evenimente, căutarea şi filtrele. |
| `?tab=strategies` | Strategii / Acumulator | A afișat combinatorul cu cotă țintă, miză şi regula de diversificare. |
| `?tab=strategies&strategy=pyramids` | Strategii / Piramidă | A afișat formularul de plan şi candidata reală din interval. |
| `?tab=journal` | Jurnal | A afișat metricile locale şi jurnalul de decizie. |

Fluxul live **Azi → Explorare → Analiză → Strategii/Acumulator → Piramidă → Jurnal** a fost parcurs cu feedul public. Piața reală a fost analizată, adăugată în strategie, propunerea 1,40 a rămas în intervalul permis, iar Piramida a fost creată, asociată cu o selecție verificată şi apoi ștearsă prin confirmare. Nu a fost executat niciun pariu şi nu sunt declarate rezultate sau venituri.

## Extindere piețe de consens fără apeluri suplimentare

Generatorul folosește acum toate cele **11 piețe de consens** ale shortcutului per-eveniment: 1X2, Peste/Sub 1.5, 2.5 și 3.5 goluri, plus Ambele marchează Da/Nu. Sincronizarea live a rămas la **5/5 cereri**, cu 60 de evenimente, 33 de cote reale pe trei evenimente şi şase piețe eligibile pentru strategie. Cotele în afara condițiilor de risc rămân consultabile, dar sunt marcate **„Doar analiză”** şi sunt blocate atât vizual, cât şi prin validarea funcției de selecție. La 390 px şi 430 px, cardul extins păstrează butonul eligibil şi starea dezactivată fără depășire orizontală.

## Acumulator: calculator de cotă şi miză

Acumulatorul afișează acum separat **cota totală**, ținta, intervalul permis, diferența față de țintă şi o bară de progres. Pentru orice selecție verificată, calculează automat miza, returul potențial, profitul potențial, probabilitatea combinată, probabilitatea implicită şi valoarea estimată; etichetele explică faptul că acestea sunt calcule, nu rezultate garantate.

Pe versiunea live, selecția reală Kyoto Sanga FC — Mito Hollyhock / Peste 1.5 goluri a afișat cota totală **1,37** pentru ținta **1,40**, statutul „În interval”, probabilitatea model **87,2%**, returul matematic **13,70 unități** şi profitul matematic **3,70 unități** la miza 10. Schimbarea țintei la 2,00 a actualizat imediat statutul în „Sub țintă”; schimbarea mizei la 25 a actualizat returul la **43,75 unități** şi profitul la **18,75 unități**. La 390 px şi 430 px, starea fără selecție păstrează toate controalele şi mesajele fără depășire orizontală; verificarea mobilă a unei combinații populate rămâne deschisă în tracker.

La salvare, Acumulatorul păstrează local cota totală, ținta, miza, returul matematic, profitul matematic şi probabilitatea modelului. Lista „Salvate local” le afișează separat şi declară explicit că biletul este nedecontat. În starea fără selecții, returul şi profitul revin la 0,00 în loc să afișeze artificial o pierdere.
