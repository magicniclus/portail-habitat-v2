# Plan de développement complet — Portail Travaux

**Point d'entrée unique pour le développement.** Ce document liste tout ce qu'il faut construire, dans l'ordre, avec les documents à lire, les maquettes à reproduire et les critères de fin. Rien n'est hors de cette liste ; si un point manque, il est dans le document cité.

---

## 1. Le produit en 6 lignes
- Place de marché de l'habitat, lancée en Gironde, extensible.
- **Particuliers** : simulateur de devis (112 prestations), diagnostic immobilier, annuaire, avis.
- **Artisans** : Gratuit (avis, devis et factures inclus), **Fiche Pro 29 €**, **Site Pro 9,90 €**, **Fiche + Site 34,90 €**, **Tout inclus 49 €** (HT/mois, PAIEMENTS.md). Aucun prix avant l'inscription. Appels d'offres payants (3 artisans maximum) et crédits.
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
| `DOMAINES.md` | sous-domaines, achat et connexion de domaine, DNS, vérification, HTTPS, statuts | les domaines |
| `LANDINGS.md` | 3 landings d'acquisition par outil, source, onboarding adapté, analytics, points à valider | les landings |
| `BLOG.md` | blog des artisans : éditeur, mode autonome, pilote automatique, quotas, mots-clés, SEO, affichage sur le site, statistiques | le blog |
| `SITE_INTERNET.md` | sites des artisans : offres, création IA, éditeur, SEO, domaines, stats, formulaire | les sites artisans |
| `STATS_DEMANDES.md` | chiffres de demandes affichés aux artisans | la landing pro |
| `EXPLOITATION.md` | performance, migrations, supervision, feature flags | la production |
| `PROGRESSION.md` | état d'avancement, reprise après interruption | ce qui est fait |
| `MISE_EN_PROD.md` | comptes, clés, déploiement, lancement | le jour J |
| `ACCEPTANCE.md` | **critères de fin** (un test Playwright par identifiant) | la recette |
| `PROMPT_CLAUDE_CODE.md` | prompts prêts à coller, lot par lot | l'ordre |
| `data/*.json` | seed, catalogue des prestations, communes, intentions, diagnostics | les données de départ |
| `designs/*.dc.html` | maquettes de référence (logique extractible de `renderVals()`) | le visuel et le comportement |

## 3. Ordre des lots (détail et prompts : PROMPT_CLAUDE_CODE.md)

| Lot | Contenu | Docs | Critères |
|---|---|---|---|
| 0 | Cadrage, plan, questions | README, DECISIONS | — |
| 1 | Socle technique, design system, composants | ARCHITECTURE, MOBILE, EXPLOITATION §1 | — |
| 2 | Données et sécurité : **toutes les collections de DATABASE §16**, schémas Zod, règles, index, TTL | DATABASE, COMPTES §1 | tests de règles |
| 3 | Logique métier pure : simulateur, diagnostic, matching, prix, score de conversion | data/, MATCHING, CONVERSION §4 | tests unitaires |
| 4 | Comptes, entreprises, équipes, seed | COMPTES | CON-*, EQU-*, INV-* |
| 5 | Emails, SMS, notifications (tous les modèles, dont `offres_pro`) | EMAILS | MAIL-* |
| 6 | Pages publiques, SEO, bandeau cookies (dont « Mesure d'audience détaillée ») | README, INTEGRATIONS §6-7 | ACC-*, DIA-05 |
| 7 | Recherche | RECHERCHE | — |
| 8 | Parcours particuliers et espace particulier | COMPTES §2, REPRISE_PARCOURS | ESP-*, DIA-* |
| 9 | Annuaire et fiche publique | README | ANN-*, FIC-* |
| 10 | Espace artisan, équipes, **rayon 10-100 km** accepté à l'inscription | COMPTES §3-4 | ACQ-*, ONB-*, PRO-* |
| **10b** | **Site internet artisan** : création IA, éditeur par appareil, pages, SEO, sous-domaine + domaines (OVHcloud), stats sans cookie, formulaire → demandes ; Stripe `site_pro` 9,90 € | SITE_INTERNET, DATABASE §15 bis | SITE-* |
| **10c** | **IA du site** : Function `iaSite` (routeur, outils, opérations validées, garde-fou des faits), questionnaire de création, panneau IA, propositions Appliquer/Annuler, droits `sites.droits.ia` par webhook, quotas, aperçu gratuit → paiement Site Pro → reprise | IA_SITE, DATABASE §15 ter, SITE_INTERNET §4.6 | SITE-IA-* |
| **10d** | **Blog** : articles, éditeur, mots-clés, contrôle SEO bloquant, **mode autonome en un clic**, **pilote automatique**, mentions légales lues depuis Devis & factures, élément « Articles du blog » dans l'éditeur de site, quotas 5/15 | BLOG, DATABASE §15 quater, IA_SITE §4 bis | BLOG-* |
| **10e** | **Landings par outil** : gabarit unique, source enregistrée sur le compte, onboarding selon la source, scrollytelling, analytics | LANDINGS | LAND-* |
| 11 | **Paiements** : 4 formules (Fiche Pro 29 €, Site Pro 9,90 €, Fiche + Site 34,90 €, Tout inclus 49 €), `droits` par webhook, prorata, crédits et appels d'offres au prix admin, pack IA, page `/pro/abonnement`, migration Visibilité/Premium | **PAIEMENTS**, INTEGRATIONS §1 | PAY-* |
| **11b** | **Devis et factures** (gratuit) : devis, modèles, bibliothèque, **mentions obligatoires vérifiées (bloquent l'envoi)**, PDF serveur téléchargeable (logo, tampon, mentions), signature en ligne, conversion en facture, numérotation sans trou, paiements partiels, relances, pénalités, **export Factur-X** | DATABASE §8 bis-ter | DEV-* |
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
| Parcours Diagnostic, Diagnostic Immobilier, Diagnostic Immobilier Rive Droite | `/diagnostic`, `/diagnostic/[commune]` |
| Annuaire Artisans · Ma Fiche (publique) | `/artisans` · `/artisans/[slug]` |
| Laisser un Avis · Mon Espace Particulier | `/avis/[jeton]` · `/mon-espace` |
| Acquisition Artisans v2 | `/pro` (+ variante `?utm_source=facebook`) |
| Onboarding Etape 2 et 3 · Espace Artisan Dashboard (on boarding) | `/pro/inscription/*` · `/pro` connecté |
| Mes Demandes · Appels d Offres · Mes Avis · Statistiques · Ma Fiche (édition + assistant IA) · Equipe · Mon Compte · Invitation | `/pro/*` |
| Mon Abonnement | `/pro/abonnement?offre=fiche|site|pack|tout` |
| Devis et Factures | `/pro/devis` (`?onglet=factures|modeles|parametres`) |
| Connexion · Contact (public) · Pages Legales · Pages Erreur | `/connexion` · `/aide` (`?sujet=`) · `/legal/*` · 404 / 500 |
| Aide et Contact (espace artisan) | `/pro/aide` |
| Editeur de Blog | `/pro/site/blog/nouveau` · `/pro/site/blog/{id}` (`?auto=1` lance le mode autonome) |
| Site Internet Artisan | `/pro/site?onglet=` (`pages`·`blog`·`domaine`·`stats`·`formulaire`) · sites publiés : `{slug}.portailtravaux.fr` et domaines personnalisés (middleware) |
| Modeles Emails | `packages/emails` (React Email) |
| Admin Portail Travaux + 16 sections `Admin *` | `/admin#<section>` → `/admin/<section>` |

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
- [ ] Produits Stripe en production : Fiche Pro 29 €, Site Pro 9,90 €, Fiche + Site 34,90 €, Tout inclus 49 € (HT/mois), packs de crédits, pack IA ; abonnés Visibilité/Premium migrés
- [ ] Grilles tarifaires des appels d'offres et coefficients A/B/C saisis dans l'admin
- [ ] Au moins un superadmin avec MFA ; rôles de l'équipe créés
- [ ] Alertes budget Google Cloud (20 €) et IA (10 €) actives
- [ ] Test de charge des imports : 200 demandes/heure, import → proposition en moins de 5 min
- [ ] Sauvegardes Firestore quotidiennes et restauration testée
- [ ] Compte revendeur OVHcloud + clés API ; produit Stripe `site_pro` (9,90 € HT/mois) ; DNS wildcard `*.portailtravaux.fr` vers Vercel
- [ ] Tous les critères d'ACCEPTANCE.md passent en CI
