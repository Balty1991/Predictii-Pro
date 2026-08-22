# Validare randare mobilă — 22 august 2026

## Domeniu verificat

Aplicația statică din `docs/` a fost randată local cu feedul real curent la lățimi de **390 px** și **430 px**. Feedul a raportat 60 de evenimente reale, șase piețe eligibile cu cote de consens și trei selecții etichetate transparent drept „Model + valoare”.

| Suprafață | Rezultat observat |
| --- | --- |
| Meniu | Cele patru zone Meciuri, Acumulatoare, Piramide și Istoric rămân pe un singur rând, cu ținte de minimum 44 px. |
| Ierarhie | Antetul, starea feedului, sumarul și metricile rămân lizibile fără suprapuneri la 390 px și 430 px. |
| Filtre | Benzile pentru calitatea semnalului și competiții folosesc derulare orizontală, fără tabel sau depășire de layout. |
| Card de meci | Ora, echipele, competiția, semnalele și eticheta cotei verificate se păstrează în flux vertical; piețele cu cote reale folosesc acțiuni late, potrivite pentru atingere. |
| Integritate | Evenimentele fără cotă arată numai semnale informative; nu oferă acțiunea de adăugare în bilet. |

## Maparea filtrelor de Meciuri

| Filtru | Sursă de date | Efect verificat |
| --- | --- | --- |
| Toate | Feed complet | Revine la toate evenimentele din interval. |
| Semnale API | `providerSignals` | Arată numai evenimentele pentru care furnizorul a transmis cel puțin un semnal. |
| Cu cotă | `selections` | Arată evenimentele care au cel puțin o piață cu preț verificat. |
| Eligibile | `selections[].eligible` | Arată evenimentele ce conțin cel puțin o piață permisă pentru strategie. |
| Recomandate | recomandare model sau furnizor | Separă semnalele operaționale; eticheta UI nu pretinde recomandare furnizor când nu există. |
| Rată 60%+ | încredere sau probabilitate de semnal | Arată evenimentele cu încredere a furnizorului de cel puțin 60% sau un semnal cu probabilitate de cel puțin 70%. |
| Competiție | `competition` | Restrânge independent lista la liga selectată. |

## Verificări de comportament

În browser, filtrul **Semnale API** a fost activat separat și a păstrat în listă exclusiv carduri cu `providerSignals`; în feedul curent au fost 12 carduri vizibile și niciunul fără semnale. O propunere automată pentru ținta 1,40 a selectat o singură piață reală la cota 1,37, aflată în intervalul permis 1,32–1,52. Crearea și ștergerea confirmată a unei piramide locale au fost de asemenea verificate. Validarea interactivă pe un telefon fizic publicat rămâne separată în tracker.
