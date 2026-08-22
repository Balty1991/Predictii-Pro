# Predicții Pro pe GitHub Pages

Aplicația din acest director este versiunea publică, statică, disponibilă la `https://balty1991.github.io/Predictii-Pro/`. Nu există redirecționare către un alt domeniu.

Actualizarea reală a feedului se execută o dată pe zi la 00:10 UTC. Workflow-ul GitHub citește cheia exclusiv din secretul repository-ului `SPORTS_DATA_API_KEY`, construiește `docs/data/feed.json` și publică doar rezultatul normalizat. Cheia nu este inclusă în HTML, JavaScript sau JSON-ul public.

Pentru activare, adaugă în GitHub la **Settings → Secrets and variables → Actions → New repository secret** cheia `SPORTS_DATA_API_KEY`. Apoi pornește manual workflow-ul **Actualizează feedul static Predicții Pro** o singură dată din tabul Actions. Dacă furnizorul nu oferă predicții sau cote eligibile, aplicația păstrează evenimentele reale de fallback și nu creează selecții, bilete sau piramide inventate.
