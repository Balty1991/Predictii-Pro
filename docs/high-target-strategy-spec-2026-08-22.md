# Specificație strategii cu ținte mari — 22 august 2026

## Principiu de integritate

O țintă acumulată de 5,00, 10,00, 20,00, 50,00 sau 100,00 este un **calcul matematic**, nu o recomandare de profit și nu justifică adăugarea de evenimente, cote sau rezultate care nu există în feed. Pentru țintele mari, strategia este disponibilă numai când feedul are status `ready`; un feed parțial, stale sau indisponibil poate fi analizat, dar nu poate fi folosit pentru propunere, selecție sau salvare.

## Acumulator prudent

| Nivel | Cote admise | Criterii minime suplimentare | Construcție |
| --- | --- | --- | --- |
| 1,20–3,00 | Regula strictă a pieței eligibile | O piață per meci și competiții distincte | Cel mult 4 selecții |
| 5,00–100,00 | Numai cote reale între 1,20 și 1,70 | Probabilitate ≥58%, încredere API ≥55%, context ≥55/100, edge ≥1 pp și valoare estimată pozitivă | Cel mult 20 de meciuri distincte |

Pentru fiecare țintă prudentă, aplicația calculează media cotelor eligibile pe meci distinct și estimează numărul necesar de selecții cu `ceil(log(țintă) / log(media cotelor))`. Mesajul **„Acoperire prudentă”** arată atât estimarea, cât și numărul de meciuri reale disponibile. Aceasta este o măsură de acoperire, nu o promisiune că ținta va fi atinsă.

> Dacă nu există suficiente meciuri reale sau dacă nicio combinație de până la 20 de selecții nu intră în intervalul țintei, aplicația golește selecția curentă și nu propune un bilet parțial. Nu completează combinația cu cote de 2,03, 2,46, 3,53 sau cu orice altă cotă în afara regulii prudente.

Pentru țintele controlate, competițiile distincte sunt preferate. Pentru țintele mari, pot apărea meciuri distincte din aceeași competiție numai dacă feedul real le oferă; concentrarea este afișată ca risc, nu prezentată drept diversificare.

## Piramidă combinată

| Țintă pe pas | Componență permisă | Reguli |
| --- | --- | --- |
| 1,20–2,10 | O piață verificată | Interval de ±0,08 |
| 2,00–3,00 | Două până la trei piețe verificate | Meciuri distincte; concentrarea pe aceeași competiție este afișată |

O candidată de Piramidă combinată arată cota produsă, componentele, probabilitatea combinată, diferența față de țintă și avertizarea de concentrație atunci când este cazul. Dacă feedul nu poate verifica o combinație, aplicația nu sugerează una și nu inventează rezultate.

## Rezultat de validare cu feedul public curent

La ultima sincronizare publică disponibilă, furnizorul a răspuns cu **429** la prima cerere de predicții. Feedul public are prin urmare status `unavailable`, consemnează o singură cerere efectuată și păstrează eventualele prețuri mai vechi exclusiv pentru analiză. Controalele de propunere și salvare ale Acumulatorului sunt dezactivate vizibil până la o sincronizare verificată.

O validare de acoperire cu cote mici trebuie reluată numai după o fereastră de răcire rezonabilă și un workflow reușit. Criteriile de acceptare sunt: status `ready`, cel mult cinci apeluri externe, piețe batch mapate din răspunsul real și nicio selecție automată peste 1,70 pentru țintele de minimum 5,00. Rezultatul vechi de cotă 10,39 construit cu trei cote peste 2,00 este arhivat ca observație istorică și **nu** respectă politica curentă.

## Verificare mobilă

Verificarea publică anterioară la 390 px și 430 px a confirmat structura mobilă, selectorul de țintă, jurnalul local și Piramida combinată din date verificate atunci disponibile. Verificarea interactivă a modului prudent pentru 10,00, 20,00, 50,00 și 100,00 rămâne condiționată de un feed `ready`; nu este declarată ca realizată în timpul rate-limitării furnizorului.

După publicarea regulii fără bilet parțial, versiunea live a fost verificată la ținta 10,00. Interfața afișează `0/20` atât în rezumatul Acumulatorului, cât și în controlul de risc; identifică modul „Țintă mare prudentă” și păstrează acțiunile dezactivate cât timp feedul este indisponibil. Aceasta confirmă comportamentul de protecție, nu acoperirea reală a unei combinații.

## Limitări explicite

Returul potențial, profitul potențial, probabilitatea combinată și valoarea estimată sunt calcule bazate pe miză, cote și model. Nu reprezintă rezultate confirmate, venit sau profit garantat.
