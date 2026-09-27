# Mise en production, pas à pas

Pour le propriétaire du projet. Ce que Claude Code ne peut pas faire seul (créer des comptes, payer, signer, valider juridiquement) est marqué **👤 vous**. Le reste, Claude Code le fait ou le vérifie (prompt « Mise en production » dans PROMPT_CLAUDE_CODE.md).

---

## Étape 1 — Comptes à créer (avant le lot 1) · 👤 vous

| Service | Pour quoi | À récupérer | Coût de départ |
|---|---|---|---|
| **GitHub** | le code (dépôt `portail-habitat-v2`) | — | gratuit |
| **Firebase** (plan Blaze) | base, connexion, fichiers, fonctions | 3 projets : `portail-habitat-dev`, `-staging`, `-prod` ; config web + compte de service | quelques € / mois |
| **Vercel** | héberger le site | relier le dépôt GitHub | gratuit puis 20 $ / mois (Pro) |
| **Stripe** | paiements | clés test puis live ; SIRET, IBAN, pièce d'identité pour activer le live | % par transaction |
| **Resend** | emails | clé API ; domaine `notifications.portailhabitat.fr` vérifié (DNS) | gratuit jusqu'à 3 000 / mois |
| **Brevo** | SMS | clé API ; expéditeur `PortailHab` validé | ~0,05 € / SMS |
| **Typesense Cloud** (région UE) | recherche | hôte, clé admin, clé recherche | ~7 $ / mois |
| **INSEE (API Sirene)** | vérif. SIRET | clé API | gratuit |
| **Sentry** (région UE) | erreurs | DSN | gratuit au départ |
| **Anthropic** | assistant IA admin | clé API | à l'usage (voir COUTS.md) |
| **Registrar du domaine** | `portailhabitat.fr` | accès DNS | ~10 € / an |

Donnez les clés à Claude Code **uniquement via les fichiers `.env.local` (dev) et les secrets Vercel / Firebase** — jamais dans le chat, jamais commitées.

## Étape 2 — Environnements
- **dev** : votre machine, émulateurs Firebase, emails capturés (Mailpit), Stripe test.
- **staging** : `staging.portailhabitat.fr`, Firebase `-staging`, Stripe test, emails limités à `@portailhabitat.fr`. Chaque PR fusionnée y part automatiquement.
- **prod** : `www.portailhabitat.fr`, Firebase `-prod`, Stripe live. Déploiement **uniquement** sur tag `v*` après votre « go ».

Liste complète des variables : INTEGRATIONS.md §Variables et EMAILS.md §9. Claude Code crée `.env.example` au lot 1.

## Étape 3 — Avant le lancement · 👤 vous
- [ ] CGU, CGV Pro, mentions légales, politique de confidentialité et cookies relues par un juriste (textes dans `designs/Pages Legales.dc.html`)
- [ ] Contrat partenaire signé ; texte de consentement et sa version validés ; IMPORT_LEADS.md envoyé au partenaire, IP et clé échangées
- [ ] Compte Stripe live activé ; produits créés (Visibilité 79,90 €/an et 12,90 €/mois, Premium 958,80 €/an et 99,90 €/mois, packs) ; essai Premium 1 mois **avec carte demandée**
- [ ] Domaine : DNS vers Vercel, SPF / DKIM / DMARC pour Resend
- [ ] Google Search Console + sitemap
- [ ] Au moins deux superadmins avec double authentification
- [ ] Grilles tarifaires des appels d'offres saisies dans l'admin
- [ ] Séquences d'emails de conversion relues (Admin Conversion)

## Étape 4 — Vérifications techniques · Claude Code
- [ ] Tous les tests d'ACCEPTANCE.md verts en staging
- [ ] Règles Firestore et Storage déployées en prod, tests de règles verts
- [ ] Index Firestore et TTL déployés
- [ ] Sauvegarde quotidienne Firestore activée (export planifié vers un bucket `europe-west1`)
- [ ] Webhooks Stripe et Resend pointés sur la prod, secrets en place
- [ ] Budget Google Cloud avec alertes à 50 / 80 / 100 %
- [ ] Lighthouse mobile ≥ 90 sur accueil, simulateur, annuaire, landing pro
- [ ] En-têtes de sécurité (CSP, HSTS), App Check, reCAPTCHA
- [ ] Parcours complet testé à la main en prod avec une vraie carte : inscription artisan → paiement Premium → réception d'une demande → remboursement

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
