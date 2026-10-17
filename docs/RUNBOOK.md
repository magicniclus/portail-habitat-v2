# Runbook — que faire quand quelque chose casse

À garder ouvert pendant les 48 premières heures après chaque mise en production. Chaque section : **symptôme → vérification → action**. Aucune action ne touche aux données personnelles en dehors de l'admin (accès journalisé).

## 0. Réflexes

1. Regarder **Sentry** (site et Functions) : l'identifiant d'incident affiché sur la page 500 est le même que dans Sentry.
2. Regarder la sonde `/api/health` (version déployée, réponse en moins de 2 s).
3. Si les utilisateurs sont touchés et que la cause n'est pas évidente en 15 minutes : **maintenance** (§1) ou **retour arrière** (§2), puis enquête au calme.

## 1. Mettre le site en maintenance

- Variable `MAINTENANCE=1` sur Vercel (production), puis redéploiement ; toutes les pages publiques répondent `/maintenance` en 503 (`Retry-After: 600`).
- L'admin, les API (webhooks Stripe, partenaires) et les fichiers statiques restent servis : les paiements et imports continuent d'arriver.
- Retirer la variable et redéployer pour rouvrir.

## 2. Revenir à la version précédente

- **Site** : Vercel → Deployments → déploiement précédent → « Instant Rollback » (30 s).
- **Functions** : `git checkout vX.Y.(Z-1)` puis `firebase deploy --only functions --project portail-habitat-prod`.
- **Règles et index** : `firebase deploy --only firestore:rules,firestore:indexes,storage` depuis le même tag. Une règle plus stricte se déploie **avant** le code qui en dépend ; au retour arrière, redéployer d'abord le code, puis les règles.
- **Fonctionnalité seule** : la couper par son feature flag (Admin › Référentiels › Feature flags), sans redéployer.
- **Données** : voir §8.

## 3. Stripe

| Symptôme | Vérifier | Action |
|---|---|---|
| Paiement fait mais plan non activé | Stripe → Webhooks → événements en échec ; `stripeEvents/{id}.ok == false` | Corriger la cause, puis « Renvoyer » l'événement depuis Stripe : le webhook est idempotent |
| Webhook en 400 « signature » | `STRIPE_WEBHOOK_SECRET` correspond à l'endpoint de **ce** environnement | Mettre le bon secret sur Vercel, redéployer, renvoyer les événements |
| Stripe indisponible | status.stripe.com | Rien à faire côté site : Checkout et le portail client sont hébergés par Stripe ; prévenir les artisans si la panne dure |

Ne jamais modifier `plan`, `optionVisibilite` ou `siegesMax` à la main : seul le webhook les écrit.

## 4. Emails (Resend) et SMS (Brevo)

| Symptôme | Vérifier | Action |
|---|---|---|
| Plus aucun email | collection `emails` : statut `echec`, message d'erreur ; tableau de bord Resend | Clé `RESEND_API_KEY` (Functions), domaine vérifié (DNS SPF/DKIM) |
| Rebonds > 2 % | Resend → Suppressions ; `suppressions/{hash}` | Vérifier la liste importée et la séquence en cause ; couper la séquence dans Admin › Conversion |
| SMS non reçus | journal Functions `envoyerEnvoi` ; crédit Brevo | Recharger le crédit ; l'expéditeur `PortailHab` doit être validé |

Les envois passent par une file (`envoyerEnvoi`) : une panne courte se rattrape seule grâce aux nouvelles tentatives.

## 5. Firestore, Auth, Functions

| Symptôme | Vérifier | Action |
|---|---|---|
| Pages publiques sans données | journaux Vercel « lecture … impossible » ; status.firebase.google.com | Les pages s'affichent sans chiffres (lecture bornée à 2,5 s) : attendre, ou maintenance si les formulaires échouent |
| Erreur « index requis » | message Sentry avec le lien de création de l'index | Ajouter l'index dans `firestore.indexes.json`, puis `firebase deploy --only firestore:indexes` |
| `APP_CHECK_INVALIDE` en série | clé reCAPTCHA (`NEXT_PUBLIC_RECAPTCHA_SITE_KEY`), domaine autorisé dans reCAPTCHA Enterprise | Corriger la clé ou le domaine ; en dernier recours, désactiver l'application stricte d'App Check dans la console Firebase (jamais `APP_CHECK_MODE=desactive` en production : refusé par le code) |
| Une tâche planifiée échoue | Cloud Scheduler → journaux de la fonction | Relancer à la main depuis Cloud Scheduler une fois la cause corrigée : les emails sont dédoublonnés (clé modèle + objet + destinataire), un second passage ne renvoie rien |

## 6. Demandes et matching

- **Demandes sans artisan après 1 h** (alerte à partir de 3 par jour) : Admin › Demandes, filtre « sans attribution » ; vérifier les quotas mensuels (remis à zéro le 1er à 0 h 05 par `compteursMois`) et les zones.
- **Webhook partenaire en échec** : Admin › Sources partenaires (journal des imports, motif du rejet) ; couper la source si elle envoie des données invalides en série.

## 7. Sécurité

- **Suspicion de fuite** : couper l'accès concerné (désactiver le membre dans Admin › Équipe, révoquer la clé partenaire), conserver les journaux (`auditLog`), notifier la CNIL sous 72 h si des données personnelles sont touchées, prévenir les personnes concernées.
- **Clé exposée** (Stripe, Resend, Anthropic…) : la révoquer chez le fournisseur, en créer une nouvelle, la poser dans les secrets Vercel ou Firebase, redéployer.
- **CSP qui bloque un script légitime** : l'erreur apparaît dans la console du navigateur (« Refused to load… ») ; ajouter la source dans `apps/web/lib/securite.ts` (avec son test), jamais `unsafe-eval` en production.

## 8. Sauvegardes et restauration

- Sauvegarde quotidienne gérée par Firestore (voir DEPLOIEMENT.md §4), conservée 14 semaines.
- **Restaurer** : `gcloud firestore databases restore --source-backup=… --destination-database=restauration` vers une **nouvelle** base, vérifier, puis recopier les seuls documents utiles (jamais d'écrasement global de la production).
- Avant chaque migration : export manuel (`gcloud firestore export gs://…`), puis `pnpm migrer <id> --dry-run`, puis `--executer`.
- Restauration testée une fois en staging avant le lancement, puis chaque trimestre.

## 9. Assistant IA

- Coupé sans `ANTHROPIC_API_KEY` ; budget mensuel bloquant à 100 % (Admin › IA › Réglages).
- Réponses refusées en série (« valeur absente du contexte ») : le contexte de nuit `iaContexte` est peut-être vide ; vérifier `iaContexteNuit` dans les journaux.
