# Ce que le propriétaire doit fournir ou décider

Liste préparée le 17/10/2026. Les **valeurs** des clés vont dans les secrets Vercel (site) et Google Secret Manager (Functions), jamais dans le dépôt ni dans le chat. Détail des variables : `DEPLOIEMENT.md` §2.

## 1. Comptes à créer, dans l'ordre

Commencer par l'environnement de **recette** (staging) : clés de test partout, aucun paiement réel.

| # | Compte | À faire | Clés ou réglages à poser | Débloque |
|---|---|---|---|---|
| 1 | **Nom de domaine** (D13 🔒) | Réserver `portailhabitat.fr` (+ `.com` en redirection) chez un registrar | — | tout le reste (emails, site) |
| 2 | **Firebase / Google Cloud** (plan Blaze) | Créer `portail-habitat-staging` puis `portail-habitat-prod` ; Firestore `eur3`, Storage et Functions `europe-west1` ; alertes de budget 50/80/100 % | `NEXT_PUBLIC_FIREBASE_*` (6 valeurs), `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY`, `NEXT_PUBLIC_FIREBASE_VAPID_KEY` (push, facultatif) | comptes, données, fichiers |
| 3 | **reCAPTCHA Enterprise** (même projet Google) | Enregistrer le site pour App Check (domaines `www.` et `staging.`) | `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | protection des formulaires (obligatoire en production) |
| 4 | **Identity Platform** (même projet Google) | Activer, pour la double authentification par application | — | 2FA artisans et admins |
| 5 | **Vercel** | Créer l'équipe et le projet, relier le dépôt GitHub, région `cdg1` | `VERCEL_API_TOKEN`, `VERCEL_EQUIPE`, `VERCEL_PROJET_SITES` (domaines des sites artisans) | mise en ligne |
| 6 | **Stripe** (mode **test** d'abord) | Créer le compte, puis je lance `pnpm stripe:produits` | `STRIPE_SECRET_KEY` (clé restreinte), `STRIPE_WEBHOOK_SECRET` | abonnements, crédits, packs |
| 7 | **Resend** (région UE) | Vérifier le domaine (SPF, DKIM, DMARC) | `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `RESEND_INBOUND_SECRET`, `EMAIL_FROM`, `EMAIL_FROM_PRO`, `EMAIL_REPLY_TO`, `EMAIL_WHITELIST` (recette) | tous les emails |
| 8 | **Brevo** | Compte SMS, expéditeur `PortailHab` | `BREVO_API_KEY`, `SMS_SENDER` | SMS (codes, confirmations) |
| 9 | **Typesense Cloud** (région UE) | Créer un cluster | `TYPESENSE_HOTE`, `TYPESENSE_CLE_RECHERCHE`, `TYPESENSE_CLE_ADMIN` | recherche de l'annuaire |
| 10 | **Sentry** (région UE) | Créer l'organisation et le projet | `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | suivi des erreurs |
| 11 | **Anthropic** | Compte API, plafond de dépense mensuel | `ANTHROPIC_API_KEY` (site **et** Functions) | IA du site, du blog, assistant admin |
| 12 | **Cloudflare** | Turnstile (anti-spam des formulaires de sites, D46) | `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET` | formulaires des sites artisans |
| 13 | **OVHcloud** (compte revendeur, D42) | Ouvrir l'accès API | clés API OVH (je branche ensuite le code) | achat de domaine par l'artisan |
| 14 | **DataForSEO** (D68) | Compte API, crédit prépayé | identifiant et mot de passe API (je branche ensuite) | volumes de mots-clés du blog |
| 15 | **Plateforme agréée** (D62) | Choisir la plateforme, signer le contrat « éditeur » | clés API de la plateforme | factures électroniques |
| 16 | **Google Search Console** | Propriété du domaine | accès API (je branche ensuite) | statistiques SEO des sites et du blog |

**Secrets que je peux générer moi-même** (vous n'avez qu'à les poser) : `NOTIF_SIGNING_SECRET`, `COMPORTEMENT_SALT_SECRET`, `IBAN_CLE_CHIFFREMENT` (32 octets en base64), `REPLAYS_BUCKET` (bucket UE créé dans le projet).

**Aucune clé nécessaire** : répertoire des entreprises (`recherche-entreprises.api.gouv.fr`) et communes (`geo.api.gouv.fr`), API publiques.

## 2. Informations légales (bloquantes avant la production)

| # | À fournir | Où ça sert |
|---|---|---|
| D18 🔒 | Raison sociale, forme, SIREN, adresse du siège, capital, directeur de la publication | mentions légales, CGU, CGV, pied des emails |
| D20 🔒 | Médiateur de la consommation choisi (ex. CM2C, Medicys) et son adresse | CGV, pages légales |
| D22 🔒 | Relecture par un avocat des CGU, CGV et politique d'avis | avant la mise en ligne |
| D23 | Adresse email du contact RGPD | politique de confidentialité |
| D21 | Confirmer l'hébergeur à citer (Vercel Inc. + Google Cloud EMEA) | mentions légales |

## 3. Contenus réels à fournir

- Photos du hero des landings (`apps/web/public/landing/photos`).
- Sources des chiffres marketing (« 300+ demandes/jour », « premier réseau ») ou accord pour les retirer (D72).
- Vrais témoignages d'artisans **avec leur accord écrit** (sinon la section reste masquée).
- Un numéro de téléphone du support, si vous voulez l'afficher sur `/pro/aide`.

## 4. Décisions

Réponses du 17/10/2026, reportées dans `DECISIONS.md` :

| Décision | Réponse |
|---|---|
| D71 prix du blog | option Blog 9,90 € HT/mois, 20 articles, ajoutable à Site Pro |
| D61 paiement des factures | pas en v1 (virement, IBAN sur la facture) |
| D47 modèles de site | les 6 modèles fournis sont à coder |
| D72 preuves marketing | vous fournissez les sources et les vrais avis (masqués en production d'ici là) |
| D70 blog autonome | toujours validé par l'artisan, jamais publié sans son clic |
| D68 mots-clés | DataForSEO |
| D62 facture électronique | Factur-X dès le lancement et raccordement à une plateforme agréée dès maintenant (plateforme à choisir) |
| Toutes les autres ⏳ | validées en bloc ; D29 remplacé par D59 |

**Restent ouvertes** : D62 (choix de la plateforme agréée), D72 (sources à recevoir), D32d (catégorie `offres_pro` activée par défaut : validation par l'avocat), et les 🔒 D13, D18, D20, D22.

## 5. Ensuite

1. Je déploie en recette dès que les comptes 1 à 7 existent (les autres services restent coupés proprement sans leur clé).
2. On teste ensemble les parcours (inscription, paiement en mode test, demande, devis).
3. Rien ne part en production sans votre « go ».
