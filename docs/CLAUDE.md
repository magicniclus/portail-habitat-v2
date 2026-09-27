# Portail Habitat — règles du projet

> À copier à la racine du dépôt. Claude Code relit ce fichier à chaque session : il doit rester court.

## Stack
Next.js 15 (App Router, TypeScript strict) · Firebase (Auth, Firestore `eur3`, Storage et Functions v2 `europe-west1`, App Check) · Stripe Billing + Checkout · Resend + React Email · Zod · React Hook Form · Tailwind · `@phosphor-icons/react` · Vitest · Playwright · pnpm.

## Commandes
- `pnpm dev` : Next.js + émulateurs Firebase
- `pnpm test` : Vitest (logique + règles Firestore sur émulateur)
- `pnpm typecheck`, `pnpm lint`
- `pnpm seed` : jeu de données de test (refuse de tourner hors émulateur ou staging)
- `pnpm e2e` : Playwright

## Où trouver quoi (lire seulement la section utile)
- **Point d'entrée : `docs/PLAN_DEV.md`** (carte des documents, ordre des lots, maquettes → routes, liste de contrôle avant production)
- Écrans, routes, tokens : `docs/README.md`
- Décisions (outils, légal, prix) : `docs/DECISIONS.md` — ne jamais trancher seul une ligne ⏳, la signaler
- Critères de fin par écran : `docs/ACCEPTANCE.md` (un test Playwright par identifiant)
- Performance, migrations, supervision, feature flags : `docs/EXPLOITATION.md`
- Données à importer (seed, cas de test) : `docs/data/*.json`
- Organisation du code, composants, factorisation : `docs/ARCHITECTURE.md`
- Données, index, règles de sécurité : `docs/DATABASE.md` (**fait foi**)
- Comptes, entreprises, équipes, simulation : `docs/COMPTES.md` (prime sur DATABASE §2–3)
- Catalogue des 112 prestations estimables : `docs/data/prestations-catalogue.json` + `docs/data/prestations.json`
- **Mobile d'abord** : `docs/MOBILE.md` s'applique à chaque écran (conception à 390 px, cibles 44 px, champs 16 px, select natifs, feuilles du bas, tests iPhone/Pixel)
- Nombre de demandes affiché aux artisans : `docs/STATS_DEMANDES.md`
- Vocabulaire : jamais « lead » dans l'interface (demandes, mise en relation, appels d'offres)
- Recherche « Quel est votre projet ? » : `docs/RECHERCHE.md` + `docs/data/recherche-intentions.json`
- Parcours en plusieurs étapes et reprise : `docs/REPRISE_PARCOURS.md`
- Emails, SMS, notifications : `docs/EMAILS.md` (tout envoi passe par `notifier()`)
- Stripe, Functions, SEO, RGPD : `docs/INTEGRATIONS.md`
- Back-office : `docs/ADMIN.md` · Algorithme : `docs/MATCHING.md` · Demandes partenaires : `docs/IMPORT_LEADS.md` (contrat du webhook) + `docs/DATABASE.md` §4 bis
- Conversion et séquences d'emails : `docs/CONVERSION.md` · Comportement des visiteurs : `docs/COMPORTEMENT.md` · Assistant IA : `docs/IA_ADMIN.md`
- **Coûts** : `docs/COUTS.md` (règles d'économie à respecter dans tout le code)
- Maquettes : `docs/designs/*.dc.html` (références visuelles ; la logique de `renderVals()` et les constantes s'extraient dans `packages/core/`)
- Avancement, reprise et décisions : `docs/AVANCEMENT.md` (seul fichier de suivi, à mettre à jour à la fin de chaque lot)

## Architecture (détail : `docs/ARCHITECTURE.md`, à suivre strictement)
```
apps/web            Next.js : routes + assemblage des features
apps/functions      Cloud Functions
packages/core       logique métier pure + schémas Zod + constantes + formats (partagé partout)
packages/ui         tokens + primitives + patterns + layouts (Storybook, 4 thèmes)
packages/emails     modèles React Email (tokens de ui, formats de core)
packages/firebase   chemins, convertisseurs Zod, repositories
packages/config     tsconfig, eslint, tailwind, vitest partagés
```
- Dépendances à sens unique, vérifiées par eslint-plugin-boundaries : `core` n'importe rien ; `ui` ignore Firebase ; les apps assemblent
- Un composant = une version pour les 4 thèmes (variables CSS via `data-theme`), variantes avec `cva`, accessibilité via Radix
- Aucun hex, aucun nom de collection, aucun libellé de statut, aucun formatage de prix en dur hors de leur paquet
- Toute écriture passe par l'enveloppe `action()` / `callable()` (schéma, permission, rate limit, audit, idempotence)
- Factoriser à la troisième répétition au plus tard ; composant > 200 lignes = à découper

## Règles non négociables
1. Montants en **centimes entiers**. Jamais de `float` pour de l'argent.
2. Toute entrée passe par un **schéma Zod** de `packages/core/schemas`, côté client **et** côté serveur.
3. Les prix (simulateur, leads, diagnostic) sont **recalculés côté serveur** ; la valeur du client est ignorée.
4. `plan`, `optionVisibilite`, `siegesMax` : écrits **uniquement** par le webhook Stripe.
5. Écritures sensibles (demandes, avis, crédits, membres, prix) : **Function ou Server Action uniquement**, en transaction, avec vérification `peut()` et `auditLog` si admin.
6. Règles Firestore : tout est refusé par défaut, **chaque règle a son test**.
7. Aucune saisie de carte dans notre UI : Stripe Checkout et Customer Portal.
8. Données personnelles jamais dans `artisansPublic`, dans les logs ni dans les URL.
9. Accessibilité : cibles de 44 px, focus visible, labels, contraste AA, `prefers-reduced-motion`.

## Façon de travailler
- Commandes : `/nouveau-lot N`, `/fin-lot`, `/relecture`, `/nouveau-composant`, `/bug`, `/maquette`, `/duplication`, `/reprise`, `/decision`
- Commence chaque lot par un **plan** ; n'écris pas de code avant validation.
- Logique métier : **tests d'abord**, puis implémentation.
- Ne pas ajouter de dépendance, changer le modèle de données ou une règle de sécurité **sans le signaler** dans le plan.
- Un lot = une branche `lot-XX-nom` (en session web : la branche imposée par la session) = des commits atomiques en français (`feat(simulateur): …`).
- Un lot est terminé quand `pnpm typecheck && pnpm lint && pnpm test` passent et que les écrans correspondent aux maquettes.
- En cas de doute sur une règle métier : **demander**, ne pas inventer.

## Suivi et reprise
- À la fin de chaque lot (et avant toute pause longue) : mets à jour `docs/AVANCEMENT.md` (statut, date, tests passés, ce qui reste), puis commite.
- Commits petits et fréquents : une fonctionnalité qui passe ses tests = un commit. Une session interrompue ne doit jamais perdre plus d'une heure de travail.
- Ne déploie jamais en production sans le « go » explicite du propriétaire.
