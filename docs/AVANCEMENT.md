# Avancement — Portail Habitat

Produit au lot 0 (cadrage, 27/09/2026). Mis à jour à la fin de chaque lot, puis commité.
Légende : ⬜ à faire · 🟡 en cours · ✅ terminé (critères d'ACCEPTANCE verts) · ⏸ bloqué (raison dans Notes)

## 1. Lots

Seul fichier de suivi (PROGRESSION.md y a été fusionné, D43). En cas d'interruption, c'est ici qu'on regarde où on en est (prompt « Reprise » de PROMPT_CLAUDE_CODE.md).

| Lot | Contenu | Statut | Terminé le | Tests | Notes |
|---|---|---|---|---|---|
| 0 | Cadrage | ✅ | 27/09/2026 | — | incohérences tranchées, documents corrigés (§2) |
| 1a | Socle technique : monorepo, outillage, CI, émulateurs | ✅ | 27/09/2026 | format, lint, types, Knip, 102 tests (dont règles sur émulateur), build, e2e | CI GitHub à confirmer au premier passage (§6) |
| 1b | Design system, composants, Storybook | ✅ | 27/09/2026 | 34 tests composants, catalogue 29 stories, e2e 44 (dont ERR-01/02, MOB-01 à 03), Lighthouse | D45 et D46 à valider (§7) |
| 2 | Données et sécurité | ⬜ | | règles | |
| 3 | Logique métier pure | ⬜ | | unitaires | |
| 4 | Comptes, équipes, seed | ⬜ | | CON, EQU, INV | |
| 5 | Emails, SMS, notifications | ⬜ | | MAIL | |
| 6 | Pages publiques, SEO, cookies | ⬜ | | ACC, DIA-05 | |
| 7 | Recherche | ⬜ | | pertinence, RCH | |
| 8 | Parcours particuliers | ⬜ | | SIM, ESP, DIA, AVI | |
| 9 | Annuaire, fiche publique | ⬜ | | ANN, FIC | |
| 10 | Espace artisan, équipes, PWA | ⬜ | | ACQ, ONB, PRO | |
| 11 | Stripe | ⬜ | | PAY | |
| 12 | Matching, appels d'offres | ⬜ | | unitaires + e2e | |
| 12b | Demandes partenaires | ⬜ | | IMP | |
| 13 | Back-office | ⬜ | | ADM | |
| 13b | Conversion, séquences | ⬜ | | CONV | |
| 13c | Comportement, IA | ⬜ | | CMP, IA, RED | |
| 14 | Qualité, préparation de la mise en production | ⬜ | | ERR, MISE_EN_PROD | |

### Lot en cours
- Lot : 2 (données et sécurité), à démarrer
- Dernier lot terminé : 1b, le 27/09/2026 (détail §7)

## 6. Lot 1a — Socle technique (terminé le 27/09/2026)

**Fait**
- Monorepo pnpm 10 + Turborepo 2, Node 22 : `apps/web` (Next.js 16), `apps/functions` (Functions v2, `europe-west1`), `packages/core`, `packages/firebase`, `packages/config`. `packages/ui` arrive au lot 1b, `packages/emails` au lot 5.
- `@ph/core` : `format` (euros en centimes, dates Europe/Paris, relatif, téléphone E.164, SIREN/SIRET avec l'exception La Poste), `erreurs` (codes centralisés : message FR, statut HTTP, code callable), `resultat`, `enveloppe` (connexion → App Check → Zod → permission → débit → idempotence → traitement → audit ; une option dont la dépendance manque fait échouer le démarrage), `zod` (Zod configuré en français). 92 tests, couverture 100 % lignes, 99 % branches (seuil 95 %).
- `action()` (site, `apps/web/server/action.ts`) et `callable()` (Functions) branchés sur l'enveloppe ; Function `ping` vérifiée sur émulateur (succès et erreur de validation en français).
- `@ph/firebase/admin` : `appAdmin()` (émulateur, compte de service ou identifiants Google Cloud), `verifierJetonAppCheck()`.
- Firebase : `firebase.json`, `.firebaserc` (projet d'émulation `demo-portail-habitat`, alias dev/staging/prod), règles Firestore et Storage « tout refusé » avec leur test sur émulateur ; garde-fou qui refuse tout test Firebase hors émulateur local `demo-*`.
- ESLint 9 : boundaries (dépendances entre paquets), dépendances externes interdites par paquet, pas de couleur hexadécimale ni de `collection()` hors de leur paquet, pas d'import direct de `zod`. Vérifié avec des violations volontaires. Prettier, Knip.
- Sentry (site et Functions), inactif sans DSN. `/api/health`. `.env.example` complet.
- Playwright : projets iPhone 13, iPhone SE, Pixel 7, ordinateur ; test de fumée (sonde, langue, pas de défilement horizontal).
- CI GitHub Actions : format, lint, types, Knip, tests sous émulateurs, build ; e2e Chromium + WebKit.

**Vérifié dans cette session** : `pnpm format:check`, `lint`, `typecheck`, `knip`, `test` (sous émulateurs), `build` ; e2e sur Pixel 7 et ordinateur (seul Chromium est installé ici ; les projets iPhone tournent sur WebKit dans la CI).

**Reste / dettes connues**
- `pnpm dev` : le site et les Functions démarrent ; ici, l'interface web des émulateurs n'a pas pu être téléchargée (réseau du conteneur). À vérifier sur un poste : `pnpm dev`, puis http://localhost:4000.
- Premier passage de la CI GitHub à observer (téléchargement de WebKit, cache des émulateurs).
- Lot 2 : brancher `verifierPermission` (`peut()`), `limiterDebit`, `auditer` et `idempotence` sur Firestore ; lot 4 : `uid` depuis le cookie de session dans `action()`.
- Déploiement des Functions : `lib/index.js` est autonome (esbuild) ; le déploiement réel sera validé au lot 14.
- Lighthouse CI et build Storybook : lot 1b.

## 7. Lot 1b — Design system et composants (terminé le 27/09/2026)

**Fait**
- `@ph/ui/tokens` : source unique des 4 thèmes (rampes 100 → 900 des maquettes ; ardoise admin complétée en 800/900), neutres et ombres Broadsheet, statuts, Premium, rayons, polices, points de rupture. Génération de `themes.css` (`[data-theme]`) et du thème Tailwind 4 (`@theme`, palette par défaut désactivée) ; un test vérifie la synchronisation et les contrastes AA.
- Primitives : Logo (3 espaces + admin, version inversée), Button (`asChild`), IconButton, Chip, ChipGroup, Badge, StatusBadge, Field (libellé, aide, erreur reliés), Input (préréglages MOBILE §5 : tel, email, code postal, SIREN, code SMS…), Textarea, Select natif (`optgroup`), Checkbox, RadioCard, Skeleton.
- Patterns : Card composable, Stepper (barre de progression sous 640 px), Modal (feuille du bas sous 640 px, balayage pour fermer) et Sheet, ConfirmDialog (motif obligatoire), EmptyState, Banner, Combobox (ARIA 1.2), Toast (Radix), BottomNav, StickyActionBar (zones sûres iOS), PageErreur.
- Storybook 10 : les 4 thèmes côte à côte ou un seul, tailles 320 / 390 / 768 / 1280, extension a11y. Test « catalogue » Playwright sur le Storybook compilé : chaque story à 320 px, sans défilement horizontal, cibles ≥ 44 px, champs ≥ 16 px, axe avec contraste.
- Site : thème par espace (`(particuliers)`, `/pro`, `/diagnostic-immobilier`, `/admin`, ce dernier en `noindex`), posé aussi sur `<html>` pour les fenêtres ; `theme-color` et `viewport-fit=cover` par espace ; polices Source Sans 3 et Source Serif 4 italique (next/font).
- Pages d'erreur d'après la maquette : 404 par espace avec recherche et liens (ERR-01, code 404), 500 avec identifiant d'incident envoyé à Sentry en étiquette `incident` (ERR-02), page de maintenance et bascule `MAINTENANCE=1` dans `proxy.ts` (réécriture en 503, sauf `/admin` et `/api`).
- Tests : MOB-01 à 03 sur 5 pages, 4 appareils ; ERR-01 et ERR-02. `PW_CHROMIUM_SEUL=1` permet de lancer les projets iPhone sans WebKit.
- Performance : Sentry navigateur et pages d'erreur chargés à la demande (JavaScript initial de l'accueil passé de 226 à 154 Ko). Lighthouse CI mobile : performance ≥ 0,95, LCP ≤ 2 s, CLS ≤ 0,05, TBT ≤ 150 ms, accessibilité ≥ 0,95.
- CI : jobs « catalogue » (Storybook + Playwright) et « Lighthouse ».

**Écarts et décisions à valider**
- **D45** : les boutons principaux pro utilisent `#c94f0a` au lieu de `#e05a10` (contraste AA) ; ambre et or plus foncés pour le texte.
- **D46** : budget JavaScript initial irréaliste avec Next.js 16 (voir DECISIONS) ; seuil provisoire de 160 Ko en CI.
- Chips : 44 px de haut partout (MOB-02), au lieu d'environ 37 px dans les maquettes.
- ERR-03 : la maintenance se pilote par variable d'environnement ; le branchement sur `config/app.maintenance` se fera avec les feature flags (lot 2).

**Reste / dettes connues**
- Comparaison visuelle automatique aux maquettes (`/maquette`) : les `.dc.html` ne s'affichent pas en `file://` ; à outiller au lot 6 (serveur statique sur `docs/designs`).
- Layouts complets (PublicLayout, ProLayout avec sidebar, AdminLayout) : ils arrivent avec leurs écrans (lots 6, 10, 13), en réutilisant BottomNav, Sheet et Logo.

## 2. Incohérences et zones floues

**Toutes tranchées le 27/09/2026** : propositions retenues et documents corrigés (DECISIONS D5, D6, D8, D15, D17 passées en ✅ ; nouvelles décisions D40 à D43). Détail conservé ci-dessous pour mémoire.

1. **Deux fichiers de suivi.** CLAUDE.md, PLAN_DEV §2 et README citent `PROGRESSION.md` ; CLAUDE.md (« Où trouver quoi »), ARCHITECTURE §13 et les commandes `/nouveau-lot`, `/fin-lot`, `/reprise` citent `AVANCEMENT.md`.
   → *Proposition* : `AVANCEMENT.md` = suivi détaillé (ce fichier), `PROGRESSION.md` = tableau de statut court ; les deux mis à jour par `/fin-lot`. Ou fusionner dans `AVANCEMENT.md` et supprimer `PROGRESSION.md` (plus simple).
2. **Routes divergentes entre README/ACCEPTANCE et PLAN_DEV §4.**
   | Écran | README / ACCEPTANCE / INTEGRATIONS | PLAN_DEV §4 / CONVERSION |
   |---|---|---|
   | Diagnostic | `/diagnostic-immobilier`, `/estimation`, `/[commune]` | `/diagnostic`, `/diagnostic/[commune]` |
   | Connexion | `/pro/connexion` | `/connexion` |
   | Avis | `/avis` | `/avis/[jeton]` |
   | Paiement | `/pro/abonnement/premium` et `/visibilite` | `/pro/paiement?offre=&facturation=&code=` |
   → *Proposition* : garder les routes de README (plus SEO pour `/diagnostic-immobilier/...`, déjà dans ACCEPTANCE) ; `/avis` avec `?jeton=` facultatif ; `/connexion` unique pour tous les publics avec redirection `/pro/connexion` → `/connexion?espace=pro` ; paiement : `/pro/abonnement/[offre]?facturation=&code=`. Mettre PLAN_DEV §4 et CONVERSION à jour en conséquence.
3. **Emplacement du code : `lib/…` vs `packages/…`.** CLAUDE.md (règle 2 : `lib/schemas`), README, COMPTES §6.1, DATABASE (`lib/simulateur/formules.ts`), EMAILS et INTEGRATIONS parlent de `lib/` ; ARCHITECTURE et les prompts des lots 1-3 imposent `packages/core/*`.
   → *Proposition* : ARCHITECTURE fait foi ; `lib/schemas` = `packages/core/schemas`, `lib/simulateur` = `packages/core/simulateur`, `lib/notifications/notifier.ts` = `apps/functions/src/notifications/notifier.ts` (ou `packages/firebase` côté serveur). Corriger CLAUDE.md et les autres documents.
4. **Packs de crédits.** DECISIONS D29 : packs de 10, 25 et 50 crédits ; INTEGRATIONS §1 : `price_pack_5`, `price_pack_10`, `price_pack_25`.
   → *Proposition* : D29 fait foi (10/25/50) ; les identifiants Stripe deviennent `price_pack_10/25/50`, et les packs restent pilotés par `packsCredits`.
5. **Variables Stripe incomplètes.** INTEGRATIONS §8 n'a qu'un `STRIPE_PRICE_VISIBILITE` alors qu'il y a deux prix (annuel, mensuel) ; rien pour le siège supplémentaire (D26, quantité `seat`) ni pour les packs.
   → *Proposition* : `STRIPE_PRICE_VISIBILITE_ANNUEL`, `STRIPE_PRICE_VISIBILITE_MENSUEL`, `STRIPE_PRICE_SIEGE`, `STRIPE_PRICE_PACK_10/25/50` (ou lecture par `lookup_key` Stripe, sans variables : plus robuste, créé par le script idempotent du lot 11).
6. **Code promo.** INTEGRATIONS §1 : « −30 % sur le premier mois » (coupon `duration: once`) ; D32c/CONVERSION : codes personnels −30 % max, 1 fois / 90 j, expiration réelle. Un −30 % « premier mois » n'a pas de sens sur un annuel payé en une fois.
   → *Proposition* : −30 % appliqué à la première facture (mensuelle ou annuelle), codes personnels selon D32c ; supprimer la mention générique d'INTEGRATIONS.
7. **Fournisseur SMS.** D2 : Brevo ; EMAILS §1 : « Brevo SMS ou Twilio » ; variables génériques `SMS_API_KEY`.
   → *Proposition* : Brevo seul, derrière une interface `EnvoiSms` pour pouvoir changer ; variable `BREVO_API_KEY`.
8. **BigQuery.** README décrit COMPORTEMENT comme « chaîne BigQuery » et IA_ADMIN §3 lit « Firestore + BigQuery », alors que COMPORTEMENT §3 et COUTS excluent BigQuery au lancement.
   → *Proposition* : pas de BigQuery au lancement ; `construireContexte` lit les agrégats Firestore (`cumuls 7/30/90 j`). Corriger README et IA_ADMIN.
9. **Tailwind 4 et « preset ».** D37 : Tailwind 4 + preset ; Tailwind 4 se configure en CSS (`@theme`), la notion de preset JS est héritée de la v3.
   → *Proposition* : le script de tokens génère `themes.css` + un fichier `@theme` partagé (`packages/config/tailwind/theme.css`) importé par le site et Storybook ; pas de `tailwind.config.js`.
10. **Nombre de prompts.** README annonce « les 13 prompts » ; il y a 18 lots (0 à 14, plus 12b, 13b, 13c). → corriger README.
11. **Route admin des appels d'offres.** ADMIN §2.5 : `/admin/leads` (le mot « lead » apparaît dans l'URL, visible par l'équipe) ; maquette `Admin Appels d offres`.
    → *Proposition* : `/admin/appels-d-offres` (règle de vocabulaire D34b).
12. **Case « jusqu'à 3 artisans ».** DATABASE §4 `miseEnRelation` : « case jusqu'à 3 artisans » ; MATCHING (en tête) dit que ce « 3 artisans par demande » est remplacé (demande garantie Premium = 1 artisan ; appels d'offres = 3 réponses max).
    → *Proposition* : renommer le libellé de la case (« Être mis en relation avec des artisans ») et documenter dans DATABASE quel canal il déclenche. **À trancher par vous** : une demande du site qui n'est pas une demande garantie Premium devient-elle automatiquement un appel d'offres ?
13. **Rayons.** Annuaire : filtre 5–60 km ; transmission des demandes : 10–100 km (D31c). Cohérent en soi, mais l'annuaire filtre-t-il sur la distance au client ou sur le rayon d'intervention déclaré par l'artisan ?
    → *Proposition* : distance au client ≤ filtre ET client dans le rayon déclaré de l'artisan.
14. **Branches.** CLAUDE.md : une branche `lot-XX-nom` par lot ; la session actuelle impose `claude/relaxed-meitner-lxsu0r`.
    → *Proposition* : en session web, travailler sur la branche imposée ; sinon `lot-XX-nom`. Merci de confirmer.
15. **Composants du lot 1.** Le prompt du lot 1 et ARCHITECTURE §5.3 citent Chip, Combobox, Toast… ; MOBILE ajoute Sheet, BottomNav, StickyActionBar. Aucun écart, mais le lot 1 est très gros (monorepo + ~22 composants + Storybook + CI + Lighthouse + Playwright + Sentry).
    → *Proposition* : le découper en 1a (monorepo, config, CI, émulateurs, `core/format`, enveloppes) et 1b (tokens, composants, Storybook, layouts, pages d'erreur).
16. **Données de départ.** Les chiffres annoncés concordent avec `docs/data/` (9 + 103 prestations, 15 familles, 137 intentions, 60 métiers, 11 communes). Aucun écart constaté.

## 3. Lignes ⏳ de DECISIONS.md qui bloquent les premiers lots

| Décision | Proposition | Lot touché | Pourquoi c'est bloquant |
|---|---|---|---|
| D5 Hébergement | Vercel `cdg1` | 1 | config Next.js (runtime, `output`), CI de prévisualisation |
| D6 Suivi des erreurs | Sentry UE | 1 | intégration site + Functions au lot 1 |
| D8 Feature flags | Remote Config + surcharge Firestore | 1-2 | `packages/core/flags.ts`, `config/flags` et règles au lot 2 |
| D15 Projets Firebase | `portail-habitat-dev/-staging/-prod` | 1-2 | `.firebaserc`, garde-fou du seed (émulateur ou staging) |
| D17 Dépôt Git | GitHub privé, `main` protégée, CI obligatoire | 1 | configuration de la CI et des branches |
| D9 Antivirus | extension « Scan files » | 2 | champ de statut de scan et règles Storage des documents |
| D26 Sièges | 3 inclus, +9 € HT | 2-4 | valeur par défaut de `siegesMax`, tests des invitations |
| D27 / D28 Crédits | 5 / mois, 10 € HT l'unité | 2-3 | portefeuilles et `packages/core/leads/prix` |
| D1 Emails | Resend | 4-5 | branchement des emails Auth (lot 4) et `notifier()` (lot 5) |
| D14 Sous-domaines | tout sur le domaine, emails `notifications.` | 5 | expéditeurs et DNS Resend |

Non bloquants avant le lot 5 : D2, D3, D4 (lot 7), D7, D19, D21, D23, D29, D32, D32c-e. Les 🔒 (D13, D18, D20, D22) ne bloquent que la mise en ligne.

## 4. Variables d'environnement et comptes externes

**Comptes à créer (MISE_EN_PROD étape 1)** : GitHub · Firebase Blaze (3 projets) · Vercel · Stripe (test) · Resend (domaine vérifié) · Brevo (SMS, expéditeur `PortailHab`) · Typesense Cloud UE · clé API Sirene INSEE · Sentry UE · Anthropic · registrar du domaine. Pour le lot 1, seuls **GitHub, Firebase (dev) et Sentry** sont nécessaires ; tout le reste fonctionne sur émulateurs et captures locales jusqu'aux lots concernés.

| Service | Variables | Lot |
|---|---|---|
| Firebase (client) | `NEXT_PUBLIC_FIREBASE_API_KEY`, `_AUTH_DOMAIN`, `_PROJECT_ID`, `_STORAGE_BUCKET`, `_APP_ID`, `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` (App Check) | 1 |
| Firebase (admin) | `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY` | 1 |
| Site | `NEXT_PUBLIC_SITE_URL` | 1 |
| Sentry | `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` (+ `SENTRY_AUTH_TOKEN` pour les sourcemaps en CI, absent des docs) | 1 |
| INSEE | `INSEE_API_KEY` | 4 |
| Resend / emails | `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `EMAIL_FROM`, `EMAIL_FROM_PRO`, `EMAIL_FROM_HUMAIN`, `EMAIL_REPLY_TO`, `EMAIL_REPLY_TO_COMMERCIAL`, `EMAIL_CAPTURE`, `EMAIL_WHITELIST`, `NOTIF_SIGNING_SECRET` | 5 |
| SMS (Brevo) | `SMS_API_KEY`, `SMS_SENDER` | 5 |
| Typesense | `TYPESENSE_HOST`, `TYPESENSE_ADMIN_KEY`, `NEXT_PUBLIC_TYPESENSE_SEARCH_KEY` | 7 |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_PREMIUM_MENSUEL`, `STRIPE_PRICE_PREMIUM_ANNUEL`, `STRIPE_PRICE_VISIBILITE` (à dédoubler, voir §2 n° 5) | 11 |
| Partenaires | `PARTENAIRE_API_KEYS` (Secret Manager) | 12b |
| Comportement | `REPLAYS_BUCKET`, `COMPORTEMENT_SALT_SECRET` (Secret Manager) | 13c |
| IA | `ANTHROPIC_API_KEY` (Secret Manager) | 13c |

Les clés passent uniquement par `.env.local` (non commité) et les secrets Vercel / Firebase, jamais par le chat.

## 5. Réponses du cadrage (27/09/2026)
1. Suivi : fusion dans `AVANCEMENT.md` (D43).
2. Routes : proposition validée (D40).
3. Une demande du site hors quota Premium garanti devient automatiquement un appel d'offres (D41, MATCHING, DATABASE §4).
4. Lot 1 découpé en 1a et 1b (D43, PROMPT_CLAUDE_CODE, PLAN_DEV §3).
5. D5, D6, D8, D15, D17 : propositions par défaut retenues.
6. Corrections documentaires appliquées (§2 n° 3 à 11). N° 13 (rayon de l'annuaire) : proposition retenue, à reporter dans MATCHING §4 au lot 9. N° 12 : libellé de la case corrigé dans DATABASE.

## Décisions prises en cours de route
(date, décision, document mis à jour)
- 27/09/2026 — D44 versions du socle (Next.js 16, TypeScript 6, ESLint 9, Zod 4 en français) — DECISIONS, CLAUDE.md, README, PROMPT_CLAUDE_CODE. EXPLOITATION §5 : DEPLOIEMENT.md au lot 14.
- 27/09/2026 — D40 routes, D41 aiguillage des demandes, D42 emplacement du code et Tailwind 4, D43 suivi et découpage du lot 1 — DECISIONS, PLAN_DEV, README, ACCEPTANCE, INTEGRATIONS, CONVERSION, ADMIN, MATCHING, DATABASE, EMAILS, IA_ADMIN, COMPTES, ARCHITECTURE, PROMPT_CLAUDE_CODE, CLAUDE.md.

## Journal
- 27/09/2026 — Rangement du dépôt (`docs/`, `CLAUDE.md` et `.claude/` à la racine). Lot 0 : cadrage produit.
- 27/09/2026 — Réponses reçues, documents corrigés, lot 0 clos.
- 27/09/2026 — Lot 1a terminé (socle technique). Décision D44 : Next.js 16, TypeScript 6.
- 27/09/2026 — Lot 1b terminé (design system). Décisions D45 (contraste) et D46 (budget JS) proposées, à valider.
