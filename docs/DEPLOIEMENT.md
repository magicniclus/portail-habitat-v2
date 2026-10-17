# Déploiement — staging et production

Complète MISE_EN_PROD.md (comptes et étapes côté propriétaire) et RUNBOOK.md (incidents). **Rien ne part en production sans le « go » explicite du propriétaire.**

## 1. Environnements

| | Site (Vercel) | Firebase | Stripe | Emails |
|---|---|---|---|---|
| Aperçu (PR) | aperçu Vercel | émulateurs | test | capturés |
| Staging | `staging.portailhabitat.fr`, branche `main` | `portail-habitat-staging` | test | limités à `EMAIL_WHITELIST` |
| Production | `www.portailhabitat.fr`, tag `vX.Y.Z` | `portail-habitat-prod` | live | réels |

Région : Firestore `eur3`, Storage et Functions `europe-west1`. Projet Firebase en plan Blaze.

## 2. Variables

Noms seulement : les valeurs vont dans les secrets Vercel (site) ou Google Secret Manager (Functions), jamais dans le dépôt ni dans le chat.

**Site (Vercel)**

| Variable | Rôle |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | URL publique (liens des emails, SEO) |
| `NEXT_PUBLIC_FIREBASE_API_KEY`, `_AUTH_DOMAIN`, `_PROJECT_ID`, `_STORAGE_BUCKET`, `_APP_ID`, `_MESSAGING_SENDER_ID` | SDK navigateur |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | notifications push (facultatif) |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | App Check (reCAPTCHA Enterprise) — **obligatoire en production** |
| `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY` | Admin SDK côté serveur |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | paiements (clé restreinte) |
| `RESEND_WEBHOOK_SECRET`, `RESEND_INBOUND_SECRET` | événements et réponses Resend |
| `TYPESENSE_HOTE`, `TYPESENSE_CLE_RECHERCHE` | recherche |
| `COMPORTEMENT_SALT_SECRET` | sel quotidien des empreintes d'IP |
| `REPLAYS_BUCKET` | bucket des replays (UE, cycle de vie 30 jours) |
| `ANTHROPIC_API_KEY` | assistant IA (facultatif : coupé sans) |
| `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | erreurs et sourcemaps |
| `MAINTENANCE` | `1` pour la maintenance (RUNBOOK §1) |

Interdits hors des tests (le code refuse de démarrer avec en production) : `APP_CHECK_MODE=desactive`, `ANNUAIRE_DEMO=1`. `ADMIN_MFA=desactive` est réservé aux tests de bout en bout.

**Functions (Secret Manager / paramètres)**

`RESEND_API_KEY`, `BREVO_API_KEY`, `SMS_SENDER`, `EMAIL_REPLY_TO`, `EMAIL_WHITELIST` (staging), `NOTIF_SIGNING_SECRET`, `STRIPE_SECRET_KEY`, `TYPESENSE_HOTE`, `TYPESENSE_CLE_ADMIN`, `ANTHROPIC_API_KEY`, `SENTRY_DSN`, `NEXT_PUBLIC_SITE_URL`.

## 3. Ordre de déploiement (staging puis production)

1. **CI verte** sur le commit : format, lint, types, Knip, tests (émulateurs et règles), build, Playwright public et pro, Storybook, Lighthouse.
2. **Sauvegarde manuelle** si une migration est prévue : `gcloud firestore export gs://<bucket-sauvegardes>/avant-vX.Y.Z`.
3. **Règles et index** (avant le code qui en dépend) :
   `firebase deploy --only firestore:rules,firestore:indexes,storage --project <projet>`
   Les nouveaux index se construisent en quelques minutes : attendre « Enabled » dans la console avant l'étape suivante.
4. **Functions** : `firebase deploy --only functions --project <projet>`.
5. **Migrations** éventuelles : `pnpm migrer <id> --dry-run`, lire le bilan, puis `pnpm migrer <id> --executer`.
6. **Site** : staging = fusion sur `main` ; production = tag `vX.Y.Z` puis promotion du déploiement Vercel.
7. **Vérification** (5 minutes) : `/api/health` affiche la bonne version ; parcours « simulateur → demande envoyée » ; connexion pro ; un écran admin ; aucune nouvelle erreur Sentry.

## 4. À faire une seule fois par environnement

- **Sauvegardes** : `gcloud firestore backups schedules create --database='(default)' --recurrence=daily --retention=14w --project <projet>`.
- **TTL** : les politiques `expireLe` sont dans `firestore.indexes.json` (`fieldOverrides`) et partent avec l'étape 3 ; vérifier dans la console qu'elles sont « Active ».
- **App Check** : enregistrer l'application web avec reCAPTCHA Enterprise (domaines `www.` et `staging.`), puis activer l'application stricte pour Firestore, Storage et Functions **après** avoir vérifié en staging que les formulaires passent.
- **Bucket des replays** (UE) avec règle de cycle de vie à 30 jours ; aucune règle Storage ne l'ouvre aux clients.
- **Webhooks** : Stripe → `/api/stripe/webhook` ; Resend (événements et réception) ; partenaires → Function `importerDemandePartenaire`.
- **Produits Stripe** : `pnpm stripe:produits` (idempotent) avec la clé de l'environnement.
- **Premier superadmin** : `pnpm admin:creer` (double authentification exigée à la première connexion), puis un second depuis Admin › Équipe.
- **Budgets** Google Cloud et Vercel avec alertes à 50, 80 et 100 %.
- **Sonde externe** sur `/`, `/api/health`, `/simulateur` (alerte après 2 échecs).
- **DNS** : site vers Vercel ; SPF, DKIM, DMARC pour Resend.

## 5. Tâches planifiées (Functions, fuseau Europe/Paris)

| Fonction | Quand | Rôle |
|---|---|---|
| `matchingRelance` | 15 min | relances et expirations des attributions |
| `expirerInvitations` | toutes les heures | invitations périmées |
| `cycleCodesExpires` / `cycleDemandesInvendues` | toutes les heures (h00 / h30) | codes de remise expirés, demandes invendues offertes |
| `cycleAgreger` | 1 h 30 | statistiques de conversion |
| `purgesNuit` | 2 h 30 | anonymisation des demandes de 3 ans, traces de matching de 18 mois |
| `scoresNuit`, `comportementAgreger` | 3 h | scores des artisans, agrégats de comportement |
| `iaContexteNuit` | 3 h 30 | contexte de l'assistant, effet des recommandations à 30 jours |
| `cycleCalculer` | 5 h | étapes, signaux (dont recherches manquées) |
| `assurancesNuit` | 6 h | décennales : rappels J-30, J-7, J0, retrait de la fiche |
| `cyclePlanifier`, `cycleProspects`, `cycleAppelsComplets` | 7 h – 7 h 05 | emails de conversion du matin |
| `cyclePlanifierSoir` | 18 h 15 | emails du soir |
| `cycleHebdo`, `iaSyntheseHebdo` | lundi 7 h | demandes manquées, synthèse IA |
| `cycleTestsAB` | lundi 6 h | résultat des tests A/B d'emails |
| `rapportHebdo` | lundi 8 h | rapport des abonnés Premium |
| `compteursMois` | 1er du mois, 0 h 05 | quota mensuel de demandes remis à zéro |
| `intentionsPopularite` | 1er du mois, 4 h | popularité des intentions de recherche |
| `comptesInactifs` | dimanche 4 h | particuliers inactifs : avertissement puis suppression à 3 ans |

## 6. Liste de contrôle avant la mise en ligne

**Bloquants de DECISIONS.md (🔒), à lever par le propriétaire**

- [ ] D13 — nom de domaine `portailhabitat.fr` réservé (et `.com` en redirection)
- [ ] D18 — raison sociale, SIREN, adresse, capital renseignés dans les pages légales et les emails
- [ ] D20 — médiateur de la consommation choisi
- [ ] D22 — CGU, CGV et politique d'avis relues par un avocat

**Technique (vérifiable par Claude Code)**

- [ ] CI verte sur le tag, y compris les tests ACCEPTANCE en staging
- [ ] Règles, index et TTL déployés en production
- [ ] Sauvegardes quotidiennes actives ; restauration testée une fois en staging
- [ ] En-têtes de sécurité présents (`curl -I https://www.portailhabitat.fr` : CSP, HSTS, X-Frame-Options, Referrer-Policy)
- [ ] App Check : jeton présent dans les requêtes (formulaire public envoyé avec succès), application stricte activée
- [ ] Webhooks Stripe et Resend en production, secrets en place
- [ ] Lighthouse mobile ≥ 90 (accueil, simulateur, annuaire, `/pro`)
- [ ] Deux superadmins avec double authentification

**Parcours à la main en production (vraie carte, puis remboursement)** : inscription artisan → paiement Premium → réception d'une demande → remboursement.

## 7. Retour arrière

Voir RUNBOOK.md §2 : Instant Rollback Vercel, Functions redéployées depuis le tag précédent, feature flag, restauration depuis la sauvegarde de la veille.
