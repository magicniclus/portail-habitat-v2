# Architecture du code : organisation, composants, factorisation

Objectif : **chaque chose écrite une seule fois, à un seul endroit**, et un code qu'on peut modifier sans peur. Ce document fait foi pour la structure du dépôt ; Claude Code doit le suivre et signaler toute exception dans son plan.

---

## 1. Principes

1. **Une seule source par information.** Une couleur, un prix, une règle, un libellé de statut, un nom de collection : définis une fois, importés partout.
2. **La logique métier est pure et partagée.** Elle ne connaît ni React, ni Firebase, ni Next. Le site, les Functions et les emails l'importent depuis le même paquet.
3. **Composants sans métier.** Un composant d'interface reçoit des props et affiche. Il ne lit pas Firestore et ne calcule pas de prix.
4. **Les dépendances vont dans un seul sens** (§3) et c'est vérifié automatiquement.
5. **Configuration plutôt que code.** Ce qui change souvent (prix, textes légaux, seuils de l'algorithme) vit dans Firestore ou dans un fichier de configuration, pas dans un composant.
6. **Règle de trois.** On factorise à la deuxième répétition si c'est évident, **à la troisième dans tous les cas**. Pas d'abstraction « au cas où ».
7. **Petit et nommé.** Un fichier = une responsabilité. Un composant au-delà de 200 lignes ou une fonction au-delà de 50 lignes se découpe.

---

## 2. Structure du dépôt (monorepo pnpm + Turborepo)

```
apps/
  web/                    Next.js : routes, pages, assemblage des features
  functions/              Cloud Functions : triggers, callables, planifiées, webhooks
packages/
  core/                   LOGIQUE MÉTIER PURE (aucune dépendance runtime externe sauf Zod)
    simulateur/ diagnostic/ leads/ matching/ annuaire/ equipe/ avis/
    schemas/              schémas Zod par collection → types TS (z.infer)
    constantes/           statuts, libellés, métiers, labels, catégories d'emails
    format/               centimes → « 1 290 € », dates FR, téléphone, SIREN
  ui/                     SYSTÈME DE COMPOSANTS (React, sans Firebase ni Next)
    tokens/               couleurs, rampes, rayons, espacements, typo (source unique)
    primitives/           Button, Input, Select, Checkbox, Radio, Chip, Badge, Avatar, Icon…
    patterns/             Card, Stepper, FieldGroup, Modal, Tabs, Table, EmptyState…
    layouts/              PublicLayout, ProLayout (sidebar), AdminLayout
    themes.css            3 thèmes + admin en variables CSS
  emails/                 modèles React Email, importent tokens de ui et formats de core
  firebase/               accès aux données : init client/admin, chemins, convertisseurs, repositories
  config/                 tsconfig, eslint, tailwind preset, vitest, partagés
docs/                     ce dossier de handoff + AVANCEMENT.md + decisions/ (ADR)
scripts/                  seed, création des produits Stripe, migrations
```

Pourquoi un monorepo : les **Functions et le site partagent** `core` (le prix recalculé côté serveur est exactement celui affiché), et les **emails partagent** les tokens et les formats du site. Sans ça, on finit par copier-coller.

---

## 3. Règles de dépendances

```
apps/web  ─┐
apps/functions ─┼──▶ firebase ──▶ core
packages/emails ─┘        ui ──▶ core (format, constantes uniquement)
```

| Paquet | Peut importer | Ne doit jamais importer |
|---|---|---|
| `core` | `zod` | React, Firebase, Next, `ui`, `firebase` |
| `ui` | `core/format`, `core/constantes`, React, Phosphor | Firebase, Next (`next/link` passé via prop `asChild`), `firebase` |
| `firebase` | `core` | `ui`, React |
| `emails` | `ui/tokens`, `core` | Firebase, Next |
| `apps/*` | tout | — |

Vérifié en CI par **`eslint-plugin-boundaries`** (ou `dependency-cruiser`). Une violation fait échouer la PR.

---

## 4. Tokens : une seule source pour le site ET les emails

`packages/ui/tokens/index.ts` :
```ts
export const themes = {
  particulier: { accent: '#0d7a5f', 100: '#eef7f3', …, 900: '#0a2a21' },
  pro:         { accent: '#e05a10', 100: '#fff2ea', …, 700: '#a33f05' },
  diag:        { accent: '#14508a', 100: '#eef4fa', …, 900: '#081f37' },
  admin:       { accent: '#3f4a57', … },
} as const;
export const premium = { or: '#b8862b', fond: '#fdf6e7' };
export const radius = { control: 10, card: 14, panel: 18, pill: 999 };
```
- Un script génère `themes.css` (`[data-theme="pro"] { --accent: …; --accent-100: … }`) et le **preset Tailwind** (`bg-accent`, `text-accent-700`…)
- Les emails lisent les **mêmes objets** en JS (les clients mail n'ont pas de variables CSS)
- **Interdit** : un code hexadécimal dans un composant. Lint `no-restricted-syntax` sur `/#[0-9a-f]{3,6}/i` hors de `tokens/`

Un composant n'a **qu'une version** pour les 3 espaces : le thème vient du `data-theme` posé par le layout du segment (`app/(particuliers)`, `app/pro`, `app/diagnostic-immobilier`, `app/admin`).

---

## 5. Composants

### 5.1 Trois niveaux
| Niveau | Où | Rôle | Exemple |
|---|---|---|---|
| **Primitive** | `packages/ui/primitives` | un élément HTML stylé, accessible | `Button`, `Input`, `Chip`, `Badge` |
| **Pattern** | `packages/ui/patterns` | assemblage générique, réutilisable partout | `Stepper`, `OptionCard`, `StatTile`, `ArtisanCard` |
| **Feature** | `apps/web/features/<domaine>/components` | branché aux données d'un domaine | `ListeDemandes`, `EditeurPrixLead` |

Une page (`app/.../page.tsx`) **ne contient pas de mise en page détaillée** : elle charge les données et assemble des features.

### 5.2 Conventions d'API
- **Variantes par props, pas par copie** : `variant`, `size`, `tone`. Implémentées avec **`cva`** (class-variance-authority) : une table de variantes lisible, typée
  ```ts
  const button = cva('inline-flex items-center gap-2 rounded-control font-semibold min-h-11', {
    variants: {
      variant: { primary: 'bg-accent text-white hover:bg-accent-600', secondary: '…', ghost: '…' },
      size: { sm: 'h-9 px-3 text-sm', md: 'h-11 px-5', lg: 'h-12 px-6 text-lg' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  });
  ```
- `asChild` (Radix Slot) pour qu'un `Button` puisse être un `Link` sans dupliquer le style
- `forwardRef`, `...rest` transmis à l'élément, `className` fusionné avec `cn()` (clsx + tailwind-merge)
- **Composition plutôt que props booléennes en cascade** : `<Card><Card.Header/><Card.Body/></Card>` au lieu de `<Card showHeader headerIcon titleSize…>`
- Accessibilité intégrée une fois pour toutes : **Radix UI** pour Dialog, Tabs, Select, Popover, Tooltip, Toast (clavier, focus, ARIA)
- Tout texte visible est une prop ou un enfant ; aucun texte métier en dur dans `ui`

### 5.3 Inventaire à construire (tiré des maquettes)
| Composant | Utilisé dans |
|---|---|
| `Logo` (`variant: particulier \| pro \| diag`, `inverse`) | toutes les pages, emails |
| `Button`, `IconButton`, `Chip`, `ChipGroup` (simple/multiple) | partout |
| `Field` (label + aide + erreur) + `Input`, `Textarea`, `Select`, `Checkbox`, `RadioCard` | formulaires |
| `Slider`, `NumberStepper`, `OptionCard` | simulateur, diagnostic, onboarding |
| `Stepper` (étapes horizontales, état courant/fait) | simulateur, diagnostic, avis, onboarding |
| `StarRating` (lecture et saisie) | fiche, annuaire, avis |
| `ArtisanCard` (`variant: standard \| premium \| compact`) | accueil, annuaire, emails |
| `StatusBadge` (lit `core/constantes/statuts`) | demandes, appels d'offres, admin, diagnostic |
| `StatTile` / `KpiCard` | tableau de bord, statistiques, admin |
| `PriceRecap` (lignes + total HT/TVA/TTC) | simulateur, paiements, appels d'offres |
| `FileUpload` (glisser-déposer, aperçu, progression) | documents, avis, fiche |
| `DataTable` (tri, filtres, pagination, sélection) | mes demandes, admin |
| `FilterPanel` + `ActiveFilters` | annuaire, admin |
| `Modal`, `ConfirmDialog` (motif obligatoire, mot de passe) | pro, admin |
| `EmptyState`, `Skeleton`, `ErrorState` | toutes les listes |
| `Banner` (`tone: info \| warning \| danger \| premium`) | tableaux de bord, alertes |
| `Faq`, `Breadcrumb`, `PageHeader`, `SectionHeading` | pages publiques |
| `Sidebar` + `NavItem` + `EntrepriseSwitcher` | espace pro, admin |

Chaque composant a : son fichier, son test (rendu + accessibilité avec `jest-axe`), et une **story** Storybook dans les 4 thèmes.

### 5.4 Catalogue
**Storybook** dans `packages/ui` avec un sélecteur de thème dans la barre d'outils. C'est la référence visuelle : un composant qui n'y est pas n'existe pas. Tests visuels automatiques (Chromatic ou `@storybook/test-runner` + captures Playwright) pour détecter une régression de style.

---

## 6. Données : aucun nom de collection en dur

`packages/firebase` :
```ts
// chemins.ts — la SEULE liste des chemins
export const chemins = {
  artisan: (id: string) => `artisans/${id}`,
  membre: (aid: string, uid: string) => `artisans/${aid}/membres/${uid}`,
  demande: (id: string) => `demandes/${id}`,
  …
};
// convertisseurs : Zod valide à la lecture ET à l'écriture
export const artisanConverter = zodConverter(schemas.artisan);
// repositories : une API par collection
export const artisansRepo = {
  get: (id) => …, liste: (filtres) => …, maj: (id, patch) => …,
};
```
- `apps/*` n'appellent jamais `collection('…')` directement ; lint qui l'interdit
- Même repository côté client (SDK web) et serveur (Admin SDK) via une interface commune
- Requêtes côté client : **TanStack Query** avec des clés centralisées (`cles.demandes.liste(artisanId, filtres)`)

---

## 7. Actions serveur et Functions : un seul « moule »

Toutes les écritures passent par une enveloppe qui factorise ce qui se répète :

```ts
// apps/web/server/action.ts  et  apps/functions/src/callable.ts (même principe)
export const action = <S extends z.ZodType, R>(opts: {
  schema: S;
  permission?: Permission;          // vérifiée avec core/equipe/peut()
  rateLimit?: { cle: string; max: number; fenetre: '1h' | '1j' };
  audit?: boolean;                  // écrit auditLog avant/après
  idempotence?: boolean;
}, handler: (input: z.infer<S>, ctx: Ctx) => Promise<R>) => …;

// utilisation
export const inviterMembre = action(
  { schema: schemas.inviterMembre, permission: 'membres.inviter', rateLimit: { cle: 'invit', max: 20, fenetre: '1j' } },
  async (input, ctx) => { … }
);
```
Résultat uniforme `{ ok: true, data } | { ok: false, code, message }`, avec des **codes d'erreur centralisés** dans `core/erreurs.ts` (et leur message français). L'UI affiche le message sans le réécrire.

---

## 8. Formulaires

- `useZodForm(schema, defaults)` (React Hook Form + resolver Zod) : **le même schéma** que l'action serveur
- `<Form>` + `<FormField name="email" label="Email">` qui branchent automatiquement valeur, erreur, `aria-describedby`
- Les formulaires multi-étapes (simulateur, diagnostic, onboarding, avis) utilisent un **seul** hook `useParcours` : étape courante dans l'URL (`?etape=`), validation par étape, retour arrière, **reprise d'un parcours interrompu** (local, compte, lien par email) avec le composant `<RepriseParcours />`. Spécification complète : **REPRISE_PARCOURS.md**

---

## 9. Textes et constantes

- Libellés de statut, métiers, labels, motifs : `core/constantes` avec `{ valeur, libelle, tone }`. Le `StatusBadge`, les filtres, les emails et l'admin lisent **la même table**
  ```ts
  export const STATUTS_DEMANDE = {
    nouvelle:   { libelle: 'Nouvelle',   tone: 'info' },
    attribuee:  { libelle: 'Attribuée',  tone: 'success' },
    …
  } as const satisfies Record<StatutDemande, Statut>;
  ```
- Textes longs et stables (pages légales, FAQ, landings) : **MDX** dans `apps/web/content/`, un fichier par page
- Formats : **toujours** `formatEuros(centimes)`, `formatDate(ts)`, `formatTel(e164)` de `core/format`. Jamais de `toFixed` ou de `toLocaleString` dans un composant

---

## 10. Organisation d'une feature

```
apps/web/features/demandes/
  components/        ListeDemandes.tsx, CarteDemande.tsx, PanneauDetail.tsx
  actions.ts         accepterDemande, refuserDemande… (enveloppe action())
  queries.ts         hooks TanStack Query / chargement serveur
  index.ts           ce que la feature expose aux pages
```
Une feature n'importe **jamais** les composants internes d'une autre feature ; si deux features en ont besoin, le composant descend dans `packages/ui/patterns`.

---

## 11. Nommage

- **Domaine en français** (comme la doc) : `demande`, `artisan`, `appelOffres`, `deblocage`, `peut()`
- **Technique en anglais** : `useQuery`, `Button`, `variant`, `size`
- Composants en `PascalCase.tsx`, le reste en `camelCase.ts`, un export principal par fichier
- Booléens : `estPremium`, `aDebloque`, `peutRepondre`
- Pas de fichiers `utils.ts` fourre-tout : nommer par domaine (`format/euros.ts`)

---

## 12. Qualité automatique (CI)

| Outil | Rôle |
|---|---|
| TypeScript strict, `noUncheckedIndexedAccess` | erreurs de types |
| ESLint + `eslint-plugin-boundaries` + règles maison (pas de hex, pas de `collection()`) | architecture |
| **Knip** | code, exports et dépendances morts |
| Vitest | `core` (≥ 95 % de couverture), `ui`, `emails` |
| Storybook + tests visuels | régressions de style |
| Playwright | parcours complets |
| Turborepo (cache) | CI rapide : on ne reteste que ce qui a changé |

---

## 13. Décisions et documentation
- Chaque paquet a un `README.md` court : rôle, API principale, exemple
- Toute décision structurante (choix d'outil, écart à ce document) → `docs/decisions/NNN-titre.md` (contexte, décision, conséquences), en 10 lignes
- `docs/AVANCEMENT.md` mis à jour à la fin de chaque lot

## 14. Checklist avant chaque PR
- [ ] Aucune valeur en dur qui existe déjà dans `tokens`, `constantes` ou `format`
- [ ] Aucun composant ou fonction copié-collé d'un autre endroit (sinon : factoriser)
- [ ] Nouveau composant `ui` : story dans les 4 thèmes + test d'accessibilité
- [ ] Écriture de données : via `action()` / `callable()` avec schéma et permission
- [ ] Logique métier dans `core`, testée
- [ ] Knip et boundaries passent
