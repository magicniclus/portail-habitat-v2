# @ph/functions

Cloud Functions v2 (`europe-west1`, Node 22). `src/` est regroupé par esbuild dans `lib/index.js` avec `@ph/core` ; seules les `dependencies` restent externes.

- `callable(options, traitement)` : enveloppe commune (`@ph/core/enveloppe`), App Check exigé hors émulateur, réponse `Resultat<R>`.
- `ping` : Function de démonstration.

`pnpm dev` (racine) reconstruit `lib/` à chaque modification et lance les émulateurs.
