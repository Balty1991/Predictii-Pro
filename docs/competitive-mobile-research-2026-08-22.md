# Cercetare competitivă mobilă — 22 august 2026

## Scop

Analiza urmărește modele de produs transferabile pentru Predicții Pro: **descoperirea rapidă a unui meci**, **analiza transparentă**, **construirea unei strategii exclusiv din cote confirmate** și **urmărirea deciziilor locale**. Nu sunt preluate afirmații comerciale privind profitul și nu sunt construite funcții de pariere cu bani reali.

## Constatări din aplicații publice

| Referință | Funcții declarate public | Lecție transferabilă pentru Predicții Pro | Decizie de produs |
| --- | --- | --- | --- |
| BetMines | Statistici pe echipă și ligă, favourite, urmărire live, intervale de cotă și constructor de combinații pe criterii. [1] | Un flux de creare a unei combinații trebuie să pornească de la criterii clare, nu de la o listă lungă de meciuri. | Construim o zonă „Radar” cu selecții verificate, reguli de risc și explicații compacte pentru fiecare alegere. |
| BetAnalysis | Formă, H2H, performanță acasă/deplasare, context de ligă, disponibilitatea lotului, listă de urmărire și evenimente live; precizează că insighturile sunt informaționale, nu garanții. [2] | Analiza trebuie să explice **de ce** apare un semnal și să păstreze decizia la utilizator. | Introducem analiza de meci pe straturi: semnal, cotă, probabilitate, edge, context disponibil și risc de date. |
| SuperTips | Piețe standard, analiză pe statistici/formă/xG/context și formulare explicită privind caracterul informațional al predicțiilor. [3] | Piețele trebuie ordonate după utilitate şi încredere, nu amestecate cu afirmații de certitudine. | Păstrăm doar piețe ale furnizorului cu preț verificat; etichetele disting „Model + valoare”, „Analiză” și „Semnal furnizor”. |
| Principii UX mobile | Navigarea evidentă, reducerea pașilor și încrederea sunt esențiale în contexte cu timp limitat. [4] | Aplicația trebuie să expună acțiunea relevantă imediat, cu stări de date clare și fără un flux aglomerat. | Reproiectăm primul ecran ca „Azi”: un rezumat, shortlist, filtre rapide, feed ordonat și o bară mobilă de decizie. |

## Lacune identificate în versiunea actuală

Versiunea publică actuală are integritate bună a datelor, filtre și strategii locale, însă primele ecrane sunt încă prea apropiate de un dashboard de administrare. Utilizatorul vede prea devreme filtre, metrici și carduri dense, înainte de a primi un răspuns la întrebarea mobilă principală: **„ce evenimente merită analizate acum și de ce?”**

Redesignul major trebuie să mute prioritatea spre un „shortlist” explicabil, să păstreze feedul complet ca nivel secundar şi să transforme Piramidele şi Acumulatoarele din formulare izolate în spații de lucru cu progres, control al expunerii şi reguli vizibile. Câștigul țintit este **viteza şi calitatea deciziei**, nu o promisiune de venit sau profit.

## Principii de implementare

> „Integritatea datelor înaintea conversiei”: o piață fără cotă verificată rămâne informativă, nu devine selecție. Probabilitatea, edge-ul și scorul nu garantează un rezultat.

| Principiu | Aplicare concretă |
| --- | --- |
| Decizie în două atingeri | „Azi” deschide direct shortlistul; o atingere deschide analiza meciului, iar o a doua poate adăuga numai o piață verificată în spațiul de strategie. |
| Explicabilitate progresivă | Cardul arată piața, cota, probabilitatea, edge-ul și prospețimea; analiza extinsă arată semnalele şi contextul disponibil. |
| Control al riscului | O strategie afișează intervalul de cotă, numărul de selecții, diversificarea pe evenimente/competiții și avertismentele de concentrare. |
| Stare de date | Feedul arată momentul actualizării, numărul real de cereri şi diferența dintre semnale fără preț şi selecții eligibile. |
| Performanță mobilă | Fără biblioteci mari suplimentare, fără imagini decorative critice şi fără liste întregi randate înainte de nevoie. |

## Audit de capabilități API pentru următoarea versiune

Documentația furnizorului confirmă că API-ul gratuit include evenimente, scoruri live, detalii de meci, statistici, lineups, incidente, H2H, cote pre-meci și predicții de model. [5] Pentru liga/echipă sunt disponibile clasamentele, forma recentă, disponibilitatea lotului și programul. [6] [7] Acestea sunt suficiente pentru o analiză explicabilă, cu condiția ca datele să fie prezentate ca disponibilitate reală, nu presupuneri.

| Capacitate confirmată | Utilizare propusă | Regula de buget şi integritate |
| --- | --- | --- |
| `/predictions/` şi `/events/{id}/prediction/` | Probabilități pe piețe, confidence și semnale model. | Rămâne sursa principală a feedului; un apel acoperă lista de evenimente. |
| `/events/{id}/odds/` | Cote de consens, actualizarea şi următoarea reîmprospătare pentru un meci. | Se folosesc numai pentru evenimentele prioritare; fără parametrul `limit`; maximum patru apeluri după lista de predicții. |
| `/events/{id}/` | Context de meci: arbitru, teren, vreme, deplasare, H2H de nivel sumar şi marcaje de derby/teren neutru. | Nu se adaugă în actualizarea standard. Se activează numai la deschiderea analizei detaliate sau într-un cache separat, după validarea costului. |
| `/events/{id}/lineups/` şi `/teams/{id}/squad/` | XI confirmat/predicție, încredere şi indisponibilități. | Se tratează explicit `unavailable`; nu se deduce că un jucător este apt doar pentru că are statut implicit disponibil. |
| `/events/{id}/stats/` şi `/h2h/` | xG, șuturi, momentum şi întâlniri directe, utile mai ales după start sau pentru analiză aprofundată. | Nu se folosesc ca semnale inventate. Câmpurile xG estimate sunt etichetate distinct față de cele măsurate. |
| `/leagues/{id}/standings/` | Formă, poziție, zonă de calificare/promovare/retrogradare. | Se încarcă doar pentru competiția deschisă sau se preprocesează într-un feed separat cu cache; nu în bucla de cinci apeluri. |
| `/events/live/` | Urmărire de scor, minut şi stare live. | Este o etapă separată de versiunea pre-meci; pollingul respectă cadența documentată, nu se face agresiv. |

> API-ul confirmă că valorile `updated_at` ale cotelor arată ultima observare, nu neapărat o mișcare a prețului. Direcția reală trebuie dedusă din câmpurile de mișcare şi diferența dintre cota curentă, anterioară şi de deschidere, atunci când feedul de cote le furnizează. [8]

### Direcție de implementare

Noul produs va separa **feedul zilnic pre-meci**, care păstrează plafonul de cinci apeluri, de **analiza la cerere**: utilizatorul deschide un meci, iar aplicația afișează numai contextul deja publicat sau anunță clar că detaliul nu este încă disponibil. Orice extindere a sincronizării automate pentru context, loturi sau clasament va cere un audit separat de apeluri înainte de activare.

## Referințe

[1]: https://play.google.com/store/apps/details?id=com.betmines&hl=en_US "BetMines Betting Predictions — Google Play"
[2]: https://play.google.com/store/apps/details?id=com.tikon.betanaliz&hl=en_US "BetAnalysis — Google Play"
[3]: https://play.google.com/store/apps/details?id=com.akilliuygulamalar.expertbettingtips&hl=en_US "SuperTips — Google Play"
[4]: https://www.fullstory.com/blog/optimize-sports-betting-apps/ "Keeping users’ heads in the game: Optimizing mobile sports betting apps"
[5]: https://sports.bzzoiro.com/docs/football/ "BSD Football API overview"
[6]: https://sports.bzzoiro.com/docs/football/events/ "BSD Events & live scores"
[7]: https://sports.bzzoiro.com/docs/football/leagues/ "BSD Leagues, seasons & standings"
[8]: https://sports.bzzoiro.com/docs/football/odds-predictions/ "BSD Odds & predictions"
