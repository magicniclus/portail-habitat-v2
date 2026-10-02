# Intégrations : Stripe, emails, Functions, SEO, sécurité

## 1. Stripe

### Produits et prix (créés dans le Dashboard, identifiants dans les variables d'environnement)
| Produit | Price | Montant | Intervalle |
|---|---|---|---|
| Premium | `price_premium_mensuel` | 99,90 € HT | mois (sans engagement) |
| Premium | `price_premium_annuel` | 958,80 € HT (79,90 × 12) | an, **payé en une fois** |
| Option Visibilité | `price_visibilite_mensuel` | 12,90 € HT | mois (sans engagement) |
| Option Visibilité | `price_visibilite_annuel` | 79,90 € HT | an, **payé en une fois** |

Le tarif Premium « par mois » affiché en annuel (79,90 €) et le forfait Visibilité annuel (79,90 €/an) ne sont valables que pour un **paiement unique de 12 mois**. Paramètre `?facturation=annuel|mensuel` transmis de la landing aux pages de paiement. Codes promo : voir la ligne « Codes promo » ci-dessous et CONVERSION.md (codes personnels, D32c).
| Pack de crédits | `price_pack_10`, `price_pack_25`, `price_pack_50` (D29) | définis dans `packsCredits` | paiement unique |
| Déblocage d'un appel d'offres | **prix dynamique** (`price_data` à la volée) | `tarification` de l'appel d'offres | paiement unique |

- **Stripe Tax** activé (TVA FR 20 %, prix HT, `tax_behavior: exclusive`). Collecte du numéro de TVA intracommunautaire (`tax_id_collection`)
- Codes promo : coupons Stripe (−30 % max sur la **première facture**, mensuelle ou annuelle, `duration: once` ; codes personnels selon DECISIONS D32c) et `allow_promotion_codes: true` dans Checkout
- Facturation : factures Stripe avec numérotation séquentielle, mentions légales B2B dans le pied de facture (pénalités de retard, indemnité de 40 €, voir CGV §6)

### Parcours
1. `/pro/abonnement/premium?facturation=annuel|mensuel&code=` → Server Action `creerCheckoutPremium(periode)` → `stripe.checkout.sessions.create({ mode:'subscription', customer, line_items, success_url, cancel_url, subscription_data:{ metadata:{ artisanId } }, client_reference_id: artisanId })` → redirection
2. `success_url` → page « Paiement confirmé » de la maquette, qui **attend le webhook** (écoute de `artisans/{id}.plan`) au lieu de faire confiance au paramètre d'URL
3. « Gérer mon abonnement » → `stripe.billingPortal.sessions.create` (changement de carte, factures, résiliation à la fin de période)
4. Le `customer` Stripe est créé au premier Checkout et enregistré dans `artisans/{id}/prive/facturation`

### Webhooks (`/api/stripe/webhook`, Route Handler, `runtime: 'nodejs'`)
Vérifier la signature (`stripe.webhooks.constructEvent` avec le corps brut) → **idempotence** via `stripeEvents/{event.id}` → traitement dans une transaction.

| Événement | Action |
|---|---|
| `checkout.session.completed` | lier le `customer` et la `subscription` à l'artisan |
| `customer.subscription.created` / `updated` | upsert `abonnements/{id}` ; selon le produit, `artisans.plan = 'premium'` ou `optionVisibilite = true`, `planExpireLe = current_period_end` ; recalcul de `artisansPublic` |
| `customer.subscription.deleted` | `plan = 'gratuit'` / `optionVisibilite = false` ; email « abonnement terminé » |
| `invoice.paid` | upsert `factures`, email avec le reçu |
| `invoice.payment_failed` | statut `past_due`, email de relance, bannière dans le tableau de bord ; **délai de grâce de 7 j** avant rétrogradation |
| `invoice.upcoming` | email « renouvellement dans 7 jours » (annuel uniquement ; obligation d'information sur la reconduction tacite) |
| `customer.subscription.trial_will_end` | si un essai est ajouté plus tard |
| `charge.dispute.created` | alerte admin, gel de l'option |
| `checkout.session.completed` (`mode: payment`, `metadata.type = 'lead'`) | finalise `debloquerAppelOffres` : `achatsLeads`, `deblocages`, attribution `acceptee` (voir MATCHING.md §8) |
| `checkout.session.completed` (`metadata.type = 'pack'`) | crédite `portefeuilles` (mouvement `achat_pack`) |
| `charge.refunded` | `achatsLeads.statut = 'rembourse'`, décrémente `nbDeblocages` si le lead est toujours ouvert |
| `invoice.paid` (Premium) | réinitialise `creditsInclusRestants` du mois |

> **Règle d'or** : `plan` et `optionVisibilite` ne sont **jamais** écrits par le client ; ils le sont uniquement par ce webhook.

---

## 2. Emails, SMS et notifications

Tout est décrit dans **`EMAILS.md`** : architecture d'envoi (file d'attente, idempotence, relances différées), préférences, catalogue complet des modèles (inscription, sécurité, onboarding, équipes, activité, facturation, admin), parcours d'inscription, limites anti-abus, délivrabilité et tests.

---

## 3. Cloud Functions (v2, `europe-west1`)

### Déclenchées par Firestore
- `onArtisanWrite` → recalcule `artisansPublic/{id}` (projection, `scoreClassement`, masquage du téléphone) et synchronise Typesense
- `onAvisWrite` → recalcule les agrégats de l'artisan ; empêche les doublons ; envoie les emails
- `onDocumentUpload` (Storage) → antivirus, EXIF, miniatures ; crée la tâche de vérification admin
- `onDemandeCreate` → **matching** : sélectionne jusqu'à 3 artisans (métier, `geohash` dans le rayon, `enLigne`, vérifiés, quota non atteint ; priorité Premium puis score), crée les `attributions`, envoie les emails
- `onMessageCreate` → masque les coordonnées tant que l'attribution n'est pas `acceptee`

### Appelables (HTTPS callable, avec App Check)
- `creerDemande`, `creerDossierDiag`, `creerAvis`, `contact` : validation Zod, **rate limit** (5 / h / IP), reCAPTCHA Enterprise, calcul de l'estimation **côté serveur** (ne jamais faire confiance au montant envoyé par le client)
- `accepterDemande`, `refuserDemande`, `envoyerDevis`, `repondreAvis`, `signalerAvis`
- `onboardingArtisan` : vérification du SIREN via l'API Recherche d'entreprises, création de `artisans` et `membres`, custom claim `role: 'artisan'`
- `supprimerMonCompte`, `exporterMesDonnees` (droit à la portabilité, ZIP JSON)

### Planifiées
| Fréquence | Tâche |
|---|---|
| Chaque nuit | `stats/public`, `statsJour` consolidés, `delaiDispoJours`, labels automatiques (`rapide`, `recommande`) |
| Chaque nuit | expiration des assurances et des certifications → emails et suspension |
| Chaque nuit | purge et anonymisation (`expireLe`), comptes inactifs |
| 1er du mois | remise à zéro de `demandesRecuesMois` |
| Toutes les heures | expiration des attributions non vues après 72 h → réattribution |
| Lundi 8 h | `rapport-hebdo` |

---

## 4. Authentification

- Particuliers : **lien magique** par email (sans mot de passe) et Google. Compte créé automatiquement au premier envoi de demande
- Artisans : email + mot de passe **et** téléphone vérifié par SMS (identifiant affiché dans l'onboarding) ; **MFA TOTP ou SMS obligatoire** pour les actions de facturation (voir la page Sécurité pro)
- Custom claims `roles`, `ent` (entreprises et rôle), `staff` (équipe interne) et `imp` (impersonation) posés par la Function `syncClaims`, jamais par le client (voir DATABASE.md §12 et COMPTES.md §1)
- Connexion côté client (SDK Firebase Auth) **et** cookie de session côté serveur, créé à partir de l'ID token : le premier sert aux écoutes temps réel, le second au rendu serveur et au middleware
- Sessions : cookie de session Firebase (`httpOnly`, `secure`, `sameSite=lax`) vérifié dans le `middleware.ts` de Next pour protéger `/pro/*`, `/mon-espace`, `/admin/*`
- **App Check** (reCAPTCHA Enterprise) sur Firestore, Storage et Functions

---

## 5. Sécurité applicative (reflète les engagements des pages légales)

- En-têtes : CSP stricte (nonces), HSTS, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`
- Toute écriture sensible passe par le serveur (Admin SDK) ; les règles Firestore refusent tout par défaut
- Validation Zod systématique en entrée ; échappement du contenu utilisateur (avis, messages) ; aucun `dangerouslySetInnerHTML`
- Rate limiting sur toutes les routes publiques et tous les formulaires
- Secrets dans Vercel ou Google Secret Manager, jamais dans le dépôt ; clés Stripe restreintes
- Journal `auditLog` pour toute action admin
- Sauvegardes Firestore quotidiennes (export planifié vers un bucket UE), restauration testée chaque trimestre
- Procédure en cas de fuite : adresse `[email sécurité]`, notification à la CNIL sous 72 h

---

## 6. SEO

- `generateMetadata` par page ; `title` et `description` repris des maquettes (déjà rédigés pour le diagnostic et les communes)
- JSON-LD : `FAQPage` (accueil, diagnostic, communes), `LocalBusiness` et `AggregateRating` (fiches artisans, **uniquement avec des avis réels publiés**), `BreadcrumbList`, `Organization`
- `sitemap.ts` dynamique (communes, fiches artisans en ligne, métiers × villes), `robots.ts` (exclure `/pro/*` connecté, `/admin`, `/mon-espace`)
- URLs canoniques ; pagination de l'annuaire avec `rel=next/prev` ; filtres indexables limités à métier × ville
- Core Web Vitals : images `next/image` (AVIF), polices `next/font` (Source Sans 3, Source Serif 4 italique uniquement), pas de JS superflu sur les landings (Server Components)

---

## 7. RGPD et cookies

- Bandeau de consentement conforme CNIL (« Tout refuser » au même niveau que « Tout accepter »), choix enregistré dans `consentements`, redemandé tous les 6 mois. Catégorie **« Mesure d'audience détaillée »** (cartes de chaleur, replays : COMPORTEMENT.md §7), refusée par défaut
- Aucun traceur non essentiel avant consentement
- Registre des traitements, liste des sous-traitants (Google Firebase, Stripe, Resend, Brevo, Vercel, Typesense, Sentry, Anthropic) à ajouter dans la politique de confidentialité
- Espace « Mes données » : export et suppression du compte

---

## 8. Variables d'environnement

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_PRICE_PREMIUM_MENSUEL=
STRIPE_PRICE_PREMIUM_ANNUEL=
STRIPE_PRICE_VISIBILITE_MENSUEL=
STRIPE_PRICE_VISIBILITE_ANNUEL=
STRIPE_PRICE_SIEGE=
STRIPE_PRICE_PACK_10= / STRIPE_PRICE_PACK_25= / STRIPE_PRICE_PACK_50=
RESEND_API_KEY=
EMAIL_FROM="Portail Habitat <notifications@portailhabitat.fr>"
TYPESENSE_HOST= / TYPESENSE_ADMIN_KEY= / NEXT_PUBLIC_TYPESENSE_SEARCH_KEY=
SENTRY_DSN= / NEXT_PUBLIC_SENTRY_DSN= / SENTRY_AUTH_TOKEN=   # sourcemaps en CI
PARTENAIRE_API_KEYS=               # Secret Manager, une clé par source (IMPORT_LEADS.md)
INSEE_API_KEY=
ANTHROPIC_API_KEY=                 # Secret Manager, assistant IA (IA_ADMIN.md)
REPLAYS_BUCKET=portailhabitat-replays
COMPORTEMENT_SALT_SECRET=          # Secret Manager
EMAIL_FROM_HUMAIN="Julie de Portail Habitat Pro <julie@notifications.portailhabitat.fr>"
NEXT_PUBLIC_SITE_URL=https://www.portailhabitat.fr
```

---

## 9. Environnements et qualité

- 3 projets Firebase : `dev`, `staging`, `prod`. Émulateurs Firebase en local (Auth, Firestore, Functions, Storage)
- Stripe en mode test pour `dev` et `staging` ; webhooks en local via `stripe listen`
- CI : lint, typecheck, tests unitaires (`packages/core/simulateur`, `packages/core/diagnostic`, tri et classement), tests des règles Firestore, tests Playwright des parcours (simulateur, diagnostic, avis, checkout)
- Données de démonstration (`scripts/seed.ts`) : reprendre les artisans, communes, prestations et diagnostics des maquettes
