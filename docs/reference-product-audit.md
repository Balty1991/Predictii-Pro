# Audit comparativ: VEYRA, BETPREDICT și Predicții Pro

## Observații confirmate

VEYRA este prezentată ca aplicație de analiză sportivă cu predicții ML5 și urmărire a performanței. Planul său de evoluție propune separarea dintre istoricul intern, istoricul brut al API-ului și un laborator AI bazat pe seturi de date istorice, cu evaluare temporală, modele distincte pe piață și monitorizarea calibrării.

BETPREDICT 2.0 structurează produsul în module orientate pe decizie: CLV, asistent de piramidă, insight AI, alerte de valoare, heatmap de performanță, scor contextual și alerte live.

În experiențele publice observate, VEYRA prioritizează o pagină de control densă, cu disponibilitate a predicțiilor ML, contor de meciuri, bankroll și două trasee piramidale explicite. BETPREDICT folosește o ierarhie mai concentrată, cu indicatori sintetici pentru meciuri urmărite, verdicte, selecții calificate și acumulatoare, plus un mesaj clar atunci când filtrele de risc nu aprobă niciun pariu.

## Direcția Predicții Pro

Predicții Pro păstrează fundația full-stack pentru acces securizat la API, rezultate verificate, favorite, notificări și actualizare programată. Evoluția trebuie să privilegieze o suprafață de decizie compactă, dovezi verificabile pentru fiecare selecție și un traseu clar de la predicție la rezultat, bilet și performanță.

| Domeniu | Reper existent | Standard Predicții Pro |
|---|---|---|
| Încredere | Scoruri și explicații generale | Evidență compactă: probabilitate, cotă corectă, edge, mișcare de cotă, statut de valoare și motiv AI |
| Performanță | Heatmap și CLV | Indicatori doar din rezultate confirmate, cu separare explicită între volum insuficient și performanță validată |
| Strategii | Pyramid Assistant | Acumulator salvat, progres per selecție, miză/profit/pierdere, decontare automată și piramidă configurabilă |
| Date istorice | Warehouse și training lab | Module separate pentru istoric de predicții, istoric API și evaluare fără amestecarea datelor brute cu concluzii |
| Automatizare | Workflow zilnic | Sincronizare auditabilă, protejată de chei server-side și notificări la predicții noi sau rezultate confirmate |

## Criterii de diferențiere

1. **Timp de decizie redus:** o selecție expune dintr-o privire probabilitatea, prețul curent, cota corectă, edge-ul și avertizarea de degradare.
2. **Fără promisiuni neverificabile:** performanța, statisticile și profitul sunt calculate doar din rezultate confirmate.
3. **Strategii controlate:** automatizarea propune și monitorizează; nu ascunde riscul, corelațiile sau pierderea potențială.
4. **Arhitectură extensibilă:** istoricul brut, evaluarea și AI-ul rămân decuplate de interfața operațională.
5. **Stări goale informative:** când nu există selecții eligibile, aplicația explică limita de risc activă și nu simulează oportunități.
