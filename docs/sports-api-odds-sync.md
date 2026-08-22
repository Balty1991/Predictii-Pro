# Sincronizarea cotelor Sports Data API

Aplicația utilizează feedul public `GET /api/v2/odds/best/` pentru piețele `1x2`, `over_under_15`, `over_under_25` și `btts`, într-o fereastră de date a meciurilor viitoare. Această abordare înlocuiește cererile individuale de cote pe eveniment și reduce semnificativ numărul de apeluri către furnizor.

O sincronizare normală folosește maximum **cinci cereri Sports Data API**: una pentru predicțiile viitoare și patru pentru piețele de cote de mai sus. Numărul este persistat în rezumatul rulării de sincronizare ca `externalCalls`. Actualizarea manuală are un cooldown server-side de 20 de minute; apăsările repetate nu pornesc alte cereri externe.

După citirea feedului în lot, aplicația procesează cel mult opt evenimente viitoare care au cel puțin o cotă reală între 1,20 și 2,10. Acesta este intervalul util pentru acumulatoare și pașii de piramidă; evenimentele fără preț real sau cu cote în afara intervalului nu sunt sincronizate ca selecții de strategie.

Cheia gratuită primește prețuri consensuale, nu cotele individuale per bookmaker. Sincronizarea trebuie să solicite doar prețuri reale; în lipsa lor, aplicația nu generează acumulatoare sau recomandări de piramidă artificiale.

Conform documentației furnizorului, limita planului gratuit este de 7.500 de cereri pe zi, cu resetare la 00:00 UTC. Jobul `sports-daily-refresh` rulează la 00:10 UTC pentru a folosi o cotă reînnoită. Pentru sursa și parametrii compleți, consultați [Odds & predictions](https://sports.bzzoiro.com/docs/football/odds-predictions/) și [Conventions & limits](https://sports.bzzoiro.com/docs/conventions/#rate-limits).

## Piața de predicții externă și consensul

Furnizorul oferă probabilități de piață prin endpointul per-eveniment `GET /api/v2/events/{id}/polymarket/`. Acesta poate răspunde cu `404` când nu există piață activă și ar necesita câte o cerere suplimentară pentru fiecare eveniment. Pentru a respecta plafonul aprobat de maximum cinci cereri pe sincronizare, aplicația nu îl interoghează automat.

Consensul activ compară probabilitatea modelului cu probabilitatea implicită din cota reală și marchează explicit piața de predicții externă drept neinterogată din motive de buget. Nu sunt fabricate probabilități de piață terță.
