---
description: Chasse à la duplication et au code mort
---
Lance `pnpm dlx jscpd --min-lines 8 apps packages` et `pnpm knip`. Cherche aussi : composants similaires qui devraient être une variante d'un seul, couleurs / prix / libellés en dur, formats de date ou de prix locaux, imports qui violent ARCHITECTURE.md §3, flags à retirer. Propose une liste de refactorisations classées par gain / risque. Ne modifie rien.
