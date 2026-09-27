# Plan de développement complet — Portail Habitat

**Point d'entrée unique pour le développement.** Ce document liste tout ce qu'il faut construire, dans l'ordre, avec les documents à lire, les maquettes à reproduire et les critères de fin. Rien n'est hors de cette liste ; si un point manque, il est dans le document cité.

---

## 1. Le produit en 6 lignes
- Place de marché de l'habitat, lancée en Gironde, extensible.
- **Particuliers** : simulateur de devis (112 prestations), diagnostic immobilier, annuaire, avis.
- **Artisans** : Gratuit, **Visibilité** (79,90 € HT/an ou 12,90 €/mois) et **Premium** (79,90 € HT/mois payé à l'année ou 99,90 €/mois, 4 demandes exclusives garanties). Appels d'offres payants (3 artisans maximum) et crédits.
- **Demandes** : celles du site, plus environ **200 par jour importées d'un simulateur d'aides partenaire** (7 € l'unité, consentement prouvé). Transmises dans un rayon de 10 à 100 km.
- **Machine de vente** : séquences d'emails pilotées par le cycle de vie, demandes invendues offertes contre Visibilité, groupe Facebook de 7 000 artisans.
- **Pilotage** : admin complet, avec permissions fines, analyse du comportement des visiteurs, audit IA de la conversion et assistant de rédaction pour les artisans.

## 2. Carte des documents (tout est dans `docs/`)

| Document | Contenu | Fait foi pour |
|---|---|---|
| `CLAUDE.md` | règles de travail, stack, règles non négociables | tout |
| `README.md` | écrans, routes, design tokens, logos | l'interface |
| `DECISIONS.md` | décisions (✅ tranchées, ⏳ à valider) | les arbitrages |
| `ARCHITECTURE.md` | monorepo, découpage, composants, factorisation | le code |
| `DATABASE.md` | **toutes** les collections, champs, index, règles, Storage, durées de conservation, **§16 liste de contrôle** | les données |
| `COMPTES.md` | comptes, entreprises, équipes, rôles pros, claims | l'identité (prime sur DATABASE §2-3) |
| `IMPORT_LEADS.md` | format d'envoi des demandes partenaires (webhook, JSON, réponses) | le contrat avec le partenaire |
| `MATCHING.md` | algorithme de mise en relation, RGE, niveaux A/B/C, prix | l'attribution |
| `EMAILS.md` | `notifier()`, catégories, catalogue complet des modèles, anti-abus | tous les envois |
| `CONVERSION.md` | cycle de vie artisan, séquences, score, remises, demandes offertes, Facebook, Functions, traces | la vente |
| `COMPORTEMENT.md` | traceur, cartes de chaleur, replays, tests A/B, RGPD | l'analyse des pages |
| `IA_ADMIN.md` | audit IA de la conversion, assistant de rédaction des artisans | l'IA |
| `ADMIN.md` | rôles et permissions admin, écrans, Functions admin | le back-office |
| `INTEGRATIONS.md` | Stripe, Functions, auth, sécurité, SEO, RGPD, variables d'environnement | les intégrations |
| `COUTS.md` | budget et **règles d'économie à respecter dans le code** | l'infrastructure |
| `MOBILE.md` | mobile d'abord (390 px, cibles 44 px, champs 16 px) | chaque écran |
| `RECHERCHE.md` | recherche « Quel est votre projet ? » | la recherche |
| `REPRISE_PARCOURS.md` | brouillons et reprise des parcours | les parcours |
| `STATS_DEMANDES.md` | chiffres de demandes affichés aux artisans | la landing pro |
| `EXPLOITATION.md` | performance, migrations, supervision, feature flags | la production |
| `AVANCEMENT.md` | état d'avancement, incohérences tranchées, reprise après interruption | ce qui est fait |
| `MISE_EN_PROD.md` | comptes, clés, déploiement, lancement | le jour J |
| `ACCEPTANCE.md` | **critères de fin** (un test Playwright par identifiant) | la recette |
| `PROMPT_CLAUDE_CODE.md` | prompts prêts à coller, lot par lot | l'ordre |
| `data/*.json` | seed, catalogue des prestations, communes, intentions, diagnostics | les données de départ |
| `designs/*.dc.html` | maquettes de référence (logique extractible de `renderVals()`) | le visuel et le comportement |

## 3. Ordre des lots (détail et prompts : PROMPT_CLAUDE_CODE.md)

| Lot | Contenu | Docs | Critères |
|---|---|---|---|
| 0 | Cadrage, plan, questions | README, DECISIONS | — |
| 1a | Socle technique : monorepo, outillage, CI, émulateurs, `core/format`, enveloppes `action()`/`callable()`, Sentry | ARCHITECTURE, EXPLOITATION §1 | — |
| 1b | Design system : tokens 4 thèmes, primitives et patterns, Storybook, layouts, pages d'erreur, MOB-01 à 03 | ARCHITECTURE §4-5, MOBILE, README (tokens) | MOB-01 à 03 |
| 2 | Données et sécurité : **toutes les collections de DATABASE §16**, schémas Zod, règles, index, TTL | DATABASE, COMPTES §1 | tests de règles |
| 3 | Logique métier pure : simulateur, diagnostic, matching, prix, score de conversion | data/, MATCHING, CONVERSION §4 | tests unitaires |
| 4 | Comptes, entreprises, équipes, seed | COMPTES | CON-*, EQU-*, INV-* |
| 5 | Emails, SMS, notifications (tous les modèles, dont `offres_pro`) | EMAILS | MAIL-* |
| 6 | Pages publiques, SEO, bandeau cookies (dont « Mesure d'audience détaillée ») | README, INTEGRATIONS §6-7 | ACC-*, DIA-05 |
| 7 | Recherche | RECHERCHE | — |
| 8 | Parcours particuliers et espace particulier | COMPTES §2, REPRISE_PARCOURS | ESP-*, DIA-* |
| 9 | Annuaire et fiche publique | README | ANN-*, FIC-* |
| 10 | Espace artisan, équipes, **rayon 10-100 km** accepté à l'inscription | COMPTES §3-4 | ACQ-*, ONB-*, PRO-* |
| 11 | Stripe : Visibilité et Premium, codes promo, prorata | INTEGRATIONS §1 | PAY-* |
| 12 | Matching et appels d'offres | MATCHING, DATABASE §5 | — |
| **12b** | **Import des demandes partenaires** (simulateur d'aides) : webhook, consentement, qualification, RGE | IMPORT_LEADS, DATABASE §4 bis, MATCHING | IMP-* |
| 13 | Back-office : 16 sections, permissions, rôles personnalisés | ADMIN | ADM-* |
| 13b | Moteur de conversion, séquences éditables, demandes offertes, Facebook | CONVERSION | CONV-* |
| 13c | Comportement des visiteurs, audit IA, assistant de rédaction | COMPORTEMENT, IA_ADMIN, COUTS | CMP-*, IA-*, RED-* |
| 14 | Qualité, exploitation, mise en production | EXPLOITATION, INTEGRATIONS | ERR-*, liste §6 |

**Lancement minimal conseillé** : lots 0 à 12b, puis 13 (sections Tableau de bord, Artisans, Demandes, Appels d'offres, Finances, Équipe), puis 13b. Les lots 13c et le reste de l'admin viennent ensuite sans rien casser.

## 4. Maquettes → routes

| Maquette | Route |
|---|---|
| Accueil Particuliers | `/` |
| Simulateur de Devis | `/simulateur` (`?prestation=`) |
| Diagnostic Immobilier · Parcours Diagnostic · Diagnostic Immobilier Rive Droite | `/diagnostic-immobilier` · `/diagnostic-immobilier/estimation` · `/diagnostic-immobilier/[commune]` |
| Annuaire Artisans · Ma Fiche (publique) | `/artisans` · `/artisans/[slug]` |
| Laisser un Avis · Mon Espace Particulier | `/avis` (`?jeton=` facultatif, lien reçu par email) · `/mon-espace` |
| Acquisition Artisans v2 | `/pro` (+ variante `?utm_source=facebook`) |
| Onboarding Etape 2 et 3 · Espace Artisan Dashboard (on boarding) | `/pro/inscription/*` · `/pro` connecté |
| Mes Demandes · Appels d Offres · Mes Avis · Statistiques · Ma Fiche (édition + assistant IA) · Equipe · Mon Compte · Invitation | `/pro/*` |
| Paiement Option Visibilite · Paiement Offre Premium | `/pro/abonnement/premium` · `/pro/abonnement/visibilite` (`?facturation=&code=`) |
| Connexion · Contact (public) · Pages Legales · Pages Erreur | `/connexion` (tous publics ; `/pro/connexion` redirige vers `/connexion?espace=pro`) · `/aide` (`?sujet=`) · `/legal/*` · 404 / 500 |
| Aide et Contact (espace artisan) | `/pro/aide` |
| Modeles Emails | `packages/emails` (React Email) |
| Admin Portail Habitat + 16 sections `Admin *` | `/admin#<section>` → `/admin/<section>` |

## 5. Règles transverses (rappel, à respecter partout)
1. Montants en centimes, Zod partout, écritures sensibles via Functions avec `assertPermission` et `auditLog`.
2. **Mobile d'abord**, accessibilité AA, `prefers-reduced-motion`.
3. Vocabulaire : jamais « lead » dans l'interface (demande, mise en relation, appel d'offres).
4. Tout envoi passe par `notifier()` ; toute relance a son `encoreValable()`.
5. **Coûts** : agrégation côté navigateur, échantillonnage, TTL, lecture d'agrégats pré-calculés, Haiku par défaut (COUTS.md).
6. Données personnelles masquées dans l'admin par défaut ; consultation journalisée.
7. Une demande partenaire sans preuve de consentement n'entre **jamais** dans la base.

## 6. Liste de contrôle avant la mise en production
- [ ] CGV Pro validées par un juriste : §1 bis (rayon 10-100 km), §1 ter (nature des demandes), revente de demandes, remises
- [ ] Contrat et texte de consentement du site partenaire validés ; version du texte enregistrée dans `sourcesDemandes`
- [ ] Catégorie d'emails `offres_pro` (prospection B2B) validée ; lien de désinscription testé
- [ ] Bandeau cookies avec « Mesure d'audience détaillée », politique cookies et politique de confidentialité à jour (IA, replays, partenaires)
- [ ] Produits Stripe en production : Visibilité (79,90 €/an, 12,90 €/mois), Premium (958,80 €/an, 99,90 €/mois), sièges, packs
- [ ] Grilles tarifaires des appels d'offres et coefficients A/B/C saisis dans l'admin
- [ ] Au moins un superadmin avec MFA ; rôles de l'équipe créés
- [ ] Alertes budget Google Cloud (20 €) et IA (10 €) actives
- [ ] Test de charge des imports : 200 demandes/heure, import → proposition en moins de 5 min
- [ ] Sauvegardes Firestore quotidiennes et restauration testée
- [ ] Tous les critères d'ACCEPTANCE.md passent en CI
