# Sincronizarea cotelor Sports Data API

Aplicația utilizează feedul public `GET /api/v2/odds/best/` pentru piețele `1x2`, `over_under_15`, `over_under_25`, `over_under_35` și `btts`, într-o fereastră de date a meciurilor viitoare. Această abordare înlocuiește cererile individuale de cote pe eveniment și reduce semnificativ numărul de apeluri către furnizor.

Cheia gratuită primește prețuri consensuale, nu cotele individuale per bookmaker. Sincronizarea trebuie să solicite doar prețuri reale; în lipsa lor, aplicația nu generează acumulatoare sau recomandări de piramidă artificiale.

Conform documentației furnizorului, limita planului gratuit este de 7.500 de cereri pe zi, cu resetare la 00:00 UTC. Jobul `sports-daily-refresh` rulează la 00:10 UTC pentru a folosi o cotă reînnoită. Pentru sursa și parametrii compleți, consultați [Odds & predictions](https://sports.bzzoiro.com/docs/football/odds-predictions/) și [Conventions & limits](https://sports.bzzoiro.com/docs/conventions/#rate-limits).
