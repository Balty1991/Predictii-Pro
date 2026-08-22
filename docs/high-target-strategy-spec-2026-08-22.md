# Specificație upgrade strategii — 22 august 2026

## Principiu de integritate

Aplicația poate calcula o cotă acumulată mare numai din prețurile deja confirmate de feed. O țintă 10, 50 sau 100 este o **țintă matematică**, nu o recomandare de profit și nu produce selecții dacă numărul real de piețe distincte disponibile nu poate ajunge în intervalul respectiv.

## Acumulator cu ținte mari

| Țintă | Număr maxim de selecții | Regula de compunere | Afișare obligatorie |
| --- | ---: | --- | --- |
| 1,20–3,00 | 4 | Interval strict existent, evenimente și competiții distincte | Cotă totală, progres, probabilitate combinată, risc |
| 5,00–10,00 | 10 | Prețuri verificate, o piață per eveniment și competiție | Număr folosit / maxim, acoperire disponibilă, status țintă |
| 20,00–100,00 | 20 | Aceleași protecții; fără completare artificială | Acoperire reală, motiv explicit dacă ținta nu poate fi construită |

Combinația automată oprește căutarea la 20 de selecții, dar își declară limitarea când feedul curent are prea puține competiții distincte. O selecție manuală nu poate încălca aceleași reguli de eveniment sau competiție.

## Piramidă combinată

| Țintă pe pas | Componență permisă | Reguli |
| --- | --- | --- |
| 1,20–2,10 | O singură piață verificată | Modelul existent, cu interval de ±0,08 |
| 2,00–3,00 | Două până la trei piețe verificate | Meciuri distincte, fără aceeași partidă; competițiile distincte sunt preferate, iar concentrarea pe aceeași competiție este afișată explicit; interval de ±0,12 |

O candidată de Piramidă combinată arată cota produsă, fiecare componentă, probabilitatea combinată, diferența față de țintă și o etichetă explicită „combinație, nu rezultat”. Dacă nu există o combinație verificată, aplicația nu sugerează una.

## Rezultat de validare cu feedul public curent

La verificarea feedului din **22 august 2026, 07:24**, aplicația a găsit 60 de evenimente, dintre care 3 aveau 33 de prețuri reale în 11 piețe; existau 6 selecții eligibile. Toate selecțiile eligibile proveneau însă dintr-o singură competiție. Prin urmare, țintele de Acumulator **10, 20, 50 și 100** sunt disponibile ca instrument de calcul, dar nu pot fi propuse automat în mod responsabil până când feedul nu oferă acoperire diversificată suficientă.

Pentru Piramidă, ținta **2,00** a produs o combinație reală de două meciuri distincte, cu cota 2,06: *Kyoto Sanga FC — Mito Hollyhock, Peste 1,5 goluri (1,37)* și *Fagiano Okayama — Tokyo Verdy, Peste 1,5 goluri (1,50)*. Interfața marchează explicit că aceste meciuri aparțin aceleiași competiții și nu le prezintă drept diversificare maximă. La ținta 1,30, combinația 2–3 nu este propusă, deoarece nu există o candidată reală în interval.

## Verificare mobilă locală

La **390 px** și **430 px**, ecranul **Explorare** a încărcat feedul verificat și a păstrat lizibile căutarea, filtrele orizontale, semnalul de eligibilitate, cota și acțiunea contextuală. Captura inițială la 430 px a surprins starea tranzitorie de încărcare, apoi o rerandare după finalizarea feedului a confirmat cardurile, marcajul „Doar analiză” pentru piețele neeligibile și bara mobilă de navigare, fără trunchierea informațiilor esențiale.

## Verificare publică GitHub Pages

Publicarea GitHub Pages a rulat cu succes la **22 august 2026**. Pe versiunea live au fost verificate selectorul pentru țintele 10, 20, 50 și 100, trecerea corectă la limita de 10 sau 20 de selecții și mesajul onest privind acoperirea curentă de o singură competiție eligibilă. Modul Piramidă combinată a fost verificat public la ținta 2,00: afișează două meciuri reale, cota 2,06 și avertizarea de concentrare, fără a pretinde diversificare maximă sau rezultat garantat.

Verificarea interactivă live la **390 px** a confirmat selectarea unei piețe reale în Acumulator, schimbarea la ținta 10,00 și afișarea lizibilă a stării `1/10` în calculator. În Piramidă, câmpurile și selectorul de mod se păstrează în flux vertical fără depășire orizontală; cardul combinației urmează controalele în scroll-ul normal al paginii, fără a fi ascuns sau înlocuit cu date simulate.

La **430 px**, cardurile pereche ale Acumulatorului păstrează vizibile cota totală 1,37, ținta 10,00, progresul și metricile matematice. Piramida păstrează în același viewport ținta 2,00, pașii, miza, reinvestirea, comutatorul de mod, acțiunea de creare și începutul cardului de combinație cu cota 2,06. Bara de navigare inferioară rămâne accesibilă, fără acoperirea controalelor esențiale.

O verificare interactivă izolată, rulată pe versiunea publică la 390 px și 430 px, a confirmat simultan: selectarea unei piețe eligibile reale, ținta 10,00 în Acumulator, combinația de Piramidă la 2,00, crearea planului local, asocierea celor două selecții și ștergerea confirmată a planului local. Filtrul **Eligibile** din Explorare a fost aplicat cu rezultate disponibile. Toate verificările au folosit numai datele din feedul public; nu s-au inserat cote, evenimente sau rezultate.

## Explorare mobilă

Cardurile de meci păstrează piața, probabilitatea și cota, dar introduc trei semnale vizuale consistente: **Eligibilă pentru strategie**, **Doar analiză** și **Cotă verificată fără semnal eligibil**. Ecranul nu deduce istoricul, rezultatele sau formele echipelor când aceste date nu sunt în feed.
