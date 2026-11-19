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

État réel au 19/11/2026 (Next.js 16 avec `proxy.ts`, TypeScript 6 strict, Node 22, pnpm 10 + Turborepo) :

```
apps/
  web/                    Next.js (@ph/web) : app/ (routes), features/<domaine>/, server/ (enveloppes
                          action() et actionAdmin(), lectures serveur), lib/ (routes, CSP securite.ts…),
                          proxy.ts (en-têtes de sécurité, maintenance, sessions), e2e/ et e2e-pro/ (Playwright)
  functions/              Cloud Functions v2 (@ph/functions) : déclencheurs, callables (callable()),
                          planifiées, tâche Cloud Tasks envoyerEnvoi, webhook partenaires
  studio/                 robot de rendu du Studio vidéo (@ph/studio, Docker : Playwright/Chromium,
                          ffmpeg, faster-whisper ; STUDIO.md §6) — hors des règles boundaries
packages/
  core/                   LOGIQUE MÉTIER PURE (@ph/core ; seule dépendance : zod)
    src/<module>/         un module par domaine, exporté en `@ph/core/<module>` : format, erreurs,
                          resultat, enveloppe, zod, equipe, admin, flags, schemas, simulateur,
                          diagnostic, recherche, geo, entreprises, notifications, parcours, stats,
                          leads, annuaire, matching, facturation, paiements, consentement, support,
                          demandes, avis, espace, connexion, onboarding, espace-pro, partenaires,
                          conversion, comportement, ia, landings, devis, sites, blog, studio, dessin
    src/schemas/          schémas Zod par collection et entrées des actions → types TS (z.infer)
  ui/                     SYSTÈME DE COMPOSANTS (@ph/ui ; React, Radix, cva, Phosphor ; sans Firebase ni Next)
    src/tokens/           couleurs, rampes, rayons, espacements, typo, palette des cartes, `dessin.ts`
    src/primitives/       Button, IconButton, Input, Field, Checkbox, RadioCard, Chip, Badge, Logo,
                          Interrupteur, NoteMoyenne, Skeleton, Chargeur, BoutonAction, BoutonEnvoi, BoutonGoogle
    src/patterns/         Card, Stepper, Banner, EmptyState, Feuille (feuille du bas), Combobox, Toast,
                          ConfirmDialog, BottomNav, StickyActionBar, PanneauPleinEcran, MenuPleinEcran,
                          PageErreur, RepriseParcours, Chargement
    src/styles/           themes.css (particulier, pro, diag, admin), base.css, ambiance.css
  emails/                 modèles d'emails (@ph/emails : blocs + rendu React Email) et PDF (pdfkit) :
                          `@ph/emails/pdf` (devis, factures), `@ph/emails/pdf-plan` (plans Dessin)
  firebase/               accès aux données (@ph/firebase) : chemins.ts (seule liste des collections),
                          admin.ts, client/, serveur/<domaine>/ (logique serveur Admin SDK), seed/
  tracker/                traceur du comportement des visiteurs (@ph/tracker, < 6 Ko, COMPORTEMENT.md)
  config/                 tsconfig, vitest (garde-fou émulateur), mesures Playwright, partagés
docs/                     ce dossier + AVANCEMENT.md (suivi détaillé) + PROGRESSION.md (résumé)
scripts/                  seed, référentiel, création d'admin, TOTP, migrations, source partenaire,
                          captures, déploiement du robot Studio
```
Pas encore fait par rapport au plan d'origine : `packages/ui/layouts/` (les gabarits PublicLayout, ProLayout, AdminLayout sont dans les features de `apps/web`), `core/constantes/` (les libellés vivent dans chaque module, ex. `STATUTS_DEMANDE` dans `schemas/demandes.ts`, `LIBELLES_ETAPE` dans `espacePro/suivi.ts`), `docs/decisions/` (les décisions sont dans DECISIONS.md et AVANCEMENT.md).

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
| `ui` | `core`, React, Radix, Phosphor | Firebase, Next (`next/link` passé via prop `asChild`), `firebase` |
| `firebase` | `core` (+ `firebase-admin`, `@anthropic-ai/sdk`) | `ui`, React |
| `emails` | `ui` (tokens), `core` (+ React Email, pdfkit) | Firebase, Next |
| `tracker` | `core` | React, Firebase, Next |
| `apps/web` | `core`, `ui`, `firebase`, `emails`, `tracker` | — |
| `apps/functions` | `core`, `firebase`, `emails` | `ui` |

Vérifié en CI par **`eslint-plugin-boundaries`** (`eslint.config.mjs`, politique « tout refusé sauf ») et par des `no-restricted-imports` (React, Next, Firebase interdits selon le paquet ; `zod` direct interdit partout : `z` vient de `@ph/core/zod`). Une violation fait échouer la PR. `apps/studio` n'est pas couvert par ces règles.

### Dépendances réellement ajoutées (signalées dans AVANCEMENT.md)
| Paquet | Où | Pourquoi |
|---|---|---|
| `zod` | `core` | seule dépendance du cœur ; `clipper2-ts` (D86) **n'a pas été ajouté** : opérations géométriques écrites dans `core/dessin` |
| `radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge`, `@phosphor-icons/react`, `tailwindcss` | `ui` | composants accessibles, variantes |
| `@react-email/components`, `@react-email/render`, `pdfkit` | `emails` (et `functions` pour le rendu) | emails, PDF des devis, factures et plans (au lieu de Chromium headless) |
| `firebase-admin`, `@anthropic-ai/sdk` | `firebase` | Admin SDK ; assistant IA, IA du site et du blog |
| `firebase`, `firebase-admin`, `stripe`, `@sentry/nextjs`, `server-only` | `apps/web` | SDK client, serveur, paiements, erreurs |
| `gsap` | `apps/web` | étapes animées des landings (chargé sur ordinateur seulement ; `@gsap/react` retiré) |
| `uqr` | `apps/web` | QR code de l'application d'authentification |
| `pdfjs-dist` 6.4.299 | `apps/web` | import d'un plan PDF dans Dessin (D91), chargé à la demande |
| `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`, `postprocessing` | `apps/web` | vue 3D de Dessin (D86), chargés seulement au passage en 3D |
| `@sentry/node`, `firebase-functions` | `apps/functions` | Functions |
| `@playwright/test`, `firebase-admin`, `@anthropic-ai/sdk` | `apps/studio` | robot de rendu |
| `@gltf-transform/cli` (développement) | racine | compression des modèles 3D (`pnpm dessin:modele`, D88) |

Prévus et **non ajoutés** : `zustand`, `immer`, `comlink`, `idb-keyval` (D86 : `useReducer` et IndexedDB natif suffisent), `maplibre-gl` (D87 modifié le 18/11/2026 : services IGN appelés par le serveur), React Hook Form et TanStack Query (§6 et §8).

---

## 4. Tokens : une seule source pour le site ET les emails

`packages/ui/src/tokens/index.ts` (le CSS des thèmes est produit par `tokens/css.ts` ; Dessin a ses propres couleurs de plan dans `tokens/dessin.ts`). Exemple d'origine, les valeurs réelles sont dans le fichier :
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
> État : l'inventaire réel est listé au §2 (`primitives/`, `patterns/`). Les composants propres à un domaine (`ArtisanCard`, `DataTable`, `FilterPanel`, `PriceRecap`, `Sidebar`…) ont été faits dans les features de `apps/web`, pas dans `@ph/ui`. Tests d'accessibilité groupés (`primitives.test.tsx`, `patterns.test.tsx`) ; toutes les primitives et patterns n'ont pas de story.

### 5.4 Catalogue
**Storybook** dans `packages/ui` avec un sélecteur de thème dans la barre d'outils. C'est la référence visuelle. Fait : un job CI construit Storybook et le parcourt avec Playwright (`packages/ui/catalogue/catalogue.spec.ts` : 4 thèmes, 320 px, cibles de 44 px, axe). **Pas encore fait** : comparaison de captures (Chromatic ou `@storybook/test-runner`) pour détecter une régression de style.

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
- `apps/*` n'appellent jamais `collection('…')` avec un nom en dur ; lint qui l'interdit (`no-restricted-syntax`), les noms viennent de `collections` / `chemins` / `fichiers` (`packages/firebase/src/chemins.ts`)
- **Fait autrement** : pas de `zodConverter` ni de repositories génériques. La logique serveur est rangée par domaine dans `packages/firebase/src/serveur/<domaine>/` (exportée en `@ph/firebase/<domaine>`, ex. `@ph/firebase/dessin`, `@ph/firebase/studio`, `@ph/firebase/sites`), valide avec les schémas de `@ph/core/schemas` et reçoit ses services (`db`, `bucket`, `horloge`) en paramètre pour être testée sur émulateur. `conversion.ts` fait la conversion Timestamp/GeoPoint commune aux deux SDK. Côté navigateur, `@ph/firebase/client` ne fournit que quelques requêtes temps réel (attributions de l'entreprise, journal de conversion).
- Requêtes côté client : **TanStack Query n'est pas utilisé** (D38 ✅ non appliqué) : les pages lisent côté serveur, les écritures passent par des routes `POST /api/...` (`posterJson`) ou des Server Actions.

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

État réel : le moule commun est `creerEnveloppe(deps)` (`@ph/core/enveloppe`, ordre : connexion → App Check → Zod → permission → débit → idempotence → traitement → audit). Il est branché sur Firestore par `dependancesEnveloppe` (`@ph/firebase/serveur`) et utilisé par :
- `action()` (`apps/web/server/action.ts`), appelée par les routes `app/api/**/route.ts` (via `routeJson`) et quelques Server Actions ; options en plus : `nom`, `authentification: 'facultative'`, `appCheck: false` (mesures `sendBeacon`), `lectureSeule`, `secondFacteur` ;
- `actionAdmin()` (`apps/web/server/actionAdmin.ts`) pour le back-office : permission admin relue, double authentification, audit forcé, refus en impersonation ;
- `callable()` (`apps/functions/src/callable.ts`) pour les Functions appelables (comptes et équipes).
Exemple réel : Dessin expose une route unique `POST /api/dessin/{operation}` où chaque opération est une `action()` avec son schéma et son débit.

---

## 8. Formulaires

- **Prévu, pas fait** : `useZodForm(schema, defaults)` (React Hook Form + resolver Zod) et `<Form>` / `<FormField>`. React Hook Form n'est pas installé : les formulaires sont des composants React simples avec `Field` (`@ph/ui`), validés avec **le même schéma Zod** que l'action serveur (`@ph/core/schemas`), côté client et côté serveur.
- Formulaires multi-étapes : le hook `useParcours` (`apps/web/features/parcours/useParcours.ts`) et `<RepriseParcours />` servent aujourd'hui **au simulateur seulement** ; le diagnostic et l'avis partagent le gabarit `PageParcours` sans reprise, l'inscription des artisans a sa propre reprise (`brouillonsOnboarding`), Dessin garde ses brouillons dans IndexedDB. Spécification : **REPRISE_PARCOURS.md**

---

## 9. Textes et constantes

- Libellés de statut, métiers, labels, motifs : une table par domaine dans `@ph/core/<module>` (pas de dossier `core/constantes` unique), avec `{ valeur, libelle, tone }`. Les filtres, les emails et l'admin lisent **la même table**
  ```ts
  export const STATUTS_DEMANDE = {
    nouvelle:   { libelle: 'Nouvelle',   tone: 'info' },
    attribuee:  { libelle: 'Attribuée',  tone: 'success' },
    …
  } as const satisfies Record<StatutDemande, Statut>;
  ```
- Textes longs et stables (pages légales, FAQ, landings) : prévus en **MDX** dans `apps/web/content/` ; **pas fait** : ils sont dans les features (`features/legal`, `features/landings`…)
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
En pratique, les features sont **plates** (`apps/web/features/<domaine>/*.tsx` + `actions.ts` quand il y a des Server Actions, ex. `features/adminIa/actions.ts`), sans `components/`, `queries.ts` ni `index.ts` ; les lectures serveur sont dans `apps/web/server/<domaine>.ts` et les écritures dans `app/api/**/route.ts`. Exemple : `features/dessin/` (éditeur), `server/dessin.ts`, `app/api/dessin/[operation]/route.ts`, logique pure dans `@ph/core/dessin`, serveur dans `@ph/firebase/dessin`, PDF dans `@ph/emails/pdf-plan`.
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
| Vitest | `core` (seuil de couverture 95 % lignes, fonctions, branches, instructions), `ui`, `emails`, `firebase` (règles et serveur sur émulateurs) |
| Storybook + catalogue Playwright | 4 thèmes, 320 px, cibles, axe (comparaison de captures **pas encore faite**) |
| Playwright | parcours complets (`apps/web/e2e`, `apps/web/e2e-pro` sur émulateurs) |
| Lighthouse CI | budget de performance (EXPLOITATION §1) |
| Prettier | format (`pnpm format:check`) |
| Turborepo (cache) | CI rapide : on ne reteste que ce qui a changé |

---

## 13. Décisions et documentation
- Chaque paquet a un `README.md` court : rôle, API principale, exemple (existent pour `core`, `ui`, `firebase`, `config` ; **pas encore** pour `emails` et `tracker`)
- Toute décision structurante (choix d'outil, écart à ce document) → prévu dans `docs/decisions/NNN-titre.md` ; **en pratique** dans `docs/DECISIONS.md` (tableau D1…D94) et dans le journal `docs/AVANCEMENT.md`
- `docs/AVANCEMENT.md` mis à jour à la fin de chaque lot ; `docs/PROGRESSION.md` en résumé

## 14. Checklist avant chaque PR
- [ ] Aucune valeur en dur qui existe déjà dans `tokens`, `constantes` ou `format`
- [ ] Aucun composant ou fonction copié-collé d'un autre endroit (sinon : factoriser)
- [ ] Nouveau composant `ui` : story dans les 4 thèmes + test d'accessibilité
- [ ] Écriture de données : via `action()` / `callable()` avec schéma et permission
- [ ] Logique métier dans `core`, testée
- [ ] Knip et boundaries passent
