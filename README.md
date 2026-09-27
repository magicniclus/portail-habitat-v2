# Handoff : Portail Habitat (plateforme particuliers, artisans et diagnostic)

## Vue d'ensemble

Portail Habitat est une **plateforme de mise en relation** entre particuliers et professionnels du bâtiment, en Gironde pour commencer. Elle comprend trois espaces, chacun avec sa propre identité visuelle :

| Espace | Public | Couleur | Rôle |
|---|---|---|---|
| **Portail Habitat** (particuliers) | Particuliers | Vert `#0d7a5f` | Trouver un artisan, simuler un devis, déposer un projet, laisser un avis |
| **Portail Habitat Pro** (artisans) | Artisans | Orange `#e05a10` | Acquisition, onboarding, tableau de bord, demandes, appels d'offres, fiche, avis, statistiques, abonnements |
| **Portail Habitat Diag** | Vendeurs et bailleurs | Bleu `#14508a` | Landing SEO diagnostic immobilier, parcours d'estimation, sous-landings par commune |

Le modèle économique repose sur les artisans : **abonnement Premium** (79,90 € HT/mois payé à l'année ou 99,90 € HT/mois sans engagement), **option Visibilité** (79,90 € HT/an payé en une fois ou 12,90 € HT/mois sans engagement), et **déblocage payant des appels d'offres** à un prix fixé par l'admin (barème automatique ou prix manuel), payable par carte ou en crédits (Premium inclut des crédits mensuels, packs de crédits en vente). Le service est gratuit pour les particuliers.

## À propos des fichiers de design

Les fichiers `.dc.html` de `designs/` sont des **références de design en HTML** : des prototypes qui montrent l'apparence et le comportement attendus. **Ce n'est pas du code de production à copier.** Il faut **recréer ces écrans en Next.js** (App Router, TypeScript) avec des composants React propres, en reprenant fidèlement la mise en page, les couleurs, la typographie, les textes et la logique.

Chaque fichier se compose d'un template HTML à styles inline (entre `<x-dc>` et `</x-dc>`) et d'une classe JS `Component` avec `renderVals()`, qui contient **toute la logique métier** : calculs, règles, filtres et tri. Cette logique est du JavaScript pur. Il faut l'**extraire telle quelle dans des modules `lib/`** et la couvrir de tests unitaires.

## Fidélité

**Haute fidélité.** Couleurs, textes, espacements, tailles et interactions sont définitifs. À reproduire au pixel près avec Tailwind ou CSS Modules. Les emplacements `<image-slot>` sont des zones d'image à remplacer par des vraies photos ou des logos uploadés (`next/image`).

## Documents du dossier

| Fichier | Contenu |
|---|---|
| `README.md` | Ce document : écrans, routes, tokens, comportements |
| `ARCHITECTURE.md` | **Organisation du code** : monorepo, règles de dépendances, tokens partagés, composants réutilisables (inventaire), enveloppes d'actions, conventions, checklist |
| `DATABASE.md` | **Modèle Firestore complet** : collections, champs, index, règles de sécurité, Storage |
| `INTEGRATIONS.md` | Stripe (produits, webhooks), emails transactionnels, Cloud Functions, tâches planifiées, SEO, RGPD |
| `PLAN_DEV.md` | **Point d'entrée du développement** : carte de tous les documents, ordre des lots, maquettes → routes, liste de contrôle avant production |
| `ADMIN.md` | **Back-office** : rôles, permissions, écrans, Functions admin, prix des appels d'offres |
| `EMAILS.md` | **Emails, SMS, notifications** : architecture d'envoi, préférences, catalogue complet des modèles, parcours d'inscription, anti-abus, tests |
| `CONVERSION.md` | **Conversion et montée en gamme** : cycle de vie artisan, séquences d'emails, score et offre cible, remises, rétention, mesure |
| `COMPORTEMENT.md` | **Analyse comportementale** : traceur (curseur, arrêts, clics, clics morts, rage, défilement, sorties), chaîne BigQuery, algorithmes des cartes et de détection, tests A/B, RGPD |
| `IA_ADMIN.md` | **Assistant IA de l'admin** : périmètres, architecture (Function + API Claude + outils en lecture), contrat JSON, actions, garde-fous |
| `COUTS.md` | **Coûts** : estimation mensuelle et règles d'économie (agrégation navigateur, échantillonnage, TTL, IA Haiku + cache, alertes budget) |
| `MOBILE.md` | **Règles mobile** : mobile d'abord, points de rupture, cibles tactiles, formulaires (inputmode, autocomplete), navigation, motifs par écran, PWA et notifications, tests sur appareils |
| `STATS_DEMANDES.md` | **Nombre de demandes affiché aux artisans** : modèle (population, rayon, saison, part du métier), bascule vers le réel |
| `MISE_EN_PROD.md` | **Mise en production pas à pas** : comptes, clés, domaine, déploiement, lancement, retour arrière |
| `PROGRESSION.md` | **Suivi des lots** : ce qui est fait, ce qui reste, comment reprendre après une interruption |
| `IMPORT_LEADS.md` | **Contrat d'envoi des demandes partenaires** (à transmettre au partenaire) |
| `RECHERCHE.md` | **Recherche de projet** : intentions, synonymes, fautes, score, suggestions, Typesense, amélioration continue, tests de pertinence |
| `REPRISE_PARCOURS.md` | **Reprise d'un parcours interrompu** (simulateur, diagnostic, avis, onboarding) : local, compte, lien par email, écran « Reprendre / Recommencer », cas limites, critères |
| `COMPTES.md` | **Comptes et entreprises** : création des comptes, ajout et revendication d'entreprise, équipes multi-utilisateurs, invitations, sièges, simulation (simulateur, « voir en tant que », environnements de test) |
| `MATCHING.md` | **Algorithme de mise en relation** : filtres, score, équité Premium, écritures Firestore, appels d'offres, déblocage payant |
| `DECISIONS.md` | **Choix à trancher** (outils, domaine, légal, prix) avec une proposition par défaut ; 🔒 = bloquant avant la mise en ligne |
| `ACCEPTANCE.md` | **Critères d'acceptation** par écran (identifiants repris dans les tests Playwright) |
| `EXPLOITATION.md` | Budget de performance, migrations de données, supervision et alertes, feature flags, environnements |
| `data/` | Données extraites des maquettes en JSON (prestations, diagnostics, communes, démo) |
| `claude/` | Configuration Claude Code à copier en `.claude/` : réglages, commandes, sous-agents |
| `CLAUDE.md` | Règles du projet pour Claude Code, **à copier à la racine du dépôt** |
| `PROMPT_CLAUDE_CODE.md` | Les 13 prompts à coller dans l'ordre (un par session), plus les prompts de reprise, de correction et de relecture |
| `designs/` | Toutes les maquettes `.dc.html` |

---

## Stack cible

- **Next.js 15** (App Router, Server Components, Server Actions, Route Handlers), TypeScript strict
- **Firebase** : Auth (email/mot de passe, lien magique, téléphone pour les artisans), Firestore, Storage, Cloud Functions (v2), App Check
- **Stripe** : Billing (abonnements), Checkout, Customer Portal, Stripe Tax (TVA FR 20 %), codes promo
- **Emails** : Resend et React Email (ou Brevo). Modèles en React, envoi depuis les Cloud Functions ou les Route Handlers
- **Validation** : Zod, avec des schémas partagés entre client et serveur
- **Formulaires** : React Hook Form
- **Hébergement** : Vercel (front) et Firebase (backend), région `europe-west1` / `eur3` obligatoire (RGPD)
- **Analytics** : outil sans cookie ou soumis au consentement (voir la politique cookies)

---

## Routes

### Particuliers (vert)
| Route | Maquette | Rendu |
|---|---|---|
| `/` | `Accueil Particuliers.dc.html` | SSG + ISR |
| `/artisans` | `Annuaire Artisans.dc.html` | SSR (filtres en query string) |
| `/artisans/[slug]` | `Ma Fiche.dc.html` (vue publique) | ISR |
| `/simulateur` | `Simulateur de Devis.dc.html` | Client, étapes en state + `?etape=` |
| `/avis` | `Laisser un Avis.dc.html` | Client |
| `/mon-espace` | `Mon Espace Particulier.dc.html` (projets, devis, messages, avis, compte ; tweak `etatVide`) | Auth particulier |

### Diagnostic (bleu)
| Route | Maquette | Rendu |
|---|---|---|
| `/diagnostic-immobilier` | `Diagnostic Immobilier.dc.html` | SSG |
| `/diagnostic-immobilier/estimation` | `Parcours Diagnostic.dc.html` | Client, préremplissage via `?motif&type&periode&ville&adresse` |
| `/diagnostic-immobilier/[commune]` | `Diagnostic Immobilier Rive Droite.dc.html` | **SSG avec `generateStaticParams`**, une page par commune (11 communes) |

### Artisans (orange)
| Route | Maquette | Rendu |
|---|---|---|
| `/pro` | `Acquisition Artisans v2.dc.html` | SSG |
| `/pro/inscription/zone` | `Onboarding Etape 2.dc.html` | Client |
| `/pro/inscription/compte` | `Onboarding Etape 3.dc.html` | Client |
| `/pro/connexion` | `Connexion.dc.html` | Client |
| `/pro/tableau-de-bord` | `Espace Artisan Dashboard.dc.html` (+ variante `… on boarding`) | Auth artisan |
| `/pro/demandes` | `Mes Demandes.dc.html` | Auth artisan |
| `/pro/appels-d-offres` | `Appels d Offres.dc.html` | Auth artisan |
| `/pro/fiche` | `Ma Fiche.dc.html` (mode édition) | Auth artisan |
| `/pro/avis` | `Mes Avis.dc.html` | Auth artisan |
| `/pro/equipe` | `Equipe.dc.html` (membres, sièges, invitations, demandes d'accès, matrice des droits, sélecteur d'entreprise ; tweaks `siegesMax`, `roleApercu`) | Auth artisan |
| `/pro/invitation`, `/pro/rejoindre` | `Invitation.dc.html` (états : valide, autre email, expirée, demander à rejoindre) | Public |
| `/pro/compte` | `Mon Compte.dc.html` (profil, 2FA, appareils, notifications, données) | Auth artisan |
| `/pro/statistiques` | `Statistiques.dc.html` | Auth artisan, **Premium uniquement** |
| `/pro/abonnement/premium` | `Paiement Offre Premium.dc.html` | Redirection vers **Stripe Checkout** |
| `/pro/abonnement/visibilite` | `Paiement Option Visibilite.dc.html` | Redirection vers **Stripe Checkout** |

### Communes
| Route | Maquette |
|---|---|
| `/aide` | `Aide et Contact.dc.html` |
| `/legal/[public]/[doc]` | `Pages Legales.dc.html`. `public` ∈ `particuliers`, `pro`. `doc` ∈ `cgu`, `cgv`, `avis`, `charte`, `mentions`, `confidentialite`, `cookies`, `securite`, `securite-pro` |
| `/admin/*` | `Admin Portail Habitat.dc.html` + `ADMIN.md` |
| `not-found`, `error`, maintenance | `Pages Erreur.dc.html` (404, 500, maintenance × 3 chartes) |
| — | `Modeles Emails.dc.html` : maquette de tous les emails (voir EMAILS.md) |

> Les formulaires de paiement par carte des maquettes (`Paiement …`) ne servent que de **référence visuelle pour le récapitulatif**. En production, la saisie de carte passe **uniquement par Stripe Checkout** (ou Stripe Elements). Aucun numéro de carte ne transite par nos serveurs.

---

## Écrans et comportements clés

### Accueil particuliers (`/`)
- Bandeau supérieur vert foncé `#0a2a21` : « Devis gratuits et sans engagement · Artisans vérifiés près de chez vous »
- Nav collante : logo, puis **Métiers, Artisans, Avis**, puis « Mon espace » et le bouton « Simuler mon devis »
- Hero en 2 colonnes (1.05fr / 0.95fr), fond `--accent-100` `#eef7f3`. Formulaire projet, code postal et délai. Chips « Projets populaires » qui remplissent le champ. Photo 4:5 avec encart flottant « 3 devis comparables »
- Sections dans l'ordre : Métiers (grille auto-fit 210px + carte CTA simulateur), Comment ça marche (3 étapes), Simulateur (mock d'estimation), Artisans vérifiés (3 cartes), Avis (4,8/5 + 3 témoignages + CTA « Laisser un avis »), Inspirations, App mobile (fond foncé, mock téléphone), Villes, bandeau « Vous êtes artisan ? » en orange, FAQ, CTA final, footer
- Tweaks (props) : `nbDemandesMois`, `nbArtisans`, `nbVilles`, `bandeauArtisan`. En production, ces chiffres viennent du document `stats/public`

### Simulateur de devis (`/simulateur`), à extraire dans `lib/simulateur/`
- 5 étapes : Prestation → Projet → Options → Chantier → Estimation, puis confirmation
- **9 prestations** (peinture, salle de bain, cuisine, électricité, plomberie, carrelage, isolation, toiture, menuiseries). Chacune a ses champs et sa formule `calculer(p, v)` ; voir la constante `PRESTATIONS` et la fonction `calculer` dans la maquette
- Types de champs : `slider` (min/max/pas), `stepper` (+/−), `options` (choix unique), `chips` (choix multiple)
- Coefficient régional selon les 2 premiers chiffres du code postal (`coefRegion`) : IDF ×1,16, zones tendues ×1,09, métropoles ×1,03, autres ×0,96. Coefficient d'accès : étage ×1,06, difficile ×1,12
- Isolation : ligne d'aides estimées en négatif (orange), plafonnée à `min(max × 0,4 ; surface × 22)`
- TVA affichée : 5,5 % (isolation, toiture, menuiserie), sinon 10 %
- **Prix révélé à la fin** : aucun montant pendant le parcours ; l'estimation s'affiche après l'envoi des coordonnées (COMPTES.md §6.1)
- **Reprise** : au retour, encart « Reprendre à l'étape N / Recommencer » (voir REPRISE_PARCOURS.md)
- **Les grilles de prix doivent être stockées dans Firestore** (`referentiel/prestations/items`) et non codées en dur, pour être ajustables depuis l'admin
- À l'envoi : création d'un document `demandes` (voir DATABASE.md), email au client, notification aux artisans ciblés

### Parcours diagnostic (`/diagnostic-immobilier/estimation`), à extraire dans `lib/diagnostic/`
- 3 étapes puis confirmation : **Le bien** (adresse, commune, motif, type, période, surface) → **Existants** (gaz, électricité, assainissement, classe DPE, diagnostics déjà faits avec leur année) → **Dossier** (liste statuée + formulaire de contact)
- Moteur de règles `DIAGS[].req(ctx)` avec les statuts `à réaliser`, `à refaire`, `déjà valide`, `conseillé`
- Validités : DPE 10 ans mais invalide si antérieur à 2021 ; amiante illimité mais invalide si antérieur à 2013 ; termites 6 mois ; ERP 6 mois ; gaz et électricité 3 ans ; plomb 1 an ; assainissement 3 ans ; audit 5 ans
- Remise pack : si 4 diagnostics ou plus sont à réaliser, min ×0,88 et max ×0,92
- **Mettre à jour les règles juridiques au 1er janvier de chaque année.** Référentiel dans `referentiel/diagnostics`

### Sous-landings communes (`/diagnostic-immobilier/[commune]`)
- Données réelles : population légale Insee 2023, superficie, code Insee, code postal, prix au m² sourcés (Cenon, Lormont, Floirac). Voir la constante `VILLES` de la maquette. À migrer dans `communes/{slug}` ou dans un fichier JSON versionné
- Balises `<title>` et `<meta description>` uniques par commune, JSON-LD `FAQPage` et `LocalBusiness`, fil d'Ariane (JSON-LD `BreadcrumbList`), maillage vers les 10 autres communes

### Annuaire artisans (`/artisans`)
- Recherche plein texte sur nom, métiers, pitch et `tags`. En production : **Typesense Cloud** (DECISIONS D4), Firestore ne gérant pas le plein texte
- Filtres : métiers (multi), rayon 5–60 km (**géo-requête** avec `geohash` et geofire-common), note minimum, labels (tous requis), disponibilité (≤ 7 j, ≤ 15 j), budget. Chips des filtres actifs retirables, « Tout effacer »
- Tri : pertinence (`note×12 + avis×0,4 − km×0,6`), note, proximité, disponibilité, nombre d'avis
- **Premium toujours en tête** dans le bloc « Artisans à la une » : bordure or `#b8862b`, fond de bandeau `#fdf6e7`, logo 76 px, 3 boutons (profil, devis, téléphone). Cartes standard compactes avec logo 104 px et 2 boutons
- Sidebar collante : `max-height: calc(100vh - 36px)`, zone de filtres **scrollable en interne**, encart orange « Déposer mon projet » fixé sous la carte
- Mention obligatoire (art. L111-7 C. conso) : « Les profils Premium apparaissent en tête de liste, signalés comme tels… »
- Filtres synchronisés dans l'URL pour le partage et le SEO

### Laisser un avis (`/avis`)
- 3 étapes : recherche de l'artisan → formulaire → confirmation
- Note globale (5 étoiles avec survol et libellé), 4 critères détaillés facultatifs, chips « points positifs », commentaire (1 200 caractères max), 3 photos, nom affiché, email privé, type de travaux, mois de fin de chantier, case de certification obligatoire
- Publication bloquée tant qu'il n'y a pas de note. L'avis part en statut `en_attente` et passe en **modération sous 48 h**. Encart « Demander une médiation »

### Pages légales (`/legal/...`)
- Bascule Particuliers (vert) / Professionnels (orange), sommaire latéral à défilement interne, navigation précédent/suivant
- Particuliers : CGU, Politique d'avis, Mentions légales, Confidentialité, Cookies, Sécurité
- Professionnels : CGV, Charte de bonne conduite, Mentions légales, Confidentialité, Sécurité du compte, Cookies
- **Les champs entre crochets `[…]` sont à remplir** (société, SIREN, hébergeur, médiateur, emails). Faire valider par un avocat avant la mise en ligne

---

## Design tokens

### Typographie
- Famille unique : **Source Sans 3** (400, 600, 700). Accent éditorial : **Source Serif 4 italique 600**, utilisé uniquement pour le mot mis en avant dans les H1
- H1 : `clamp(32px, 4.5vw, 54px)`, interligne 1,05–1,08, `letter-spacing -0.018em`, graisse 700
- H2 : `clamp(26px, 3.2vw, 36px)`, interligne 1,12
- Corps : 15,5–18 px, interligne 25–29 px. Méta : 13–14,5 px
- Wordmark : MAJUSCULES, 15,5 px, 700, `letter-spacing 0.04em` (« DIAG » à `0.22em`)

### Couleurs, rampes par espace (100 → 900)
| Palier | Particuliers (vert) | Diagnostic (bleu) |
|---|---|---|
| 100 | `#eef7f3` | `#eef4fa` |
| 200 | `#d2ebe1` | `#d2e2f1` |
| 300 | `#a5d7c4` | `#a4c5e3` |
| 400 | `#5cbb9c` | `#5b96cc` |
| 500 | `#12997a` | `#1b64ad` |
| base | `#0d7a5f` | `#14508a` |
| 600 | `#0a6650` | `#10467a` |
| 700 | `#085340` | `#0d3a65` |
| 800 | `#06402f` | `#0a2e50` |
| 900 | `#0a2a21` | `#081f37` |

- Artisans / orange : `#e05a10`, clair `#fff2ea`, foncé `#a33f05`
- Premium or : `#b8862b`, fond `#fdf6e7`. Étoiles : `#e8a33d`
- Statuts diagnostic : ambre `#a9700a` / `#fdf4e3`, vert `#0d7a5f` / `#eef7f3`
- Neutres et ombres : issus du système **Broadsheet** (`_ds/.../styles.css`) : `--color-neutral-100…900`, `--color-divider`, `--shadow-sm/md/lg`

### Rayons et espacements
- Rayons : boutons et inputs 10 px, cartes 14 px, gros panneaux 16–18 px, chips 999 px
- Conteneurs : `max-width` 1180, 1220, 1280 ou 1320 px, padding horizontal `clamp(18px, 4vw, 44px)`
- Espacement entre sections : `clamp(44px, 5.5vw, 80px)`
- Cibles tactiles : 44 px minimum (40–36 px tolérés pour les chips secondaires)

### Logos (SVG inline, viewBox 40×40)
- **Particuliers et Pro** : toit en trait (`M5 19.5 20 7l15 12.5`, trait 3,2, accent), corps de maison (`M9 21.5V33h22V21.5`, couleur texte), porte `rect x17 y25 w6 h8`. Vert chez les particuliers, orange chez les pros
- **Diag** : même maison, avec une **loupe centrée** (cercle `cx20 cy25.6 r4.8` + manche `m23.5 29.1 2.6 2.6`) à la place de la porte, en bleu
- Version footer sur fond foncé : corps blanc, accent en palier 400

### États
- Survol des liens : texte en accent. Cartes cliquables : `translateY(-3/-4px)` + `shadow-md`, transition 0,16–0,18 s
- Focus : `outline 2px accent-300`, offset 1 px
- Désactivé : opacité 0,5
- Respecter `prefers-reduced-motion`

## Icônes
Icônes SVG en trait (1,7–2 px, bouts arrondis) dessinées en inline dans les maquettes. En production : **Phosphor Icons** (`@phosphor-icons/react`, poids `regular` ou `duotone`), en choisissant l'équivalent le plus proche.

## Visuels
Aucun visuel définitif : ce ne sont que des emplacements. À fournir : photo du hero particuliers (4:5), photos des 7 métiers (4:3), photos d'inspirations (4:3), hero diagnostic (4:5), logos des artisans (carrés, uploadés par eux).

## Fichiers de design (`designs/`)
Tous les `.dc.html` du projet, ainsi que `support.js` et `image-slot.js` pour les ouvrir dans un navigateur. Le dossier `_ds/` (système Broadsheet) doit être présent au même niveau pour que le rendu soit correct.
