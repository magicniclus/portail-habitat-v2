# @ph/firebase

Accès aux données. Seul paquet autorisé à nommer une collection (lint).

- `@ph/firebase/admin` (serveur uniquement) : `appAdmin()` (émulateur, compte de service ou identifiants Google Cloud), `verifierJetonAppCheck()`.
- Lot 2 : `chemins`, convertisseurs Zod et repositories (ARCHITECTURE §6).

Tests : sur émulateur uniquement (`pnpm test` à la racine) ; le garde-fou de `@ph/config` refuse tout autre environnement.
