# Diagnostic feed și cote — 22 august 2026

Versiunea publică este disponibilă direct la [GitHub Pages](https://balty1991.github.io/Predictii-Pro/) și folosește un feed static actualizat prin workflow-ul GitHub programat la 00:10 UTC. Cheia este folosită numai în execuția securizată a workflow-ului și nu este inclusă în HTML, JavaScript sau în feedul public.

## Rezultat verificat

| Verificare | Rezultat | Efect în aplicație |
|---|---:|---|
| Endpoint predicții | răspunde cu evenimente viitoare reale | Meciurile sunt afișate în GitHub Pages. |
| Endpoint agregat de cote `/odds/best/` | răspuns 403 | Nu este folosit pentru construirea biletelor. |
| Endpoint direct de cote `/odds/?event_id=…` | răspuns valid cu `count: 0` pentru evenimentele viitoare verificate | Nu există cote reale de validat; biletele și pașii de piramidă rămân blocați. |
| Feed public | patru evenimente reale viitoare, zero selecții eligibile | Interfața nu fabrică piețe, cote sau recomandări. |

Documentația furnizorului confirmă folosirea antetului `Authorization: Token <cheie>` pentru fiecare cerere și indică faptul că o cotă `null` înseamnă indisponibilitatea prețului pentru piața respectivă. [1]

> Când furnizorul nu livrează cote verificabile, Predicții Pro afișează evenimentele reale și explică blocarea strategiilor; nu transformă predicțiile în bilete simulate.

## Condiția pentru bilete reale

La următoarea sincronizare, aplicația va publica selecții numai dacă cel puțin una dintre cele patru cereri directe de cote întoarce un preț valid, în intervalul controlat 1,20–2,10. Abia atunci filtrele „Eligibile”, Acumulatorul și Piramida locală pot utiliza selecții reale.

## Referințe

[1] [BSD — API Documentation](https://sports.bzzoiro.com/docs/)
