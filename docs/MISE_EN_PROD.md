# Mise en production, pas à pas

> **État au 19/11/2026** : rien n'est déployé, ni en production ni en recette. Liste détaillée des comptes et clés : A_FOURNIR.md ; ordre technique : DEPLOIEMENT.md.

Pour le propriétaire du projet. Ce que Claude Code ne peut pas faire seul (créer des comptes, payer, signer, valider juridiquement) est marqué **👤 vous**. Le reste, Claude Code le fait ou le vérifie (prompt « Mise en production » dans PROMPT_CLAUDE_CODE.md).

---

## Étape 1 — Comptes à créer (avant le lot 1) · 👤 vous

| Service | Pour quoi | À récupérer | Coût de départ |
|---|---|---|---|
| **GitHub** | le code (dépôt `portail-habitat-v2`) | — | gratuit |
| **Firebase** (plan Blaze) | base, connexion, fichiers, fonctions | 3 projets : `portail-travaux-dev`, `-staging`, `-prod` ; config web + compte de service | quelques € / mois |
| **Vercel** | héberger le site | relier le dépôt GitHub | gratuit puis 20 $ / mois (Pro) |
| **Stripe** | paiements | clés test puis live ; SIRET, IBAN, pièce d'identité pour activer le live | % par transaction |
| **Resend** | emails | clé API ; domaine `notifications.portailtravaux.fr` vérifié (DNS) | gratuit jusqu'à 3 000 / mois |
| **Brevo** | SMS | clé API ; expéditeur `PortailTrav` validé | ~0,05 € / SMS |
| **Typesense Cloud** (région UE) | recherche | hôte, clé admin, clé recherche | ~7 $ / mois |
| ~~**INSEE (API Sirene)**~~ | vérif. SIRET | **plus nécessaire** : l'API publique Recherche d'entreprises (sans clé) est utilisée | gratuit |
| **Sentry** (région UE) | erreurs | DSN | gratuit au départ |
| **Anthropic** | assistant IA admin, IA du site et du blog, aide à la rédaction, Studio | clé API (site **et** Functions) | à l'usage (voir COUTS.md) |
| **Cloudflare** | Turnstile (formulaires des sites artisans) | clé de site et secret | gratuit |
| **OVHcloud** (ou Gandi en secours) | achat de domaine par l'artisan (D42) | clés API | prix des domaines |
| **Registrar du domaine** | `portailtravaux.fr` | accès DNS | ~10 € / an |

Donnez les clés à Claude Code **uniquement via les fichiers `.env.local` (dev) et les secrets Vercel / Firebase** — jamais dans le chat, jamais commitées.

## Étape 2 — Environnements
- **dev** : votre machine, émulateurs Firebase (projet `demo-portail-travaux`), emails capturés (Mailpit), Stripe test.
- **staging** : `staging.portailtravaux.fr`, Firebase `-staging`, Stripe test, emails limités à `@portailtravaux.fr`. Chaque PR fusionnée y part automatiquement.
- **prod** : `www.portailtravaux.fr`, Firebase `-prod`, Stripe live. Déploiement **uniquement** sur tag `v*` après votre « go ».

Liste complète des variables : DEPLOIEMENT.md §2, CLES.md et EMAILS.md §9 ; modèle local : `.env.example` (sans valeurs).

## Étape 3 — Avant le lancement · 👤 vous
- [ ] CGU, CGV Pro, mentions légales, politique de confidentialité et cookies relues par un juriste (textes dans `designs/Pages Legales.dc.html`)
- [ ] Contrat partenaire signé ; texte de consentement et sa version validés ; IMPORT_LEADS.md envoyé au partenaire, IP et clé échangées
- [ ] Compte Stripe live activé ; produits créés par `pnpm stripe:produits --live` après le « go » (formules Fiche Pro, Site Pro, Fiche + Site, Tout inclus, siège, option Blog, packs de crédits, pack IA : PAIEMENTS.md fait foi). *Ancienne liste abandonnée* : Visibilité et Premium (remplacés par les 4 formules)
- [ ] Domaine : DNS vers Vercel, SPF / DKIM / DMARC pour Resend
- [ ] Google Search Console + sitemap
- [ ] Au moins deux superadmins avec double authentification
- [ ] Grilles tarifaires des appels d'offres saisies dans l'admin
- [ ] Séquences d'emails de conversion relues (Admin Conversion)

## Étape 4 — Vérifications techniques · Claude Code
- [ ] Tous les tests d'ACCEPTANCE.md verts en staging
- [ ] Règles Firestore et Storage déployées en prod, tests de règles verts (dont `regles/dessin.test.ts`)
- [ ] Index Firestore et TTL déployés
- [ ] Référentiel réel importé : `pnpm referentiel:importer <id-du-projet>` (prestations, prix, recherche, communes ; sans compte de test ; rien n'est remplacé sans `--ecraser`). Sans lui, le simulateur répond « L'élément demandé est introuvable ».
- [ ] Sauvegarde quotidienne Firestore activée (export planifié vers un bucket `europe-west1`)
- [ ] Webhooks Stripe et Resend pointés sur la prod, secrets en place
- [ ] Budget Google Cloud avec alertes à 50 / 80 / 100 %
- [ ] Lighthouse mobile ≥ 90 sur accueil, simulateur, annuaire, landing pro
- [ ] En-têtes de sécurité (CSP, HSTS), App Check, reCAPTCHA
- [ ] Les Functions de `apps/functions/src/index.ts` déployées, tâches planifiées visibles dans Cloud Scheduler (liste : DEPLOIEMENT §5), file Cloud Tasks d'`envoyerEnvoi` créée
- [ ] Flags vérifiés dans l'admin (`config/flags`) ; **Plans (Dessin) reste éteint** (`dessin`, `dessinPublic`) sans « go » explicite : lot 15k en recette au 19/11/2026
- [ ] Parcours complet testé à la main en prod avec une vraie carte : inscription artisan → paiement d'une formule → réception d'une demande → remboursement

## Étape 5 — Jour du lancement
1. Tag `v1.0.0` → déploiement prod (votre « go »)
2. Test manuel du parcours complet (5 min)
3. Ouverture du webhook partenaire en volume réduit (quota 10 / jour)
4. Publication dans le groupe Facebook
5. Surveillance 48 h : Sentry, Stripe, file des demandes, emails rejetés

## Retour arrière
- Site : Vercel → « Instant Rollback » sur le déploiement précédent (30 s)
- Fonctions : redéployer le tag précédent (`firebase deploy --only functions` depuis ce tag)
- Fonctionnalité fautive : la couper par son feature flag dans l'admin (EXPLOITATION.md)
- Données : restauration depuis l'export de la veille (procédure testée une fois en staging avant le lancement)

## Après le lancement (mois 1 à 3)
Suivre chaque semaine : part des inscrits qui paient, résiliations Premium, coût des demandes partenaires achetées comparé au chiffre d'affaires des appels d'offres.
