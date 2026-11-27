# Plan de développement complet — Portail Travaux

**Point d'entrée unique pour le développement.** Ce document liste tout ce qu'il faut construire, dans l'ordre, avec les documents à lire, les maquettes à reproduire et les critères de fin. Rien n'est hors de cette liste ; si un point manque, il est dans le document cité.

**État au 19/11/2026** : lots 0 à 14 faits (14 = préparation seulement, rien déployé) ; 10b, 10c, 10d, 11 (refait le 14/10), 11b et Studio vidéo en grande partie faits, avec des restes ; lot 15 « Plans » : 15a à 15j faits, 15k recette en cours. **Aucune mise en production.** Statut à jour : `PROGRESSION.md` (résumé) et `AVANCEMENT.md` (détail).

---

## 1. Le produit en quelques lignes
- Place de marché de l'habitat, lancée en Gironde, extensible.
- **Particuliers** : simulateur de devis (112 prestations), diagnostic immobilier, annuaire, avis, **Plans** (dessiner son logement en 2D / 3D, gratuit, puis demander des devis avec le plan joint).
- **Artisans** : Gratuit (fiche, avis, devis et factures, statistiques, Plans), **Fiche Pro 29 €**, **Site Pro 9,90 €**, **Fiche + Site 34,90 €**, **Tout inclus 49 €** (HT/mois, PAIEMENTS.md), option Blog 9,90 €. Aucun prix avant l'inscription. Appels d'offres payants (3 artisans maximum) et crédits.
- **Demandes** : celles du site, plus environ **200 par jour importées d'un simulateur d'aides partenaire** (7 € l'unité, consentement prouvé). Transmises dans un rayon de 10 à 100 km.
- **Machine de vente** : landings par outil, séquences d'emails pilotées par le cycle de vie, demandes invendues offertes contre une formule payante (Fiche Pro, ex-Visibilité, D60), groupe Facebook de 7 000 artisans, Studio vidéo de l'admin pour les réseaux sociaux.
- **Pilotage** : admin complet, avec permissions fines, analyse du comportement des visiteurs, audit IA de la conversion et assistant de rédaction pour les artisans.

## 2. Carte des documents (tout est dans `docs/`)

| Document | Contenu | Fait foi pour |
|---|---|---|
| `CLAUDE.md` (racine du dépôt) | règles de travail, stack réelle, commandes, règles non négociables ; section « Règles locales » prioritaire | tout |
| `docs/CLAUDE.md` | copie de référence du handoff, alignée sur le CLAUDE.md racine | — |
| `README.md` | écrans, routes, design tokens, logos | l'interface |
| `DECISIONS.md` | décisions (✅ tranchées, ⏳ à valider, 🔒 bloquantes avant la mise en ligne) | les arbitrages |
| `ARCHITECTURE.md` | monorepo, découpage, composants, factorisation | le code |
| `DATABASE.md` | **toutes** les collections, champs, index, règles, Storage, durées de conservation, **§16 liste de contrôle** ; §8 bis-ter devis et factures ; §8 quater Plans | les données |
| `COMPTES.md` | comptes, entreprises, équipes, rôles pros, claims | l'identité (prime sur DATABASE §2-3) |
| `PAIEMENTS.md` | formules, prix, droits, fenêtre d'offre, paiements | l'argent (fait foi) |
| `IMPORT_LEADS.md` | format d'envoi des demandes partenaires (webhook, JSON, réponses) | le contrat avec le partenaire |
| `MATCHING.md` | algorithme de mise en relation, RGE, niveaux A/B/C, prix | l'attribution |
| `EMAILS.md` | `notifier()`, catégories, catalogue complet des modèles, anti-abus | tous les envois |
| `CONVERSION.md` | cycle de vie artisan, séquences, score, remises, demandes offertes, Facebook, Functions, traces | la vente |
| `COMPORTEMENT.md` | traceur, cartes de chaleur, replays, tests A/B, RGPD | l'analyse des pages |
| `IA_ADMIN.md` | audit IA de la conversion, assistant de rédaction des artisans | l'IA de l'admin |
| `IA_SITE.md` | IA du site artisan : opérations validées, garde-fou des faits, quotas | l'IA des sites |
| `ADMIN.md` | rôles et permissions admin, écrans, Functions admin | le back-office |
| `STUDIO.md` | Studio vidéo de l'admin : scripts, tournage, montage, robot de rendu, réseaux sociaux | le Studio |
| `DESSIN.md` | Plans (éditeur 2D / 3D) : spécification, critères DES-01 à DES-48, prompts des sous-lots 15a à 15k | les plans |
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
| `RUNBOOK.md` | incidents, maintenance, retour arrière, sauvegardes | l'exploitation |
| `DEPLOIEMENT.md` | environnements, variables, ordre de déploiement, liste de contrôle | le déploiement |
| `MISE_EN_PROD.md` | comptes, clés, déploiement, lancement | le jour J |
| `CLES.md` · `A_FOURNIR.md` | clés et comptes à créer · contenus et informations à fournir par le propriétaire | ce qui manque |
| `AVANCEMENT.md` | suivi détaillé : lots, choix signalés, restes, journal daté | ce qui est fait (détail) |
| `PROGRESSION.md` | résumé de l'avancement, lot en cours, décisions récentes | ce qui est fait (résumé) |
| `ACCEPTANCE.md` | **critères de fin** (un test Playwright par identifiant) | la recette |
| `PROMPT_CLAUDE_CODE.md` | prompts des lots 0 à 14 (historiques) et prompts utiles | l'ordre |
| `PROMPT_INTEGRATION.md` · `REPRISE_CLAUDE_CODE.md` | prompts du handoff du 13/10/2026 (déjà exécutés, gardés pour mémoire) | — |
| `data/*.json` | seed, catalogue des prestations, communes, intentions, diagnostics, licences des modèles 3D | les données de départ |
| `designs/*.dc.html` | maquettes de référence (logique extractible de `renderVals()`) | le visuel et le comportement |

## 3. Ordre des lots (détail et prompts : PROMPT_CLAUDE_CODE.md, DESSIN.md §10)

| Lot | Contenu | Docs | Critères | État (19/11/2026) |
|---|---|---|---|---|
| 0 | Cadrage, plan, questions | README, DECISIONS | — | ✅ |
| 1 (1a, 1b) | Socle technique, design system, composants | ARCHITECTURE, MOBILE, EXPLOITATION §1 | — | ✅ |
| 2 | Données et sécurité : **toutes les collections de DATABASE §16**, schémas Zod, règles, index, TTL | DATABASE, COMPTES §1 | tests de règles | ✅ |
| 3 | Logique métier pure : simulateur, diagnostic, matching, prix, score de conversion | data/, MATCHING, CONVERSION §4 | tests unitaires | ✅ |
| 4 | Comptes, entreprises, équipes, seed | COMPTES | CON-*, EQU-*, INV-* | ✅ |
| 5 | Emails, SMS, notifications (tous les modèles, dont `offres_pro`) | EMAILS | MAIL-* | ✅ |
| 6 | Pages publiques, SEO, bandeau cookies (dont « Mesure d'audience détaillée ») | README, INTEGRATIONS §6-7 | ACC-*, DIA-05 | ✅ |
| 7 | Recherche | RECHERCHE | RCH-* | ✅ |
| 8 | Parcours particuliers et espace particulier | COMPTES §2, REPRISE_PARCOURS | SIM-*, ESP-*, DIA-*, AVI-* | ✅ |
| 9 | Annuaire et fiche publique | README | ANN-*, FIC-* | ✅ |
| 10 | Espace artisan, équipes, **rayon 10-100 km** accepté à l'inscription | COMPTES §3-4 | ACQ-*, ONB-*, PRO-* | ✅ (inscription refaite les 16 et 17/11) |
| **10b** | **Site internet artisan** : création IA, éditeur par appareil, pages, SEO, sous-domaine + domaines (OVH avec un compte client ordinaire, Gandi en secours, D42), stats sans cookie, formulaire → demandes ; Stripe `site_pro` 9,90 € | SITE_INTERNET, DOMAINES, DATABASE §15 bis | SITE-*, DOM-* | 🟡 |
| **10c** | **IA du site** : routeur, outils, opérations validées, garde-fou des faits, questionnaire de création, panneau IA, propositions Appliquer/Annuler, droits par webhook, quotas, aperçu gratuit → paiement Site Pro → reprise | IA_SITE, DATABASE §15 ter, SITE_INTERNET §4.6 | SITE-IA-* | 🟡 (essai réel avec la clé IA) |
| **10d** | **Blog** : articles, éditeur, mots-clés, contrôle SEO bloquant, **mode autonome en un clic**, **pilote automatique**, mentions légales lues depuis Devis & factures, élément « Articles du blog » dans l'éditeur de site, quotas 5/15, option Blog | BLOG, DATABASE §15 quater, IA_SITE §4 bis | BLOG-* | 🟡 |
| **10e** | **Landings par outil** : gabarit unique, source enregistrée sur le compte, onboarding selon la source, scrollytelling, analytics | LANDINGS | LAND-* | ✅ |
| 11 | **Paiements** : 4 formules (Fiche Pro 29 €, Site Pro 9,90 €, Fiche + Site 34,90 €, Tout inclus 49 €), `droits` par webhook, prorata, crédits et appels d'offres au prix admin, pack IA, option Blog, page `/pro/abonnement`, migration Visibilité/Premium | **PAIEMENTS**, INTEGRATIONS §1 | PAY-* | 🟡 (refait le 14/10) |
| **11b** | **Devis et factures** (gratuit) : devis, modèles, bibliothèque, base clients, **mentions obligatoires vérifiées (bloquent l'envoi)**, PDF serveur téléchargeable (logo, cachet, mentions), signature en ligne, conversion en facture, numérotation sans trou, paiements partiels, relances, pénalités, **export Factur-X** | DATABASE §8 bis-ter | DEV-* | 🟡 (Factur-X : D62 ⏳) |
| 12 | Matching et appels d'offres | MATCHING, DATABASE §5 | PRO-04 à 06 | ✅ |
| **12b** | **Import des demandes partenaires** (simulateur d'aides) : webhook, consentement, qualification, RGE | IMPORT_LEADS, DATABASE §4 bis, MATCHING | IMP-* | ✅ |
| 13 | Back-office : sections, permissions, rôles personnalisés | ADMIN | ADM-* | ✅ |
| 13b | Moteur de conversion, séquences éditables, demandes offertes, Facebook | CONVERSION | CONV-* | ✅ |
| 13c | Comportement des visiteurs, audit IA, assistant de rédaction | COMPORTEMENT, IA_ADMIN, COUTS | CMP-*, IA-*, RED-* | ✅ |
| 14 | Qualité, exploitation, préparation de la mise en production | EXPLOITATION, INTEGRATIONS, RUNBOOK, DEPLOIEMENT | ERR-*, ALL-*, liste §6 | 🟡 (rien déployé) |
| Studio | **Studio vidéo** de l'admin (demande du propriétaire, 05/11/2026) : idées et scripts par Claude, tournage, montage multipistes, robot de rendu sur Cloud Run, publication programmée sur YouTube, Instagram, TikTok | STUDIO, DECISIONS §6 bis | tests `STUDIO-*` | 🟡 (robot et clés à mettre en place) |
| **15** | **Plans** (nom interne : Dessin) : éditeur 2D / 3D gratuit, sous-lots 15a à 15k (cœur, données, éditeur 2D, ouvertures et niveaux, équipement et finitions, 3D et visite, toiture et extérieur, exports et partage, page publique et essai, recette) | DESSIN, DATABASE §8 quater, DECISIONS §7 | DES-01 à DES-48 (DES-45 retiré) | 🟡 (15k recette) |

**Lancement minimal conseillé** : lots 0 à 12b, puis 13 (sections Tableau de bord, Artisans, Demandes, Appels d'offres, Finances, Équipe), puis 13b. Les lots 13c et le reste de l'admin viennent ensuite sans rien casser. Les nouveautés derrière un flag (Plans : `dessin`, `dessinPublic` ; preuves marketing : `preuvesMarketing` ; appels d'offres payants : `appelsOffresPayants`) restent éteintes tant que le propriétaire ne les ouvre pas.

## 4. Maquettes → routes

Routes réelles de `apps/web/app` au 19/11/2026 (groupes de routes entre parenthèses omis).

| Maquette | Route |
|---|---|
| Accueil Particuliers | `/` |
| Simulateur de Devis | `/simulateur` (`?prestation=`, `?etape=`) |
| Diagnostic Immobilier · Parcours Diagnostic · Diagnostic Immobilier Rive Droite | `/diagnostic-immobilier` · `/diagnostic-immobilier/estimation` · `/diagnostic-immobilier/[commune]` (D73) |
| Annuaire Artisans · Ma Fiche (publique) | `/artisans` · `/artisans/[slug]` |
| — (pages de référencement local, sans maquette) | `/metiers`, `/metiers/[metier]`, `/metiers/[metier]/[ville]`, `/travaux/[prestation]/[ville]` |
| Laisser un Avis · Mon Espace Particulier | `/avis` (`?jeton=`) · `/mon-espace`, `/mon-espace/demandes/[id]`, `/mon-espace/avis`, `/mon-espace/compte` |
| Dessin (particulier) | `/dessin` (page publique) · `/dessin/essai` (essai sans compte) · `/mon-espace/plans` (Mes plans) · `/mes-plans/[planId]` (éditeur plein écran) |
| Dessin (partage) | `/plan/[jeton]` (lecture seule, sans compte, non indexé) |
| — (landing SEO Plans, sans maquette, gabarit `features/planMaison`) | `/plan-maison-gratuit` (landing, page canonique de `/dessin`) · `/plan-maison-gratuit/[sujet]` : 17 guides en 4 familles — formes (`plain-pied`, `etage`, `maison-en-l`, `maison-en-u`, `maison-toit-plat`, `plan-3d`), pièces (`appartement`, `cuisine`, `salle-de-bain`, `combles`), extérieur (`jardin-terrasse`, `garage`, `plan-de-masse`), projets (`extension`, `renovation`, `facades-coupes`, `a-imprimer`) ; ouverts avec `dessinPublic` |
| Acquisition Artisans v2 | `/pro` (+ variante `?utm_source=facebook`, `?metier=`) |
| Landing Outil (Landing Trouver des chantiers, Site internet artisan, Logiciel devis factures) | `/pro/trouver-des-chantiers` · `/pro/site-internet-artisan` · `/pro/logiciel-devis-factures` |
| Onboarding Etape 2 et 3 | `/pro/inscription/zone` · `/pro/inscription/compte` |
| Espace Artisan Dashboard (et variante on boarding) | `/pro/tableau-de-bord` |
| Mes Demandes · Appels d Offres · Mes Avis · Statistiques · Ma Fiche (édition + assistant IA) · Equipe · Mon Compte | `/pro/demandes` · `/pro/appels-d-offres` · `/pro/avis` · `/pro/statistiques` · `/pro/fiche` · `/pro/equipe` · `/pro/compte` |
| Invitation | `/pro/invitation` · `/pro/rejoindre` |
| Dessin (artisan) | `/pro/plans` (liste) · `/pro/plans/editeur/[planId]` (éditeur plein écran) · `/pro/demandes/[demandeId]/plan` (plan joint par le client, page authentifiée) |
| Mon Abonnement · Fenetre Offre | `/pro/abonnement?offre=` `fiche`, `site`, `pack`, `tout` (et `blog` pour l'option Blog) · `/pro/abonnement/[produit]`, `/pro/abonnement/confirme`, `/pro/abonnement/resilier` ; `/pro/facturation` redirige |
| Devis et Factures | `/pro/devis` (`?onglet=`) · `/pro/devis/nouveau` · `/pro/devis/[id]` · `/pro/devis/[id]/modifier` · `/pro/devis/factures/nouvelle` · `/pro/devis/factures/[id]` (`/modifier`) · `/pro/devis/parametres` ; côté client : `/devis-client/[lien]` (signature en ligne) |
| Connexion · Contact (public) · Pages Legales · Pages Erreur | `/connexion` (`/pro/connexion` renvoie vers la connexion unique, D73) · `/aide` (`?sujet=`) · `/legal/[public]/[doc]` · 404 / 500 / `/maintenance` |
| Aide et Contact (espace artisan) | `/pro/aide` |
| Site Internet Artisan | `/pro/site` (`?onglet=` `pages`·`blog`·`domaine`·`stats`·`formulaire`) |
| Editeur de Site | `/pro/site/editeur` (`?creation=1`, `?ia=reprendre`) |
| Editeur de Blog | `/pro/site/blog/nouveau` · `/pro/site/blog/[id]` ; validation du pilote automatique : `/pro/blog-valider/[lien]` |
| — (sites publiés des artisans) | `{slug}.portailtravaux.fr` et domaines personnalisés, réécrits par `proxy.ts` vers `/s/[hote]/…` |
| Modeles Emails | `packages/emails` (React Email) |
| Admin Portail Travaux + sections `Admin *` | `/admin` et `/admin/<section>` (dont `/admin/appels-d-offres`, `/admin/conversion`, `/admin/comportement`, `/admin/ia`, `/admin/rgpd`…), `/admin/securite` |
| — (Studio vidéo, sans maquette : STUDIO.md) | `/admin/studio` (onglets idées, tournage, calendrier, réseaux, résultats) · `/admin/studio/[id]` (`/idees`, `/captures`, `/tournage`, `/montage`, `/publication`) |
| — (autres pages techniques) | `/preferences` (emails), `/confirmer-telephone`, `/connexion/lien`, `/pro/hors-ligne` (PWA), `/pro/manifest.webmanifest`, `/pro/sw.js` |

## 5. Règles transverses (rappel, à respecter partout)
1. Montants en centimes, Zod partout (`@ph/core/zod`), écritures sensibles côté serveur avec `peut()` / `assertPermission` et `auditLog`.
2. **Mobile d'abord**, accessibilité AA, `prefers-reduced-motion`.
3. Vocabulaire : jamais « lead » dans l'interface (demande, mise en relation, appel d'offres).
4. Tout envoi passe par `notifier()` ; toute relance a son `encoreValable()`.
5. **Coûts** : agrégation côté navigateur, échantillonnage, TTL, lecture d'agrégats pré-calculés, Haiku par défaut (COUTS.md).
6. Données personnelles masquées dans l'admin par défaut ; consultation journalisée.
7. Une demande partenaire sans preuve de consentement n'entre **jamais** dans la base.
8. Aucun avis fictif ni chiffre non sourcé en production (D72, D82) ; fonction payante cliquée → fenêtre d'offre (PAY-10).

## 6. Liste de contrôle avant la mise en production
- [ ] « Go » explicite du propriétaire ; 🔒 de DECISIONS tranchés : D13 (domaine), D18 (raison sociale, SIREN), D20 (médiateur), D22 (relecture juridique)
- [ ] CGV Pro validées par un juriste : §1 bis (rayon 10-100 km), §1 ter (nature des demandes), revente de demandes, remises
- [ ] Contrat et texte de consentement du site partenaire validés ; version du texte enregistrée dans `sourcesDemandes`
- [ ] Catégorie d'emails `offres_pro` (prospection B2B) validée (D32d ⏳) ; lien de désinscription testé
- [ ] Bandeau cookies avec « Mesure d'audience détaillée », politique cookies et politique de confidentialité à jour (IA, replays, partenaires, plans)
- [ ] Produits Stripe en production : Fiche Pro 29 €, Site Pro 9,90 €, Fiche + Site 34,90 €, Tout inclus 49 € (HT/mois), option Blog 9,90 €, packs de crédits, pack IA (`pnpm stripe:produits`) ; abonnés Visibilité/Premium migrés (migration `001-formules-droits`, préavis 30 jours, D60)
- [ ] Migration `002-siren-reconnu` : essai d'abord, production avec le « go » du propriétaire
- [ ] Référentiel importé sur le projet réel (`pnpm referentiel:importer <projet>`) ; grilles tarifaires des appels d'offres et coefficients A/B/C saisis dans l'admin
- [ ] Au moins un superadmin avec MFA (`pnpm admin:creer`, `pnpm admin:totp`) ; rôles de l'équipe créés
- [ ] Alertes budget Google Cloud (20 €) et IA (10 €) actives
- [ ] Test de charge des imports : 200 demandes/heure, import → proposition en moins de 5 min
- [ ] Sauvegardes Firestore quotidiennes et restauration testée (DEPLOIEMENT §4)
- [ ] Clés API OVH (compte client ordinaire, moyen de paiement enregistré) ou jeton Gandi en secours ; produit Stripe `site_pro` (9,90 € HT/mois) ; DNS wildcard `*.portailtravaux.fr` ; hébergement des sites tranché (D45 : Cloudflare prévu, Vercel en place)
- [ ] Secrets fournis (CLES.md) : `ANTHROPIC_API_KEY`, `IBAN_CLE_CHIFFREMENT`, `VERCEL_API_TOKEN`, Turnstile, DataForSEO (D68), clés du Studio (YouTube, Meta, TikTok, ElevenLabs, `STUDIO_RENDU_CLE`, `STUDIO_CHIFFREMENT_CLE`)
- [ ] Studio : robot de rendu déployé sur Cloud Run par le propriétaire (`scripts/deployerStudio.sh`)
- [ ] Plans : services IGN (adresses, cadastre, photo aérienne) vérifiés en préproduction ; `/dessin` et `/plan-maison-gratuit` (+ guides) passés en `revalidate = 3600` à l'ouverture ; flags `dessin` et `dessinPublic` ouverts seulement sur décision
- [ ] Pages de secteur (SEO local) : `firebase deploy --only firestore:indexes,functions:suivrePagesSecteur,functions:textePageSecteur,functions:pagesSecteurNuit` ; secret `ANTHROPIC_API_KEY` lié aux Functions ; `pnpm pages-secteur:rattraper` lancé une fois ; premiers textes IA relus dans Admin › Référentiels
- [ ] Landing SEO Plans : mots-clés des 18 pages confirmés avec un outil (volume, difficulté < 10) ; pages soumises à la Search Console ; textes réajustés selon les requêtes réelles
- [ ] Factur-X et plateforme agréée (D62 ⏳) avant l'échéance légale de la facturation électronique
- [ ] Tous les critères d'ACCEPTANCE.md passent en CI (identifiants encore sans test Playwright : voir ACCEPTANCE.md, « Couverture des tests »)
