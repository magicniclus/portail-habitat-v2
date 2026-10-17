# Clés et réglages à fournir

> Aucune valeur secrète dans ce dépôt. Deux endroits seulement :
> - **Vercel** → projet → *Settings* → *Environment Variables* (le site). Cocher *Preview* et *Production* (valeurs de **test** en Preview).
> - **Firebase** (Cloud Functions) → dans un terminal : `firebase functions:secrets:set NOM` (Google Secret Manager).
>
> Les noms commençant par `NEXT_PUBLIC_` ne sont pas secrets (visibles dans le navigateur).

## 1. Indispensable pour tester en ligne (projet Firebase de recette)

| Nom | Où la trouver | Où la mettre |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_APP_ID`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Console Firebase → ⚙️ Paramètres du projet → *Vos applications* → application Web → « Configuration » | Vercel |
| `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY` | Console Firebase → ⚙️ → *Comptes de service* → « Générer une nouvelle clé privée » (fichier JSON : `client_email` et `private_key`) | Vercel (la clé privée entière, avec les `\n`) |
| `NEXT_PUBLIC_SITE_URL` | l'adresse du site (ex. `https://portail-habitat.vercel.app` en recette) | Vercel **et** secret Functions |
| **Identity Platform** (pas une clé) | Console Firebase → *Authentication* → *Paramètres* → passer à Identity Platform, puis *Authentification multifacteur* → activer **TOTP** | — |

## 2. Paiements (lot 11, Stripe en mode **test**)

| Nom | Où la trouver | Où la mettre |
|---|---|---|
| `STRIPE_SECRET_KEY` (`sk_test_…`) | Dashboard Stripe, mode Test → *Développeurs* → *Clés API* → « Clé secrète » (de préférence une **clé restreinte** : Checkout, Customer Portal, Customers, Subscriptions, Invoices, Products, Prices en écriture) | Vercel |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (`pk_test_…`) | même page, « Clé publiable » | Vercel |
| `STRIPE_WEBHOOK_SECRET` (`whsec_…`) | *Développeurs* → *Webhooks* → « Ajouter un endpoint » : URL `https://<site>/api/stripe/webhook`, événements listés ci-dessous → « Clé de signature » | Vercel |
| Produits et prix (Premium, Visibilité, siège, packs) | **rien à copier** : lancer une fois `STRIPE_SECRET_KEY=sk_test_… pnpm stripe:produits` depuis le dépôt ; le site retrouve les prix par leur clé (`ph_premium_annuel`…). Relançable sans créer de doublon | — |
| **Stripe Tax** (pas une clé) | *Paramètres* → *Taxes* → activer, adresse de l'entreprise, enregistrement TVA France | — |
| **Customer Portal** (pas une clé) | *Paramètres* → *Facturation* → *Portail client* → activer (changement de carte, factures, résiliation en fin de période) | — |

Événements du webhook : `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`, `invoice.upcoming`, `charge.refunded`, `charge.dispute.created`.

## 3. Emails et SMS

| Nom | Où la trouver | Où la mettre |
|---|---|---|
| `RESEND_API_KEY` | resend.com → *API Keys* (après avoir vérifié le domaine `notifications.portailhabitat.fr` : SPF, DKIM, DMARC) | secret Functions |
| `RESEND_WEBHOOK_SECRET` | resend.com → *Webhooks* → endpoint `https://<site>/api/resend/webhook` → « Signing secret » | Vercel |
| `NOTIF_SIGNING_SECRET` | à inventer : 32 caractères aléatoires (ex. `openssl rand -base64 32`) | Vercel **et** secret Functions (même valeur) |
| `EMAIL_FROM`, `EMAIL_FROM_PRO`, `EMAIL_REPLY_TO` | adresses d'envoi (valeurs par défaut prévues) | secret Functions (facultatif) |
| `BREVO_API_KEY` | brevo.com → *SMTP & API* → *Clés API* (SMS : plus tard, D2) | secret Functions |

## 4. Plus tard (options coupées tant que la clé manque)

| Nom | Sert à | Où la trouver | Où la mettre |
|---|---|---|---|
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | notifications push de l'application pro | Console Firebase → ⚙️ → *Cloud Messaging* → *Certificats Web push* → « Générer » | Vercel, puis flag `notificationsPush` à vrai |
| SMS de la double authentification | code par SMS | Identity Platform → *Authentification multifacteur* → activer SMS (facturé) | flag `deuxFacteursSms` à vrai |
| `TYPESENSE_HOTE`, `TYPESENSE_CLE_RECHERCHE`, `TYPESENSE_ADMIN_KEY` | recherche de l'annuaire (D4) | cloud.typesense.org → cluster → *API Keys* | Vercel (+ secret Functions pour la clé admin) |
| `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` | suivi des erreurs | sentry.io → projet → *Client Keys (DSN)* ; *Auth Tokens* | Vercel (le jeton aussi dans GitHub → *Settings* → *Secrets* → *Actions*) |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | App Check (anti-robots) | Console Firebase → *App Check* → reCAPTCHA Enterprise | Vercel |
| `INSEE_API_KEY` | vérification SIREN renforcée | portail-api.insee.fr | Vercel |
| `ANTHROPIC_API_KEY` | assistant IA du back-office (lot 13c) | console.anthropic.com | secret Functions |
| `PARTENAIRE_API_KEYS` | import de demandes partenaires (lot 12b) | à générer par source | secret Functions |
| `COMPORTEMENT_SALT_SECRET` | anonymisation du suivi des visites (lot 13c) | à inventer (32 caractères aléatoires) | secret Functions |

## 5. Ne jamais faire
- Mettre une clé dans le code, dans un ticket ou dans une conversation.
- Utiliser les clés Stripe **live** avant le « go » de mise en production.
