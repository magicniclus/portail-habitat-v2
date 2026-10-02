# Prompts Claude Code, dans l'ordre

Ordre pensé pour que **chaque lot s'appuie sur des fondations déjà testées** : socle → données et sécurité → logique métier pure → identité → envois → écrans publics → recherche → parcours → annuaire → espace pro → paiement → matching → admin → mise en production. Ne sautez pas de lot : les suivants supposent les précédents terminés.

## Mise en place (une seule fois)
1. Créez un dépôt Git vide et copiez-y ce dossier sous le nom **`docs/`**.
2. Copiez **`docs/CLAUDE.md` à la racine** du dépôt, et **`docs/claude/` à la racine sous le nom `.claude/`** (réglages, commandes, sous-agents).
3. Relisez **`docs/DECISIONS.md`** et tranchez ce que vous pouvez (au minimum les 🔒 et D1 à D6).
4. Créez les comptes nécessaires : Firebase (projets `-dev`, `-staging`, `-prod`), Stripe (mode test), Resend, Typesense Cloud, clé API Sirene INSEE, Sentry, GitHub.
5. Ouvrez Claude Code dans le dépôt. **Un lot par session** : tapez `/nouveau-lot N` (la commande lit le prompt ci-dessous), validez le plan, laissez-le coder, puis `/fin-lot`. Relisez la PR, fusionnez, `/clear`.

> **Mode plan** (Maj+Tab) pour chaque début de lot : Claude propose, vous corrigez, puis il code.
> **Modèle le plus puissant** pour les lots 0, 2, 3, 4, 11, 12 et 13 (sécurité, argent, algorithmes). Un modèle plus rapide suffit pour les lots d'écrans (6, 8, 9, 10).
> Tous les 2 ou 3 lots : `/duplication`. Avant chaque fusion : `/relecture`.

> **Interruption (crédits, coupure, session fermée)** : rien n'est perdu si vous avez commité. Ouvrez une nouvelle session et collez le prompt « Reprise » en bas de ce fichier.
> **Après chaque lot** : Claude Code met à jour `docs/AVANCEMENT.md` et commite. C'est ce fichier qui permet de reprendre.

---

## Lot 0 — Cadrage
```
Lis CLAUDE.md, puis docs/PLAN_DEV.md en entier, docs/README.md, docs/DECISIONS.md et le sommaire (titres uniquement) de tous les autres fichiers de docs/.
Ne code rien. Produis docs/AVANCEMENT.md avec :
- la liste des lots 1 à 14 de docs/PROMPT_CLAUDE_CODE.md, chacun avec une case à cocher ;
- les incohérences ou zones floues entre les documents (liste numérotée, avec ta proposition) ;
- les lignes ⏳ de DECISIONS.md qui bloquent les premiers lots ;
- les variables d'environnement et comptes externes nécessaires (Firebase, Stripe, Resend, SMS, Typesense, INSEE, Sentry).
Puis attends mes réponses.
```

## Lot 1a — Socle technique
```
Lot 1a : socle. Lis CLAUDE.md, docs/ARCHITECTURE.md en entier, docs/EXPLOITATION.md §1 et §5, docs/DECISIONS.md §5.
Plan d'abord, puis :
- monorepo pnpm + Turborepo selon ARCHITECTURE.md §2 (apps/web, apps/functions, packages/core, ui, emails, firebase, config), Node 22 ;
- TypeScript strict, ESLint + eslint-plugin-boundaries (§3) + règles maison (pas de hex hors tokens, pas de collection() hors packages/firebase), Prettier, Knip, Vitest, Playwright (projets iPhone 13, iPhone SE, Pixel 7 et ordinateur) ;
- packages/core/format (euros en centimes, dates, téléphone, SIREN) testé ; enveloppes action() et callable() (§7) avec App Check, Zod, codes d'erreur centralisés ;
- apps/web : Next.js 16 minimal (page d'accueil provisoire), /api/health ;
- Firebase : émulateurs, apps/functions branché sur packages/core ; garde-fou qui fait échouer les tests hors émulateur ;
- Sentry (site + Functions) ; CI GitHub Actions (typecheck, lint, boundaries, knip, test, build).
Terminé quand pnpm dev démarre site + émulateurs et que typecheck, lint, knip et test passent en CI. Mets à jour AVANCEMENT.md.
```

## Lot 1b — Design system et composants
```
Lot 1b : composants. Lis CLAUDE.md, docs/ARCHITECTURE.md §4-5, docs/MOBILE.md en entier et docs/README.md (Design tokens, Logos). Ouvre docs/designs/_ds/ et docs/designs/Pages Erreur.dc.html.
Plan d'abord, puis :
- packages/ui/tokens : source unique des 4 thèmes (vert, orange, bleu, ardoise) → themes.css + thème Tailwind 4 (@theme) ;
- primitives et patterns de ARCHITECTURE §5.3 (Logo, Button, Chip, Field, Input, Select, RadioCard, Badge, StatusBadge, Card, Stepper, Modal, ConfirmDialog, EmptyState, Skeleton, Banner, Combobox, Toast) avec cva, Radix, forwardRef, asChild ;
- mobile d'abord (MOBILE.md) : points de rupture et --space-page, composants Sheet (feuille du bas), BottomNav, StickyActionBar, Field avec inputmode/autocomplete par type, Select natif avec optgroup ; Modal → Sheet sous 640 px ;
- Storybook avec sélecteur de thème ET de taille d'écran (320, 390, 768, 1280) ; chaque composant : story dans les 4 thèmes + test jest-axe + test de cible tactile ≥ 44 px ;
- apps/web : layouts des 4 segments avec data-theme, next/font ; pages not-found, error et maintenance d'après Pages Erreur.dc.html ;
- CI : build Storybook, Lighthouse CI mobile (budget EXPLOITATION §1), tests automatiques MOB-01 à 03.
Terminé quand Storybook affiche tous les composants dans les 4 thèmes et que la CI est verte. Mets à jour AVANCEMENT.md.
```

## Lot 2 — Modèle de données et sécurité
```
Lot 2 : données. Lis docs/DATABASE.md en entier (dont §12 Règles et « Pièges Firebase »), docs/COMPTES.md §1, docs/EXPLOITATION.md §2 et §4.
Plan d'abord (liste des schémas, collections, règles, index), puis :
- packages/core/schemas : un schéma Zod par collection et sous-collection, types déduits, schemaVersion sur chaque document ;
- inclure : roles[], ent, staff, imp (claims), membres, invitations, revendications, demandesAcces, etablissements, sirenIndex, brouillons (TTL 30 j), referentiel/prestations/items (public) ET referentiel/prestations/prix (serveur uniquement), referentiel/recherche (intentions, métiers, synonymes), config/flags ;
- firestore.rules complet selon DATABASE §12, storage.rules, firestore.indexes.json (dont collection group attributions avec artisanId), TTL ;
- packages/firebase : chemins, convertisseurs Zod, repositories (ARCHITECTURE §6) ;
- packages/core/equipe/permissions.ts (peut()) et packages/core/flags.ts ;
- tests des règles : pour chaque règle un cas autorisé ET refusé, profils anonyme, particulier, membres p/g/c/x, membre suspendu, autre artisan, chaque rôle staff, impersonation. Test dédié : lecture de referentiel/prestations/prix refusée au client.
Tests d'abord. Terminé quand tous les tests passent. Mets à jour AVANCEMENT.md.
```

## Lot 3 — Logique métier pure (sans écran)
```
Lot 3 : moteurs métier dans packages/core, sans React ni Firebase. Sources de vérité : les maquettes et docs/data/.
- simulateur : les 9 prestations détaillées de docs/designs/Simulateur de Devis.dc.html (calculer, coefRegion, accès, aides, TVA) + le moteur GÉNÉRIQUE du catalogue docs/data/prestations-catalogue.json (103 prestations : quantité × unitaire × coefficients + base + options + évacuation). Soit 112 prestations estimables, rangées en 15 familles ;
- diagnostic depuis Parcours Diagnostic.dc.html (règles de validité, remise pack) ;
- recherche : portage TypeScript de docs/designs/recherche-projets.js (normalisation, synonymes, correction, IDF, score, surlignage) avec docs/data/recherche-intentions.json (137 intentions, 60 métiers) ; fichier de pertinence ≥ 200 requêtes (RECHERCHE.md §6) ;
- parcours : fonctions pures de REPRISE_PARCOURS.md (validation et migration d'un brouillon, résumé, étape de reprise) ;
- stats/estimerDemandes selon docs/STATS_DEMANDES.md (maquette docs/designs/estimation-demandes.js) ;
- leads/prix (DATABASE §5), annuaire/tri, matching (MATCHING.md : filtres, score, équité) ;
- scripts/verifier-referentiel.ts : chaque intention pointe vers une prestation existante, chaque métier a une prestation par défaut, chaque prestation a une famille valide.
Pour chaque module : d'abord un fichier de cas __tests__/<module>.cases.json (≥ 30 cas, résultats calculés à partir des maquettes), puis le code. Les prix sont passés en argument, jamais codés dans la fonction.
Terminé quand la couverture de packages/core dépasse 95 % et que la pertinence de recherche atteint 95 % au 1er rang. Mets à jour AVANCEMENT.md.
```

## Lot 4 — Comptes, entreprises, équipes, jeu de données
```
Lot 4 : identité. Lis docs/COMPTES.md en entier (sauf §6.1 et 6.2).
Plan d'abord, puis :
- Auth : lien magique, mot de passe, Google, une identité par email, liaison des méthodes, session client + cookie de session serveur (DATABASE « Pièges » n° 3), 2FA ;
- Functions : rechercherEntreprise (Recherche d'entreprises + Sirene, cache), finaliserOnboarding (transaction + sirenIndex), revendications, invitations (jeton haché), demanderAcces, modifier/retirer/quitter, transfererPropriete, fermerEntreprise, supprimerMonCompte, syncClaims (idempotent) ;
- sièges (siegesMax lu, suspension au passage en gratuit) ;
- scripts/seed.ts conforme à COMPTES §6.4 + import de docs/data/*.json (prestations et catalogue avec prix séparés, recherche, communes, annuaire et demandes de démo) ;
- tests : tous les cas limites de COMPTES §10, sur émulateur.
Pas d'écran, sauf /dev/comptes minimale pour tester à la main. Mets à jour AVANCEMENT.md.
```

## Lot 5 — Emails, SMS et notifications
```
Lot 5 : envois. Lis docs/EMAILS.md en entier. Maquette : docs/designs/Modeles Emails.dc.html.
Plan d'abord, puis :
- apps/functions/src/notifications/notifier.ts : seule porte d'entrée, canaux, préférences, catégories, idempotence (emails/), liste de blocage (suppressions/) ;
- Cloud Tasks : envoi, nouvelles tentatives, envois différés avec encoreValable(), regroupement 15 min, heures calmes SMS ;
- packages/emails : les 14 blocs réutilisables (EMAILS §3), les 4 layouts, TOUS les modèles §4.1 à 4.3 + reprise-simulateur ; les autres en squelette (sujet + données exemple), complétés dans les lots concernés ;
- emails Auth personnalisés envoyés par notifier() ; webhook Resend ; désabonnement en un clic ; page /preferences ;
- Mailpit en local, EMAIL_CAPTURE, pnpm email:dev ; branchement dans les Functions du lot 4.
Tests : EMAILS §8, dont Playwright + Mailpit (inscription particulier, onboarding artisan avec relances, invitation, mot de passe oublié). Mets à jour AVANCEMENT.md.
```

## Lot 6 — Pages publiques et SEO
```
Lot 6 : pages statiques. Applique docs/MOBILE.md (§5 formulaires, §7 motifs de ces écrans). Reproduis fidèlement ces maquettes : Accueil Particuliers (sans la recherche, lot 7), Acquisition Artisans v2, Diagnostic Immobilier, Diagnostic Immobilier Rive Droite (une page par commune, generateStaticParams depuis docs/data/communes.json), Pages Legales, Aide et Contact.
Ouvre chaque maquette avant sa page. Chiffres lus depuis stats/public. Metadata, JSON-LD (FAQPage, LocalBusiness, BreadcrumbList), sitemap.xml, robots.txt, bandeau cookies CNIL.
Critères ACC-* et DIA-05 de ACCEPTANCE.md. Captures Playwright à 1440 et 390 px comparées aux maquettes (/maquette). Mets à jour AVANCEMENT.md.
```

## Lot 7 — Recherche de projet
```
Lot 7 : recherche. Lis docs/RECHERCHE.md en entier.
- collection Typesense « intentions » + synchronisation des synonymes et mots vides depuis referentiel/recherche (Function déclenchée à chaque modification) ;
- /api/recherche (Edge, cache 1 h, rate limit) avec repli sur packages/core/recherche (index compact chargé au premier focus) ;
- composant Combobox de l'accueil : suggestions avec surlignage, métier, badge « Estimation en ligne », correction, urgence, métiers, « Projets associés », clavier et ARIA ;
- routage à la validation : prestation → /simulateur?prestation=…&cp=… ; « diagnostic » → parcours diagnostic ; sinon demande libre avec métier ;
- événements recherche_* sans données personnelles.
Critères RCH-01 à RCH-08. Pertinence en CI (≥ 95 % au 1er rang). Mets à jour AVANCEMENT.md.
```

## Lot 8 — Parcours particuliers et espace particulier
```
Lot 8 : parcours. Applique docs/MOBILE.md (§5 formulaires, §7 motifs de ces écrans). Lis docs/COMPTES.md §2 et §6.1 (dont « Révélation du prix »), docs/REPRISE_PARCOURS.md en entier, et README (Simulateur, Parcours diagnostic, Laisser un avis, Mon espace).
Écrans : Simulateur de Devis (étape 1 : recherche + 15 familles + 112 prestations ; démarrage direct via ?prestation=), Parcours Diagnostic, Laisser un Avis, Mon Espace Particulier.
Règles clés :
- AUCUN prix pendant le parcours ; creerDemande / creerDossierDiag calculent côté serveur avec les prix privés et renvoient l'estimation, affichée ensuite sur l'écran de résultat ;
- reprise complète : useParcours + <RepriseParcours /> (local, compte, lien par email), encart « Reprendre / Recommencer » sans montant ;
- création de compte silencieuse, consentements, rate limit, App Check, emails via notifier().
Tests Playwright : SIM-01 à SIM-10 (dont 01b et 06a à 06j), DIA-01 à 06, AVI-*, ESP-*. Mets à jour AVANCEMENT.md.
```

## Lot 9 — Annuaire et fiche publique
```
Lot 9 : annuaire. Applique docs/MOBILE.md (§5 formulaires, §7 motifs de ces écrans). Lis README (Annuaire) et DATABASE (artisansPublic).
- trigger de projection artisans → artisansPublic (aucune donnée privée, test dédié) + indexation Typesense ;
- /artisans d'après Annuaire Artisans.dc.html : recherche (même moteur que le lot 7 : l'intention reconnue devient métier + tags), filtres dans l'URL, géo-requête, tri de packages/core/annuaire, bloc Premium, mention L111-7 ;
- /artisans/[slug] d'après Ma Fiche.dc.html en ISR + aperçu artisan (?apercu=1, noindex).
Critères ANN-* et FIC-*. Mets à jour AVANCEMENT.md.
```

## Lot 10 — Espace artisan et équipes
```
Lot 10 : espace pro. Lis COMPTES.md §3, §4 et §9, et MOBILE.md §6, §7 et §9.
Écrans d'après les maquettes : Connexion, Acquisition Artisans v2 (métiers par listes déroulantes groupées par famille + autres métiers + chantiers acceptés, COMPTES §3.1 bis ; bandeau métier via ?metier= ; nombre de demandes via /api/stats/demandes ; lien Espace pro ; deux canaux : demandes garanties Premium exclusives, appels d'offres à 3 réponses max), Onboarding Etape 2 (zone et rayon uniquement) et 3, Espace Artisan Dashboard (et variante onboarding), Mes Demandes, Ma Fiche (édition + documents), Mes Avis, Statistiques (Premium), Equipe, Invitation (4 états), Mon Compte, sélecteur d'entreprise dans la sidebar.
Toutes les actions passent par peut() et les Functions du lot 4. Chaque écran vérifié avec les 4 rôles du seed (Playwright), sur iPhone et ordinateur. PWA de l'espace pro : manifest, service worker (hors ligne), notifications push FCM (nouvelle demande, message, appel d'offres), invitation à installer (MOB-06).
Nav mobile en panneau latéral (DECISIONS D26d), barre fixe d'étape (D26e). Critères ACQ-*, ONB-* (dont 07), (dont 01b, 01c, 06b), CON-*, PRO-01 à 03 et 07, EQU-*, INV-*. Mets à jour AVANCEMENT.md.
```

## Lot 11 — Stripe
```
Lot 11 : paiements. Lis docs/INTEGRATIONS.md (Stripe) et COMPTES.md §4.3.
Produits et prix (Premium 79,90 annuel payé en une fois / 99,90 mensuel, Visibilité 79,90/an payé en une fois / 12,90 mensuel, sièges, packs de crédits) créés par un script idempotent en mode test, montants de DECISIONS.md §4.
Checkout, Customer Portal, webhooks idempotents (stripeEvents), miroirs abonnements/factures/paiements, écriture de plan, optionVisibilite, siegesMax ; emails de facturation (EMAILS §4.6).
Écrans Paiement Offre Premium et Paiement Option Visibilite : choix Annuel/Mensuel (prérempli par ?facturation=), récapitulatif, puis redirection Checkout. Critère ACQ-03.
Tests : chaque webhook rejoué deux fois ; Test Clocks (renouvellement, échec, résiliation) ; PAY-01 et 02. Mets à jour AVANCEMENT.md.
```

## Lot 12 — Matching et appels d'offres
```
Lot 12 : algorithme. Lis docs/MATCHING.md en entier et DATABASE §5.
Branche packages/core/matching sur Firestore (demandes garanties Premium : 1 seul artisan ; appels d'offres : 3 réponses max ; MATCHING.md) : trigger à la création d'une demande (idempotent), matching/{id}, attributions (avec artisanId), assignation (assigneA), relances, expiration, conversion en appel d'offres, prix via packages/core/leads, déblocage carte ou crédits en transaction, portefeuilles, plafonds par collaborateur, contestations, scores de nuit.
Écran Appels d Offres d'après la maquette. Feature flag appelsOffresPayants.
Tests : scénarios de MATCHING.md sur le seed, concurrence (10 artisans sur la dernière place : un seul réussit, aucun débit en trop), PRO-04 à 06. Mets à jour AVANCEMENT.md.
```

## Lot 12b — Import des demandes partenaires (simulateur d'aides)
```
Lot 12b : demandes partenaires. Lis docs/DATABASE.md §4 bis, docs/MATCHING.md (section « Demandes partenaires »), CGV Pro §1 bis et §1 ter (docs/designs/Pages Legales.dc.html), docs/COUTS.md.
Plan d'abord, puis :
- Function HTTPS importerDemandePartenaire : clé API + IP autorisées, Zod, idempotence (importsDemandes), preuve de consentement obligatoire (preuvesConsentement), doublons 30 j, qualification A/B/C, champs aides et rgeRequis, création de demandes/{id} source 'partenaire' ;
- matching : filtre RGE, coefficients de prix par niveau et éligibilité, réattribution des exclusives non vues après 2 h, rayon 10-100 km ;
- espace artisan : bloc « Aides estimées du client (indicatif) » et niveau de la demande dans Mes Demandes et les emails nouvelle-demande ;
- invendues : bascule vers la demande offerte à 24 h (CONVERSION §3 bis), archivage à 72 h ;
- admin : sources de demandes (clé, coût unitaire, mapping des prestations), journal des imports et rejets, indicateurs de rentabilité (coût d'achat, revenu par demande, invendues par métier et zone).
Tests : IMP-*, test de charge 200 demandes/heure, supervision « import → proposition < 5 min ». Mets à jour AVANCEMENT.md.
```

## Lot 13 — Back-office
```
Lot 13 : admin. Lis docs/ADMIN.md en entier. Maquette : docs/designs/Admin Portail Habitat.dc.html.
Écrans /admin/* (une section par maquette docs/designs/Admin *.dc.html, menu filtré par permissions, boutons désactivés avec l'infobulle « Permission requise »), rôles personnalisés et surcharges individuelles (ADMIN §1) : masquage des données personnelles, double confirmation, motif obligatoire, audit systématique, 2FA obligatoire, session courte.
Inclure : éditeur du référentiel des prestations (catalogue + prix, publication versionnée qui rejoue les cas de test du lot 3 et montre l'écart), éditeur de la recherche (intentions, mots-clés, synonymes, requêtes sans résultat, banc d'essai : RECHERCHE §5), feature flags (EXPLOITATION §4), tableau de délivrabilité des emails.
Toutes les Functions admin de ADMIN §3 et COMPTES §7 avec assertPermission.
Tests : pour chaque rôle admin, ce qu'il peut faire et ce qui lui est refusé ; impersonation en lecture seule impossible à contourner ; ADM-*. Mets à jour AVANCEMENT.md.
```

## Lot 13b — Moteur de conversion et séquences d'emails
```
Lot 13b : conversion. Lis docs/CONVERSION.md en entier, docs/EMAILS.md §2 et §4.7, docs/COUTS.md. Maquettes : docs/designs/Admin Conversion.dc.html et docs/designs/Modeles Emails.dc.html (groupes Conversion et Fidélisation).
Plan d'abord, puis :
- collections prospects, cycleEtat, cycleTraces, cycleStats, sequences (+versions), config/cycle ; règles et index de DATABASE.md ;
- Functions du §9 (déclencheurs, planifiées, moteur de séquences qui lit sequences/ en données), score §4, pression et priorités §5, codes promo Stripe personnels, groupe témoin ;
- les modèles d'emails de CONVERSION §3 dans packages/emails (catégorie offres_pro) ;
- admin /admin/conversion : vue d'ensemble, CRUD des séquences (création, modification versionnée, duplication, pause, suppression avec motif et devenir des entreprises), journal, fiche cycle, tâches, réglages.
Tests : CONVERSION §10, dont un parcours complet gratuit → offre J+14 → paiement avec code, et aucun email pour le groupe témoin. Critères CONV-*. Mets à jour AVANCEMENT.md.
```

## Lot 13c — Comportement des visiteurs et assistant IA
```
Lot 13c : analyse. Lis docs/COMPORTEMENT.md, docs/IA_ADMIN.md et docs/COUTS.md en entier. Maquettes : docs/designs/Admin Comportement.dc.html et docs/designs/Admin IA.dc.html.
Plan d'abord, puis :
- packages/tracker (< 6 Ko) : démarrage après consentement « Mesure d'audience détaillée », résumé agrégé dans le navigateur, un envoi par page vue ; ajoute data-ph et data-ph-section sur les CTA, prix et sections de toutes les pages publiques ;
- /api/t, comportementSessions (TTL), replays gzip dans Cloud Storage (cycle de vie 30 j), agrégation de nuit, cumuls 7/30/90 j, détection des alertes, tests A/B (hash de session) ;
- admin /admin/comportement : page réelle en fond (capture ou iframe), 6 calques, alertes, éléments, sections, replays ;
- assistant IA « Audit IA conversion » (objectif unique : la conversion) : iaContexte pré-calculé par périmètre, callable iaAnalyser({ mode 'rapide'|'audit', perimetres[], question?, approfondie? }), prompt système versionné de IA_ADMIN §4 (étapes de l'entonnoir, gain estimé, notes d'étape en mode audit), Haiku par défaut et Sonnet en analyse approfondie, prompt caching, validation Zod du JSON + vérification que chaque valeur citée existe dans le contexte, cache 24 h, quota et budget, actions (tâche, brouillon de test A/B, texte), questions de suivi (iaQuestion), audit complet planifié le lundi 7 h + email ia-synthese-hebdo ; accès depuis le menu (2e entrée), le bouton flottant et le bandeau du tableau de bord ;
- catégorie de cookies dans le bandeau et politique cookies mise à jour.
Tests : COMPORTEMENT §9, IA_ADMIN §7. Assistant de rédaction des artisans (IA_ADMIN §8) dans Ma Fiche : présentation et chantiers avec photos, callable iaRediger, quota, journal sans texte. Critères CMP-*, IA-* et RED-*. Vérifie les coûts avec le jeu de données de charge (30 000 pages vues simulées). Mets à jour AVANCEMENT.md.
```

## Lot 14 — Qualité, exploitation et mise en production
```
Lot 14 : finitions. Lis docs/EXPLOITATION.md en entier et INTEGRATIONS.md (sécurité, RGPD, tâches planifiées).
- tâches planifiées : purges RGPD, expiration des assurances, rapports hebdomadaires, popularité des intentions de recherche, sauvegardes ;
- export et suppression de compte ; en-têtes de sécurité (CSP, HSTS), App Check strict ;
- alertes et runbook (docs/RUNBOOK.md) ; migrations testées en --dry-run ;
- Playwright sur tous les parcours critiques, ALL-* de ACCEPTANCE.md, Lighthouse selon le budget ;
- docs/DEPLOIEMENT.md : staging et prod, variables, checklist de mise en ligne (dont les 🔒 de DECISIONS.md), retour arrière.
Ne déploie rien en production : prépare seulement. Mets à jour AVANCEMENT.md.
```

---

## Prompts utiles à tout moment

**Reprise après une interruption**
```
Reprise. Lis CLAUDE.md, docs/AVANCEMENT.md et `git log --oneline -20`, puis `git status`.
1. Dis-moi quel lot était en cours, ce qui est commité, et ce qui est modifié mais pas commité.
2. Lance les tests (pnpm test, pnpm test:rules, pnpm e2e --grep du lot) et dis-moi ce qui passe.
3. Propose un plan pour terminer le lot en cours, sans refaire ce qui est déjà fait.
Attends ma validation avant de coder.
```

**Mise en production**
```
Mise en production. Lis docs/MISE_EN_PROD.md en entier et docs/PLAN_DEV.md §6.
Vérifie chaque point que tu peux vérifier toi-même (tests, build, règles, index, variables présentes sans afficher leur valeur, en-têtes de sécurité, Lighthouse).
Donne-moi la liste de ce qui reste à faire à la main, dans l'ordre. Ne déploie rien en production sans mon « go » explicite.
```

**Audit mobile d'un écran**
```
Audite [route] selon docs/MOBILE.md sur les projets Playwright iPhone SE, iPhone 13 et Pixel 7 : défilement horizontal, cibles < 44 px, champs < 16 px, inputmode/autocomplete manquants, bouton principal masqué par le clavier, modale non convertie en feuille du bas, budget Lighthouse mobile. Liste les écarts avec captures, puis corrige-les en réutilisant les composants de packages/ui.
```


**Reprendre après une coupure** → `/reprise`
```
Lis CLAUDE.md et docs/AVANCEMENT.md. Dis-moi où on en est, ce qui reste dans le lot en cours, et propose la prochaine étape. N'écris rien avant ma validation.
```

**Corriger un bug** → `/bug …`
```
Bug : [description, étapes, résultat attendu]. Écris d'abord un test qui reproduit le bug, vérifie qu'il échoue, puis corrige. Ne touche à rien d'autre.
```

**Ajouter une prestation estimable**
```
Ajoute la prestation [nom] au catalogue : lis docs/data/prestations-catalogue.json pour le format, choisis sa famille, ses champs, ses prix (fourchettes réalistes TTC Gironde), rattache-la à au moins une intention et un métier dans referentiel/recherche, ajoute 5 cas de test de prix et 3 requêtes de pertinence. Lance scripts/verifier-referentiel.ts.
```

**Enrichir la recherche**
```
Voici des requêtes sans résultat ou mal classées : [liste]. Pour chacune, propose le mot-clé, le synonyme ou l'intention à ajouter, ajoute-les au fichier de pertinence, puis vérifie que le taux reste ≥ 95 %.
```

**Vérifier la fidélité à une maquette** → `/maquette <route> <fichier>`

**Chasse à la duplication** → `/duplication`

**Ajouter un composant** → `/nouveau-composant …`

**Relecture avant fusion** → `/relecture`
```
Relis la branche actuelle comme un relecteur exigeant : sécurité (règles, permissions, données personnelles, prix jamais exposés au client), argent (centimes, transactions, idempotence), respect de CLAUDE.md et de la checklist ARCHITECTURE.md §14. Liste les problèmes par gravité, sans corriger.
```
