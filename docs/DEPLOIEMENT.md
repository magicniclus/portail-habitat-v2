# Déploiement — staging et production

Complète MISE_EN_PROD.md (comptes et étapes côté propriétaire) et RUNBOOK.md (incidents). **Rien ne part en production sans le « go » explicite du propriétaire.**

## 1. Environnements

| | Site (Vercel) | Firebase | Stripe | Emails |
|---|---|---|---|---|
| Aperçu (PR) | aperçu Vercel | émulateurs | test | capturés |
| Staging | `staging.portailtravaux.fr`, branche `main` | `portail-travaux-staging` | test | limités à `EMAIL_WHITELIST` |
| Production | `www.portailtravaux.fr`, tag `vX.Y.Z` | `portail-travaux-prod` | live | réels |

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
| `OVH_APP_KEY`, `OVH_APP_SECRET`, `OVH_CONSUMER_KEY` | achat de domaine par l'artisan (OVH compte ordinaire, D42, prioritaire ; facultatif) |
| `GANDI_TOKEN` | achat de domaine par l'artisan (Gandi, D42, secours ; facultatif : achat « bientôt » sans) ; `GANDI_BAC_A_SABLE=1` en recette |
| `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | erreurs et sourcemaps |
| `MAINTENANCE` | `1` pour la maintenance (RUNBOOK §1) ; l'interrupteur `maintenance` de l'admin suffit en général |
| `RATE_LIMIT_FACTEUR` | facultatif : entier ≥ 1 qui multiplie les limites de débit (recette, pic) ; sous `pnpm dev`, aucune limite |
| `NOTIF_SIGNING_SECRET` | jetons des liens de préférences et d'action (même valeur que les Functions) |
| `IBAN_CLE_CHIFFREMENT` | chiffrement de l'IBAN des paramètres de facturation des artisans |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET` | anti-spam des formulaires des sites artisans (D46) |
| `VERCEL_API_TOKEN`, `VERCEL_EQUIPE`, `VERCEL_PROJET_SITES`, `DOMAINE_SITES` | domaines des sites artisans (DOMAINES.md ; `DOMAINE_SITES` = domaine des sous-domaines, `portailtravaux.fr` par défaut) |
| `YOUTUBE_API_KEY`, `STUDIO_CHIFFREMENT_CLE`, `STUDIO_RENDU_URL`, `STUDIO_RENDU_CLE`, `ELEVENLABS_API_KEY`, `GOOGLE_OAUTH_CLIENT_ID` / `_SECRET`, `INSTAGRAM_APP_ID` / `_SECRET`, `TIKTOK_CLIENT_KEY` / `_SECRET`, `INSTAGRAM_TENDANCES_*` | Studio vidéo (facultatif, CLES.md §4) |

Dessin (Plans) n'a besoin d'**aucune** variable : flags `dessin` et `dessinPublic` dans l'admin, services IGN publics appelés par le serveur.

Interdits hors des tests (le code refuse de démarrer avec en production) : `APP_CHECK_MODE=desactive`, `ANNUAIRE_DEMO=1`. `ADMIN_MFA=desactive` est réservé aux tests de bout en bout.

**Functions (Secret Manager / paramètres)**

`RESEND_API_KEY`, `BREVO_API_KEY`, `SMS_SENDER`, `EMAIL_FROM`, `EMAIL_FROM_PRO`, `EMAIL_REPLY_TO`, `EDITEUR_MENTION` (pied des emails, dépend de D18 🔒), `EMAIL_WHITELIST` et `EMAIL_CAPTURE=mailpit` (staging), `NOTIF_SIGNING_SECRET`, `STRIPE_SECRET_KEY`, `TYPESENSE_HOTE`, `TYPESENSE_CLE_ADMIN`, `ANTHROPIC_API_KEY`, `SENTRY_DSN`, `NEXT_PUBLIC_SITE_URL` ; pour les domaines (`verifierDomaines`) : `VERCEL_API_TOKEN`, `VERCEL_EQUIPE`, `VERCEL_PROJET_SITES`, `OVH_*` ou `GANDI_*` ; pour le Studio (`studioPublier`, `studioStats`) : `STUDIO_CHIFFREMENT_CLE` et les clés OAuth des réseaux.

## 3. Ordre de déploiement (staging puis production)

1. **CI verte** sur le commit : format, lint, types, Knip, tests (émulateurs et règles), build, Playwright public et pro, Storybook, Lighthouse (`.github/workflows/ci.yml`).
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
- **Référentiel réel** : `pnpm referentiel:importer <projet>` (prestations, prix, recherche, communes ; rien n'est remplacé sans `--ecraser`).
- **Robot du Studio** (facultatif) : `scripts/deployerStudio.sh` (Cloud Run), puis `STUDIO_RENDU_URL` et `STUDIO_RENDU_CLE`.
- **Flags** : vérifier dans Admin › Référentiels l'état voulu de chaque flag (`config/flags`). Dessin reste **éteint** (`dessin`, `dessinPublic`) tant que le propriétaire n'a pas donné son « go » (lot 15k en recette).
- **Webhooks** : Stripe → `/api/stripe/webhook` ; Resend (événements et réception) ; partenaires → Function `importerDemandePartenaire`.
- **Produits Stripe** : `pnpm stripe:produits` (idempotent) avec la clé de l'environnement.
- **Premier superadmin** : `pnpm admin:creer` (double authentification exigée à la première connexion), puis un second depuis Admin › Équipe.
- **Budgets** Google Cloud et Vercel avec alertes à 50, 80 et 100 %.
- **Sonde externe** sur `/`, `/api/health`, `/simulateur` (alerte après 2 échecs).
- **DNS** : site vers Vercel ; SPF, DKIM, DMARC pour Resend.

## 5. Tâches planifiées (Functions, fuseau Europe/Paris)

Liste vérifiée dans `apps/functions/src` le 19/11/2026.

| Fonction | Quand | Rôle |
|---|---|---|
| `verifierDomaines` | toutes les 2 min | domaines des sites : commande, zone DNS, vérification (DOMAINES §4) |
| `publierArticlesBlog` | toutes les 5 min | articles de blog planifiés → publiés |
| `studioPublier` | toutes les 10 min | vidéos programmées du Studio envoyées sur YouTube, Instagram, TikTok |
| `matchingRelance` | 15 min | relances et expirations des attributions |
| `expirerInvitations` | toutes les heures | invitations périmées |
| `piloteBlog` | toutes les heures (h25) | pilote automatique du blog : brouillon + email `blog-a-valider` 48 h avant (D70) |
| `cycleCodesExpires` / `cycleDemandesInvendues` | toutes les heures (h00 / h30) | codes de remise expirés, demandes invendues offertes |
| `studioStats` | toutes les 6 h | résultats des vidéos publiées depuis 30 jours |
| `cycleAgreger` | 1 h 30 | statistiques de conversion |
| `purgesNuit` | 2 h 30 | anonymisation des demandes de 3 ans, traces de matching de 18 mois |
| `scoresNuit`, `comportementAgreger` | 3 h | scores des artisans, agrégats de comportement |
| `viderCorbeilleBlogNuit` | 3 h 20 | articles supprimés depuis plus de 30 jours |
| `iaContexteNuit` | 3 h 30 | contexte de l'assistant, effet des recommandations à 30 jours |
| `purgeDessinNuit` | 3 h 40 | plans Dessin à la corbeille depuis plus de 30 jours (versions, fichiers, liens de partage ; 200 par passage) |
| `cycleCalculer` | 5 h | étapes, signaux (dont recherches manquées) |
| `assurancesNuit` | 6 h | décennales : rappels J-30, J-7, J0, retrait de la fiche |
| `controlerDomaines` | 6 h | domaines actifs relus ; DNS incorrect 3 jours → `casse` (DOM-06) |
| `echeancesDevisFactures` | 8 h 50 | factures impayées après échéance et relances J−3, J+1, J+15 ; devis expirés et relance J+7 |
| `cyclePlanifier`, `cycleProspects`, `cycleAppelsComplets` | 7 h – 7 h 05 | emails de conversion du matin |
| `cyclePlanifierSoir` | 18 h 15 | emails du soir |
| `cycleHebdo`, `iaSyntheseHebdo` | lundi 7 h | demandes manquées, synthèse IA |
| `cycleTestsAB` | lundi 6 h | résultat des tests A/B d'emails |
| `rapportHebdo` | lundi 8 h | rapport des abonnés Premium |
| `compteursMois` | 1er du mois, 0 h 05 | quota mensuel de demandes remis à zéro |
| `intentionsPopularite` | 1er du mois, 4 h | popularité des intentions de recherche |
| `comptesInactifs` | dimanche 4 h | particuliers inactifs : avertissement puis suppression à 3 ans |

Autres Functions (non planifiées) : déclencheurs `syncClaims`, `projeterArtisan`, `attribuerNouvelleDemande`, `syncIntentionTypesense`, `syncSynonymesTypesense` ; callables des comptes et équipes (INTEGRATIONS §3) ; tâche `envoyerEnvoi` (Cloud Tasks : la file doit exister) ; webhook HTTPS `importerDemandePartenaire`. Région `europe-west1`, 10 instances au plus par fonction.

## 6. Liste de contrôle avant la mise en ligne

**Bloquants de DECISIONS.md (🔒), à lever par le propriétaire**

- [ ] D13 — nom de domaine `portailtravaux.fr` réservé (et `.com` en redirection)
- [ ] D18 — raison sociale, SIREN, adresse, capital renseignés dans les pages légales et les emails
- [ ] D20 — médiateur de la consommation choisi
- [ ] D22 — CGU, CGV et politique d'avis relues par un avocat

**Technique (vérifiable par Claude Code)**

- [ ] CI verte sur le tag, y compris les tests ACCEPTANCE en staging
- [ ] Règles, index et TTL déployés en production
- [ ] Sauvegardes quotidiennes actives ; restauration testée une fois en staging
- [ ] En-têtes de sécurité présents (`curl -I https://www.portailtravaux.fr` : CSP, HSTS, X-Frame-Options, Referrer-Policy)
- [ ] App Check : jeton présent dans les requêtes (formulaire public envoyé avec succès), application stricte activée
- [ ] Webhooks Stripe et Resend en production, secrets en place
- [ ] Lighthouse mobile ≥ 90 (accueil, simulateur, annuaire, `/pro`)
- [ ] Deux superadmins avec double authentification
- [ ] Les 31 tâches planifiées du §5 apparaissent dans Cloud Scheduler ; la file Cloud Tasks d'`envoyerEnvoi` existe
- [ ] Flags dans l'état voulu (`config/flags`) ; `dessin` et `dessinPublic` éteints sauf « go » explicite pour Plans
- [ ] Règles Firestore et Storage du lot 15 (plans, `historique`, dossier `dessin/`) déployées **avant** d'allumer `dessin` ; index de champ `plans.supprimeLe` (groupe) actif, sinon `purgeDessinNuit` échoue

**Pas encore prêt pour la production (à savoir)** : `/api/health` ne vérifie pas encore Firestore, Stripe et Resend ; aucune alerte automatique (EXPLOITATION §3) ; EXIF et antivirus des fichiers envoyés non faits (DATABASE §13) ; pack IA non branché au webhook Stripe.

**Parcours à la main en production (vraie carte, puis remboursement)** : inscription artisan → paiement Premium → réception d'une demande → remboursement.

## 7. Retour arrière

Voir RUNBOOK.md §2 : Instant Rollback Vercel, Functions redéployées depuis le tag précédent, feature flag, restauration depuis la sauvegarde de la veille.

## 8. État au 19/11/2026

Rien n'est déployé, ni en recette ni en production : tout le travail est sur la branche `fusion-dev` (lots 0 à 14, paiements refaits, landings, devis et factures, site artisan, IA du site, blog, Studio ; lot 15 Plans en recette 15k ; état de chaque lot dans AVANCEMENT.md §1). Les projets Firebase, Vercel, Stripe, Resend… restent à créer (A_FOURNIR.md).
