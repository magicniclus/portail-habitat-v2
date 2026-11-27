# Intégrations : Stripe, emails, Functions, SEO, sécurité

## 1. Stripe

### Produits et prix (détail et règles : **PAIEMENTS.md**, qui fait foi)
Les prix Stripe sont retrouvés par leur **clé de recherche** (`lookup_key`), créée par `pnpm stripe:produits` depuis `CATALOGUE_STRIPE` (`packages/core/src/facturation/abonnements.ts`) ; aucun identifiant de prix à copier.

| Produit | Clé de recherche | Montant | Intervalle |
|---|---|---|---|
| Fiche Pro | `ph_fiche_pro` | 29,00 € HT | mois, sans engagement |
| Site Pro | `ph_site_pro` | 9,90 € HT | mois, sans engagement |
| Fiche + Site | `ph_pack_fiche_site` | 34,90 € HT | mois, sans engagement |
| Tout inclus | `ph_tout_inclus` | 49,00 € HT | mois, sans engagement |
| Siège supplémentaire | `ph_siege` | 9,00 € HT | mois |
| Option Blog | `ph_option_blog` | voir PAIEMENTS (D71) | mois |
| Packs de crédits | `ph_credits_50`, `ph_credits_100`, `ph_credits_250` | 50 / 100 / 250 € HT (50 / 110 / 290 crédits) | paiement unique |
| Pack IA | `ph_ia_100` | 2,90 € HT | paiement unique |
| Appel d'offres | **prix dynamique** (`price_data`) | grille admin `grillesTarifaires`, −15 % en Tout inclus | paiement unique |

Plus de formule annuelle ni de Visibilité / Premium. Aucun prix affiché avant l'inscription (PAIEMENTS §1).
- **Stripe Tax** activé (TVA FR 20 %, prix HT, `tax_behavior: exclusive`). Collecte du numéro de TVA intracommunautaire (`tax_id_collection`)
- Codes promo : coupons Stripe (ex. −30 % le premier mois, `duration: once`) et `allow_promotion_codes: true` dans Checkout
- Facturation : factures Stripe avec numérotation séquentielle, mentions légales B2B dans le pied de facture (pénalités de retard, indemnité de 40 €, voir CGV §6)

### Parcours
1. `/pro/abonnement?offre=` → Server Action `changerFormule(formule)` (abonnement existant : `subscriptions.update` avec prorata ; sinon Payment Element + `subscriptions.create`) → `stripe.checkout.sessions.create({ mode:'subscription', customer, line_items, success_url, cancel_url, subscription_data:{ metadata:{ artisanId } }, client_reference_id: artisanId })` → redirection
2. `success_url` → page « Paiement confirmé » de la maquette, qui **attend le webhook** (interroge `GET /api/pro/abonnement/etat`, qui lit `artisans/{id}.droits`) au lieu de faire confiance au paramètre d'URL ; en local, `/api/pro/abonnement/relais-local` rejoue l'événement
3. « Gérer mon abonnement » → `stripe.billingPortal.sessions.create` (changement de carte, factures, résiliation à la fin de période)
4. Le `customer` Stripe est créé au premier Checkout et enregistré dans `artisans/{id}/prive/facturation`

### Webhooks (`/api/stripe/webhook`, Route Handler, `runtime: 'nodejs'`)
Vérifier la signature (`stripe.webhooks.constructEvent` avec le corps brut) → **idempotence** via `stripeEvents/{event.id}` → traitement dans une transaction.

| Événement | Action |
|---|---|
| `checkout.session.completed` | lier le `customer` et la `subscription` à l'artisan |
| `customer.subscription.created` / `updated` | upsert `abonnements/{id}` ; `artisans.droits = droitsDe(formule)` (PAIEMENTS §5), `finPeriode = current_period_end`, recopie `sites/{id}.droits.ia` ; recalcul de `artisansPublic` |
| `customer.subscription.deleted` | `droits = droitsDe('gratuit')` ; email « abonnement terminé » |
| `invoice.paid` | upsert `factures`, email avec le reçu |
| `invoice.payment_failed` | statut `past_due`, email de relance, bannière dans le tableau de bord ; **délai de grâce de 7 j** avant rétrogradation |
| `invoice.upcoming` | email « renouvellement dans 7 jours » (annuel uniquement ; obligation d'information sur la reconduction tacite) |
| `customer.subscription.trial_will_end` | si un essai est ajouté plus tard |
| `charge.dispute.created` | alerte admin, gel de l'option |
| `checkout.session.completed` (`mode: payment`, `metadata.type = 'lead'`) | finalise `debloquerAppelOffres` : `achatsLeads`, `deblocages`, attribution `acceptee` (voir MATCHING.md §8) |
| `checkout.session.completed` (`metadata.type = 'pack'`) | crédite `portefeuilles` (mouvement `achat_pack`) |
| `charge.refunded` | `achatsLeads.statut = 'rembourse'`, décrémente `nbDeblocages` si le lead est toujours ouvert |
| `checkout.session.completed` (`metadata.type = 'ia'`) | **pas encore fait** : le prix `ph_ia_100` existe dans le catalogue, mais aucun achat ni crédit du pack IA n'est branché (la collection `iaQuotasSite` prévue n'existe pas ; les quotas sont dans `sites/{id}/ia/{AAAA-MM}`) |

> **Règle d'or** : `droits` n'est **jamais** écrit par le client ; ils le sont uniquement par ce webhook.

> **État du code (19/11/2026)** : les événements reconnus dans le code sont `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid` et `invoice.payment_failed`. **Pas encore traités** : `invoice.upcoming` (inutile sans formule annuelle), `customer.subscription.trial_will_end`, `charge.dispute.created`, `charge.refunded`, achat du pack IA. Le webhook est une route du site (`/api/stripe/webhook`), pas une Function.

---

## 2. Emails, SMS et notifications

Tout est décrit dans **`EMAILS.md`** : architecture d'envoi (file d'attente, idempotence, relances différées), préférences, catalogue complet des modèles (inscription, sécurité, onboarding, équipes, activité, facturation, admin), parcours d'inscription, limites anti-abus, délivrabilité et tests.

---

## 3. Cloud Functions (v2, `europe-west1`)

> **État réel** : la liste des Functions déployées est `apps/functions/src/index.ts` ; le détail des tâches planifiées et de leurs horaires est dans DEPLOIEMENT.md §5. La plupart des écritures des utilisateurs passent **par le site** (routes `app/api/**/route.ts` avec l'enveloppe `action()`, ARCHITECTURE §7), pas par des Functions appelables.

### Déclenchées par Firestore (faites)
- `projeterArtisan` (`artisans/{id}` écrit) → recalcule `artisansPublic/{id}` (`projeterArtisanPublic` : projection, `scoreClassement`, masquage du téléphone) et l'index Typesense s'il est configuré
- `attribuerNouvelleDemande` (`demandes/{id}` créé, avec nouvelles tentatives) → **matching** (MATCHING.md) : attributions, emails
- `syncClaims` (`artisans/{id}/membres/{uid}` écrit) → custom claims
- `syncIntentionTypesense`, `syncSynonymesTypesense` → index Typesense de la recherche (inactifs sans configuration, D4)

**Prévus et pas faits** : `onAvisWrite` (les agrégats et emails des avis sont faits par le serveur au moment de la modération), `onDocumentUpload` (antivirus, EXIF, miniatures : pas encore fait), `onMessageCreate` (le filtrage des coordonnées se fait à l'écriture du message, côté serveur).

### Appelables (`callable()`, App Check exigé hors émulateur)
- Comptes et équipes (`apps/functions/src/comptes/appelables.ts`) : `rechercherEntreprise`, `finaliserOnboarding`, `inviterMembre`, `renvoyerInvitation`, `revoquerInvitation`, `accepterInvitation`, `demanderAcces`, `repondreDemandeAcces`, `modifierMembre`, `retirerMembre`, `quitterEntreprise`, `transfererPropriete`, `fermerEntreprise`, `supprimerMonCompte`, `demanderLienConnexion`, `demanderReinitialisation`, `renvoyerVerificationEmail` ; plus `ping`.
- **Faits autrement** (routes du site, même enveloppe : Zod, débit, App Check, estimation **recalculée côté serveur**) : création des demandes (`POST /api/demandes`), diagnostics (`/api/diagnostics`), avis (`/api/avis`), réponses aux demandes (`/api/pro/demandes/*`), devis (`/api/pro/devis/*`), export et suppression « Mes données » (`/api/mon-espace/export`, `/api/mon-espace/suppression`), Dessin (`/api/dessin/{operation}`), etc. Pas de reCAPTCHA Enterprise sur ces formulaires : App Check (reCAPTCHA Enterprise) protège l'ensemble.

### HTTP et tâches
- `importerDemandePartenaire` (webhook HTTPS des partenaires, IMPORT_LEADS.md)
- `envoyerEnvoi` (tâche Cloud Tasks des emails et SMS, EMAILS §1)

### Planifiées
Voir DEPLOIEMENT.md §5 (liste complète, horaires réels). Ce qui était prévu ici et n'est **pas encore fait** : recalcul de nuit de `stats/public`, de `delaiDispoJours` et des labels automatiques (`rapide`, `recommande`) ; expiration des certifications autres que la décennale.

---

## 4. Authentification

- Particuliers : **lien magique** par email (sans mot de passe) et Google. Compte créé automatiquement au premier envoi de demande
- Artisans : depuis le parcours d'inscription du 16/11/2026, compte par **Google ou email + mot de passe** (« Créez votre compte », étape 3) ; double authentification par application (**TOTP**, Identity Platform, activée par `pnpm admin:totp`) ; par SMS seulement avec le flag `deuxFacteursSms` (éteint, SMS facturés). Obligatoire pour l'équipe interne (`secondFacteur` de `actionAdmin()`)
- Custom claims `roles`, `ent` (entreprises et rôle), `staff` (équipe interne) et `imp` (impersonation) posés par la Function `syncClaims`, jamais par le client (voir DATABASE.md §12 et COMPTES.md §1)
- Connexion côté client (SDK Firebase Auth) **et** cookie de session côté serveur, créé à partir de l'ID token : le premier sert aux écoutes temps réel, le second au rendu serveur et au middleware
- Sessions : cookie de session Firebase (`httpOnly`, `secure`, `sameSite=lax`) ; Next.js 16 remplace `middleware.ts` par **`apps/web/proxy.ts`**, qui pose aussi les en-têtes de sécurité et la maintenance ; la session est vérifiée côté serveur (`server/sessionPro.ts`, `sessionAdmin.ts`) pour `/pro/*`, `/mon-espace`, `/admin/*`
- **App Check** (reCAPTCHA Enterprise) : jeton chargé au premier geste du visiteur, envoyé en en-tête ou dans le cookie court `ph_appcheck`, vérifié par l'enveloppe `action()` et exigé par les callables. L'application stricte côté console (Firestore, Storage, Functions) reste à activer au déploiement (DEPLOIEMENT §4). `APP_CHECK_MODE=desactive` est refusé en production

---

## 5. Sécurité applicative (reflète les engagements des pages légales)

- En-têtes (`apps/web/lib/securite.ts`, posés par `proxy.ts`, testés) : CSP, HSTS (production), `X-Frame-Options: SAMEORIGIN` (et non `DENY` : l'écran Comportement de l'admin affiche les pages publiques dans un cadre), `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`
- **CSP à deux niveaux** (choix du lot 14) : pages publiques **sans nonce** (`script-src 'self' 'unsafe-inline'` + Google), sinon chaque page deviendrait dynamique et perdrait son cache ; espaces connectés (pro, admin, Mon espace) **avec nonce et `strict-dynamic`**. Sources autorisées : Firebase et Google APIs, Sentry, `www.google.com` (reCAPTCHA), tuiles OpenStreetMap (carte de l'inscription), miniatures et lecteur YouTube sans cookie, `blob:` en `connect-src` (textures 3D de Dessin, D88) et `worker-src`. Les sites des artisans ont leur propre CSP (`politiqueSite` : empreintes, Turnstile, balises publicitaires après consentement). Dessin n'ajoute aucune source externe côté navigateur : IGN Géoplateforme et API Carto sont appelées par le serveur
- Toute écriture sensible passe par le serveur (Admin SDK) ; les règles Firestore refusent tout par défaut
- Validation Zod systématique en entrée ; échappement du contenu utilisateur (avis, messages) ; aucun `dangerouslySetInnerHTML` sur du contenu saisi (le HTML des devis et des articles est assaini côté serveur)
- Rate limiting sur toutes les routes publiques et tous les formulaires (`rateLimits`, multiplicateur `RATE_LIMIT_FACTEUR` ; aucune limite sous `pnpm dev`)
- Secrets dans Vercel ou Google Secret Manager, jamais dans le dépôt ; clés Stripe restreintes
- Journal `auditLog` pour toute action admin
- Sauvegardes Firestore quotidiennes (export planifié vers un bucket UE), restauration testée chaque trimestre
- Procédure en cas de fuite : adresse `[email sécurité]`, notification à la CNIL sous 72 h

---

## 6. SEO

- `generateMetadata` par page ; `title` et `description` repris des maquettes (déjà rédigés pour le diagnostic et les communes)
- JSON-LD : `FAQPage` (accueil, diagnostic, communes), `LocalBusiness` et `AggregateRating` (fiches artisans, **uniquement avec des avis réels publiés**), `BreadcrumbList`, `Organization`
- `sitemap.ts` dynamique (communes, fiches artisans en ligne, **pages de secteur indexées du registre `pagesSecteur`**), `robots.ts` (exclure `/pro/*` connecté, `/admin`, `/mon-espace`)
- **Pages de secteur métier × commune** (24/11/2026, DATABASE `pagesSecteur`) : créées à l'arrivée d'un artisan (sa commune + communes de 5 000 habitants et plus de sa zone) ; **indexées seulement avec au moins un artisan du métier à 20 km** (`pageIndexee`), sinon « noindex, follow », toujours consultables ; annuaire complet dans la page (filtres, tri, résultats ; un filtre ouvre `/artisans`, non indexé) ; texte local rédigé par l'IA (recherche web de faits sourcés, rédaction structurée, contrôles : aucun chiffre sans source, sources réellement trouvées, ressemblance entre pages du même métier) puis publié automatiquement ; liens seulement vers des pages indexées ; JSON-LD `BreadcrumbList`, `FAQPage`, `ItemList`. Mise en service : `pnpm pages-secteur:rattraper`
- URLs canoniques ; pagination de l'annuaire avec `rel=next/prev` ; filtres indexables limités à métier × ville
- Core Web Vitals : images `next/image` (AVIF), polices `next/font` (Source Sans 3, Source Serif 4 italique uniquement), pas de JS superflu sur les landings (Server Components)

---

## 7. RGPD et cookies

- Bandeau de consentement conforme CNIL (« Tout refuser » au même niveau que « Tout accepter »), choix enregistré dans `consentements`, redemandé tous les 6 mois. Catégorie **« Mesure d'audience détaillée »** (cartes de chaleur, replays : COMPORTEMENT.md §7), refusée par défaut
- Aucun traceur non essentiel avant consentement
- Registre des traitements, liste des sous-traitants (Google Firebase, Stripe, Resend, Brevo, Vercel, Typesense, Sentry, Anthropic) à ajouter dans la politique de confidentialité ; à compléter pour ce qui a été ajouté depuis : Cloudflare (Turnstile des sites), OVHcloud ou Gandi (domaines achetés au nom de l'artisan), Google (YouTube) et Meta / TikTok (Studio), IGN (adresses saisies dans l'implantation des plans, appel serveur)
- Espace « Mes données » : export (`/api/mon-espace/export`, plans Dessin et leurs scènes compris) et suppression du compte (plans, fichiers et liens de partage effacés)

---

## 8. Variables d'environnement

La liste à jour (noms seulement, rôle, où les poser) est dans **DEPLOIEMENT.md §2** et **CLES.md** ; aucune valeur dans le dépôt. Écarts avec la liste d'origine de ce paragraphe :
- noms réels : `TYPESENSE_HOTE`, `TYPESENSE_CLE_RECHERCHE` (site), `TYPESENSE_CLE_ADMIN` (Functions) au lieu de `TYPESENSE_HOST` / `TYPESENSE_ADMIN_KEY` / `NEXT_PUBLIC_TYPESENSE_SEARCH_KEY` ; `BREVO_API_KEY` et `SMS_SENDER` pour les SMS ;
- **plus utilisées** : `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (aucune saisie de carte chez nous : Checkout et portail Stripe), `STRIPE_PRICE_*` (prix retrouvés par clé de recherche, §1), `PARTENAIRE_API_KEYS` (clé de chaque source hachée dans `sourcesDemandes.cleApiHash`, créée par `pnpm partenaire:source`), `INSEE_API_KEY` (API Recherche d'entreprises, sans clé), `EMAIL_FROM_HUMAIN` ;
- **ajoutées** : `RESEND_INBOUND_SECRET`, `NOTIF_SIGNING_SECRET`, `IBAN_CLE_CHIFFREMENT`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET`, `VERCEL_API_TOKEN` / `VERCEL_EQUIPE` / `VERCEL_PROJET_SITES` (domaines des sites), `OVH_*` / `GANDI_*` (achat de domaine), `DOMAINE_SITES`, `MAINTENANCE`, `RATE_LIMIT_FACTEUR`, `APP_CHECK_MODE` (tests seulement), variables du Studio (`YOUTUBE_API_KEY`, `STUDIO_*`, OAuth des réseaux), `SENTRY_*`.
- Dessin (Plans) n'utilise **aucune clé** : IGN Géoplateforme (`data.geopf.fr`) et API Carto (`apicarto.ign.fr`) sont publics et appelés par le serveur.

---

## 9. Environnements et qualité

- Projets Firebase prévus : `staging` et `prod` (DEPLOIEMENT §1) ; en local, émulateurs avec le projet `demo-portail-travaux` (Auth, Firestore, Storage, Functions). Rien n'est déployé au 19/11/2026
- Stripe en mode test pour `dev` et `staging` ; webhooks en local via `stripe listen`
- CI (GitHub Actions) : format, lint, typecheck, Knip, tests Vitest (`@ph/core` dont pertinence de la recherche, `@ph/ui`, `@ph/emails`, `@ph/firebase` avec règles Firestore et Storage sur émulateurs), build, Playwright public et pro (Chromium + WebKit), Lighthouse CI
- Données de démonstration : `pnpm seed` (`scripts/seed.ts`, refuse de tourner hors émulateur ou recette) ; référentiel réel : `pnpm referentiel:importer`
