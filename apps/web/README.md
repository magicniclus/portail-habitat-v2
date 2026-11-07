# @ph/web

Site Next.js 16 (App Router). Les pages chargent les données et assemblent des features ; la logique vit dans `@ph/core`.

- `server/action.ts` : `action()`, enveloppe de toute Server Action qui écrit (Zod, App Check, erreurs centralisées ; permission, débit, audit et idempotence au lot 2).
- `/api/health` : sonde de disponibilité.
- Sentry actif seulement si `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` sont définis.
- Tests de bout en bout : `pnpm e2e` (projets iPhone 13, iPhone SE, Pixel 7, ordinateur).
