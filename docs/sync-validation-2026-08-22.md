# Validare sincronizare după resetarea cotei — 22 august 2026

Jobul `sports-daily-refresh` este activ, are expresia `0 10 0 * * *` și următoarea execuție la 23 august 2026, 00:10 UTC. Execuția automată din 22 august a primit un payload `null` de la endpointul de predicții; jobul a eșuat înainte ca versiunea curentă de fallback să fie publicată.

O rulare ulterioară, controlată, a folosit fallbackul de evenimente și s-a încheiat `partial` cu două apeluri externe: a salvat opt evenimente reale, fără a fabrica predicții sau cote. Auditul bazei de date confirmă 375 selecții existente, dintre care niciuna nu are cotă curentă; nu există snapshoturi de cote. În consecință, toate selecțiile sunt în statut `watch`, iar Acumulatoare și Piramide nu pot propune evenimente reale eligibile.

| Domeniu | Rezultat | Decizie |
|---|---|---|
| Programare | Job activ la 00:10 UTC | Se păstrează o singură execuție zilnică. |
| Feed predicții | Payload `null` | Fallbackul curent afișează doar evenimente reale. |
| Cote și snapshoturi | 0 cote curente, 0 snapshoturi | Nu se generează recomandări, bilete sau decontări simulate. |
| Acumulatoare/Piramide | Stări goale explicite, fără selecții fictive | Validarea end-to-end rămâne blocată până când furnizorul livrează cote reale eligibile. |

Nu a fost inițiată o nouă sincronizare manuală după audit, pentru a proteja bugetul zilnic. Când furnizorul va răspunde cu predicții și cote valide, următoarea execuție automată va putea parcurge fluxul complet: selecție eligibilă, recomandare, asociere la piramidă/acumulator, snapshoturi și decontare automată.
