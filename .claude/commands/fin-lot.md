---
description: Clôturer le lot en cours
---
1. Lance `pnpm typecheck && pnpm lint && pnpm knip && pnpm test && pnpm e2e` et corrige jusqu'à ce que tout passe.
2. Vérifie chaque critère de docs/ACCEPTANCE.md du lot : tableau critère / test / statut.
3. Applique la checklist de docs/ARCHITECTURE.md §14.
4. Lance les agents relecteur-securite et relecteur-maquette sur le diff de la branche, puis corrige les problèmes bloquants.
5. Mets à jour docs/AVANCEMENT.md (fait, reste, décisions prises, dettes connues).
6. Rédige la description de PR (résumé, captures, critères couverts, points d'attention). Ne pousse pas sans mon accord.
