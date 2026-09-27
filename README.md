# Portail Habitat

Place de marché de l'habitat (particuliers, artisans, diagnostic). Point d'entrée : [`docs/PLAN_DEV.md`](docs/PLAN_DEV.md) ; règles de travail : [`CLAUDE.md`](CLAUDE.md) ; avancement : [`docs/AVANCEMENT.md`](docs/AVANCEMENT.md).

## Démarrer

Prérequis : Node 22, pnpm 10, Java 21 (émulateurs Firebase).

```bash
pnpm install
cp .env.example .env.local   # APP_CHECK_MODE=desactive en local
pnpm dev                     # site (localhost:3000) + émulateurs (localhost:4000)
```

| Commande                                                     | Rôle                                     |
| ------------------------------------------------------------ | ---------------------------------------- |
| `pnpm test`                                                  | tous les tests, sous émulateurs Firebase |
| `pnpm test:unit`                                             | tests sans émulateur                     |
| `pnpm typecheck` · `pnpm lint` · `pnpm knip` · `pnpm format` | qualité                                  |
| `pnpm build` · `pnpm e2e`                                    | build et tests Playwright                |
