# @ph/ui

Système de composants : une seule version par composant pour les 4 thèmes (`data-theme` = `particulier`, `pro`, `diag`, `admin`).

- `@ph/ui/tokens` : couleurs, rayons, ombres, polices (source unique ; lue aussi par les emails). Après modification : `pnpm --filter @ph/ui tokens` régénère `src/styles/themes.css` et `src/styles/theme.css` (thème Tailwind 4). Un test vérifie la synchronisation et les contrastes AA.
- `@ph/ui/styles.css` : à importer une fois (Tailwind 4, thèmes, base, animations).
- `@ph/ui` : primitives (Logo, Button, IconButton, Chip, Badge, StatusBadge, Field, Input, Textarea, Select, Checkbox, RadioCard, Skeleton) et patterns (Card, Stepper, Modal, Sheet, ConfirmDialog, EmptyState, Banner, Combobox, Toast, BottomNav, StickyActionBar, PageErreur).

Conventions : variantes avec `cva`, `asChild` (Radix Slot) pour rendre un `<Link>`, `ref` en prop (React 19), `className` fusionné par `cn()`. Aucun texte métier, aucune dépendance à Next ni à Firebase.

| Commande                                                                 | Rôle                                                                                                     |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @ph/ui storybook`                                         | catalogue (thème : les 4 ou un seul ; tailles 320, 390, 768, 1280)                                       |
| `pnpm --filter @ph/ui test`                                              | rendu, comportement et axe (jsdom)                                                                       |
| `pnpm --filter @ph/ui build-storybook && pnpm --filter @ph/ui catalogue` | chaque story à 320 px : pas de défilement horizontal, cibles ≥ 44 px, champs ≥ 16 px, axe avec contraste |
