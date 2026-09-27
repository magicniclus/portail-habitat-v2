# @ph/core

Logique métier pure, partagée par le site, les Functions et les emails. Aucune dépendance sauf Zod : ni React, ni Firebase, ni Next.

| Module | Rôle |
|---|---|
| `@ph/core/format` | `formatEuros(centimes)`, `parseEuros`, `formatDate` (Europe/Paris), `formatRelatif`, `normaliserTel` / `formatTel`, SIREN / SIRET |
| `@ph/core/erreurs` | codes d'erreur centralisés (message français, statut HTTP, code callable), `ErreurMetier` |
| `@ph/core/resultat` | `Resultat<T>` = `{ ok: true, data } \| { ok: false, code, message, champs? }` |
| `@ph/core/enveloppe` | `creerEnveloppe(deps)` : moule commun de `action()` et `callable()` |

```ts
formatEuros(7990, { suffixe: 'HT' }); // « 79,90 € HT »
```

Tests : `pnpm --filter @ph/core test` (couverture ≥ 95 % exigée).
