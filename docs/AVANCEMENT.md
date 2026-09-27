# Avancement — Portail Habitat

Produit au lot 0 (cadrage, 27/09/2026). Mis à jour à la fin de chaque lot.
Légende : ⬜ à faire · 🟡 en cours · ✅ terminé · ⏸ bloqué

## 1. Lots

- [ ] **Lot 0** — Cadrage : ce document. 🟡 En attente de vos réponses (§2 à §4).
- [ ] **Lot 1** — Socle technique, système de composants (monorepo, tokens 4 thèmes, primitives, Storybook, CI, émulateurs)
- [ ] **Lot 2** — Modèle de données et sécurité (schémas Zod de DATABASE §16, règles, index, TTL, `peut()`, flags)
- [ ] **Lot 3** — Logique métier pure (simulateur 9 + 103 prestations, diagnostic, recherche, parcours, stats, prix, annuaire, matching)
- [ ] **Lot 4** — Comptes, entreprises, équipes, jeu de données (seed)
- [ ] **Lot 5** — Emails, SMS, notifications (`notifier()`, React Email, Mailpit)
- [ ] **Lot 6** — Pages publiques, SEO, bandeau cookies
- [ ] **Lot 7** — Recherche de projet (Typesense + repli local)
- [ ] **Lot 8** — Parcours particuliers et espace particulier
- [ ] **Lot 9** — Annuaire et fiche publique
- [ ] **Lot 10** — Espace artisan, équipes, PWA
- [ ] **Lot 11** — Stripe (Visibilité, Premium, sièges, packs, webhooks)
- [ ] **Lot 12** — Matching et appels d'offres
- [ ] **Lot 12b** — Import des demandes partenaires
- [ ] **Lot 13** — Back-office (16 sections, permissions)
- [ ] **Lot 13b** — Moteur de conversion et séquences d'emails
- [ ] **Lot 13c** — Comportement des visiteurs, audit IA, assistant de rédaction
- [ ] **Lot 14** — Qualité, exploitation, préparation de la mise en production

## 2. Incohérences et zones floues (avec proposition)

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

## 5. Questions pour vous

1. Suivi : fusionner `PROGRESSION.md` dans `AVANCEMENT.md` (§2 n° 1) ?
2. Routes : validez-vous la proposition du §2 n° 2 ?
3. Une demande du site hors demande garantie Premium devient-elle un appel d'offres (§2 n° 12) ?
4. Découper le lot 1 en 1a / 1b (§2 n° 15) ?
5. Les propositions par défaut de D5, D6, D8, D15, D17 vous conviennent-elles pour démarrer le lot 1 ?
6. Dois-je appliquer les corrections documentaires du §2 (n° 3 à 11) dans `docs/` avant le lot 1 ?

## Journal
- 27/09/2026 — Rangement du dépôt (`docs/`, `CLAUDE.md` et `.claude/` à la racine). Lot 0 : cadrage produit, en attente des réponses.
