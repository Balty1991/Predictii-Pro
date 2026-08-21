# Direcție de refacere: tabloul de decizie

## Problemă identificată

Fluxul actual afișează predicțiile ca o succesiune de carduri dense. Deși fiecare card conține date utile, repetarea acelorași blocuri reduce scanabilitatea și face competițiile, orele de start și selecțiile prioritare greu de comparat.

## Noua structură

1. **Prioritate editorială.** O singură selecție prioritară rămâne în partea superioară. Aceasta nu concurează cu restul fluxului, ci explică imediat ce este relevant.
2. **Semnal de moment.** Predicțiile sunt împărțite în ferestre de start și apoi în grupe sport–competiție, cu antete stabile și număr de selecții.
3. **Rânduri de decizie.** Fiecare meci folosește un rând compact: oră, echipe, piață, cotă, probabilitate, edge și statut. Analiza extinsă, motivele și acțiunile rămân disponibile numai la deschidere.
4. **Strategie operațională.** Un pas de piramidă nu este doar o miză calculată. El va primi o listă ordonată de evenimente eligibile în intervalul său de cote, iar utilizatorul poate asocia direct o recomandare sau un acumulator rezultat la pasul activ.

## Criterii de acceptanță

O utilizare curentă trebuie să permită identificarea în câteva secunde a sportului, competiției, orei, selecției și cotei. Detaliile AI sau metricele secundare nu trebuie să ocupe spațiu înainte ca utilizatorul să le solicite. Piramida trebuie să prezinte recomandări reale, filtrate pe cotă, valoare și statut al evenimentului.
