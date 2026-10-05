# Avancement — Portail Habitat

Produit au lot 0 (cadrage, 27/09/2026). Mis à jour à la fin de chaque lot, puis commité.
Légende : ⬜ à faire · 🟡 en cours · ✅ terminé (critères d'ACCEPTANCE verts) · ⏸ bloqué (raison dans Notes)

## 1. Lots

Seul fichier de suivi (PROGRESSION.md y a été fusionné, D43). En cas d'interruption, c'est ici qu'on regarde où on en est (prompt « Reprise » de PROMPT_CLAUDE_CODE.md).

| Lot | Contenu | Statut | Terminé le | Tests | Notes |
|---|---|---|---|---|---|
| 0 | Cadrage | ✅ | 27/09/2026 | — | incohérences tranchées, documents corrigés (§2) |
| 1a | Socle technique : monorepo, outillage, CI, émulateurs | ✅ | 27/09/2026 | format, lint, types, Knip, 102 tests (dont règles sur émulateur), build, e2e | CI GitHub à confirmer au premier passage (§6) |
| 1b | Design system, composants, Storybook | ✅ | 27/09/2026 | 34 tests composants, catalogue 29 stories, e2e 44 (dont ERR-01/02, MOB-01 à 03), Lighthouse | D45 et D46 à valider (§7) |
| 2 | Données et sécurité | ✅ | 27/09/2026 | 172 tests core, 1 890 cas de règles Firestore, 272 cas Storage, 11 tests serveur (émulateur) | écarts de sécurité à relire (§8) |
| 3 | Logique métier pure | ✅ | 27/09/2026 | 3 324 tests core, couverture 100 % des lignes (99,8 % des instructions), pertinence 96,4 % au 1er rang | D47 et D48 à valider (§9) |
| 4 | Comptes, équipes, seed | ✅ | 27/09/2026 | 58 tests sur émulateur (COMPTES §10), 3 480 tests core, CI verte | notificateur provisoire jusqu'au lot 5 (§10) |
| 5 | Emails, SMS, notifications | ✅ | 28/09/2026 | 17 tests core, 156 tests emails, 18 tests Functions, 20 tests site, 20 tests sur émulateur | parcours Playwright + Mailpit reportés aux lots 8 et 10 (§11) |
| 6 | Pages publiques, SEO, cookies | ✅ | 28/09/2026 | ACC-01 à 04, DIA-05 (+ DIA-01 côté landing), 132 e2e (4 appareils), 57 tests site, 3 543 tests core, 2 tests sur émulateur | D49 à valider ; textes légaux et visuels à fournir (§12) |
| 7 | Recherche | ✅ | 28/09/2026 | RCH-01 à 08 (168 e2e sur 4 appareils), pertinence 96,4 % au 1er rang, tests API, Functions et émulateur | Typesense inactif tant que D4 n'est pas tranché et que les clés ne sont pas fournies (§13) |
| 8 | Parcours particuliers | ✅ | 28/09/2026 | SIM-01 à 10 (dont 01b, 06a à j), DIA-01 à 04 et 06, AVI-01 à 04, ESP-01 à 04 ; e2e sur 4 appareils, tests émulateur | Points à signaler : §14 |
| 9 | Annuaire, fiche publique | ✅ | 28/09/2026 | ANN-01 à 06, FIC-01 à 03 ; e2e sur 4 appareils, tests émulateur | Points à signaler : §15 |
| 10 | Espace artisan, équipes, PWA | ✅ | 29/09/2026 | CON-01 à 03, ACQ-01/02, ONB-01 à 04, 06, 06b, 07, PRO-01 à 03, PRO-07, EQU-01 à 04, INV-01 à 03, MOB-06 (installation ; push à vérifier en recette) ; 80 e2e espace pro sur émulateurs, service worker testé en unitaire | Points à signaler : §16 |
| 11 | Stripe | ✅ | 30/09/2026 | ACQ-03, PAY-01, PAY-02 (e2e sur émulateurs avec événements signés), webhook rejoué deux fois, Checkout, portail, catalogue et facturation testés sur émulateur avec un faux Stripe | Clés de test à fournir (docs/CLES.md) ; points à signaler : §17 |
| 12 | Matching, appels d'offres | ✅ | 02/10/2026 | PRO-04 à 06 (e2e sur émulateurs, mobile et ordinateur), course de 10 artisans sur la dernière place (émulateur), attribution, relances, déblocage, paiement par carte, scores de nuit sur émulateur ; 3 717 tests core (couverture des branches ≥ 95 %) | D50 (60 min d'avance Premium) ; points à signaler : §18 |
| 12b | Demandes partenaires | ✅ | 02/10/2026 | IMP-01 à 06 (émulateur + e2e IMP-06 sur 2 appareils), test de charge 200 demandes (chacune proposée en quelques secondes), 3 723 tests core | écrans admin au lot 13 ; points à signaler : §19 |
| 13 | Back-office | 🟡 | | ADM-01 à 04, tableau de bord et file (e2e sur émulateurs) | 13a, 13b et 13c faits ; détail §20 |
| 13b | Conversion, séquences | 🟡 | 05/10/2026 | CONV-01 à 07 (émulateur), CONV-05 et 06 (e2e) ; 3 800 tests core | Moteur, codes, demandes offertes et écran faits ; reste et points à trancher : §21 |
| 13c | Comportement, IA | ⬜ | | CMP, IA, RED | |
| 14 | Qualité, préparation de la mise en production | ⬜ | | ERR, MISE_EN_PROD | |

### Lot en cours
- Lot : 13b (conversion), en grande partie fait (§21) ; suite : compléments 13b listés au §21, puis lot 13c (comportement, IA)
- Dernier lot terminé : 12b, le 02/10/2026 (détail §19)

## 6. Lot 1a — Socle technique (terminé le 27/09/2026)

**Fait**
- Monorepo pnpm 10 + Turborepo 2, Node 22 : `apps/web` (Next.js 16), `apps/functions` (Functions v2, `europe-west1`), `packages/core`, `packages/firebase`, `packages/config`. `packages/ui` arrive au lot 1b, `packages/emails` au lot 5.
- `@ph/core` : `format` (euros en centimes, dates Europe/Paris, relatif, téléphone E.164, SIREN/SIRET avec l'exception La Poste), `erreurs` (codes centralisés : message FR, statut HTTP, code callable), `resultat`, `enveloppe` (connexion → App Check → Zod → permission → débit → idempotence → traitement → audit ; une option dont la dépendance manque fait échouer le démarrage), `zod` (Zod configuré en français). 92 tests, couverture 100 % lignes, 99 % branches (seuil 95 %).
- `action()` (site, `apps/web/server/action.ts`) et `callable()` (Functions) branchés sur l'enveloppe ; Function `ping` vérifiée sur émulateur (succès et erreur de validation en français).
- `@ph/firebase/admin` : `appAdmin()` (émulateur, compte de service ou identifiants Google Cloud), `verifierJetonAppCheck()`.
- Firebase : `firebase.json`, `.firebaserc` (projet d'émulation `demo-portail-habitat`, alias dev/staging/prod), règles Firestore et Storage « tout refusé » avec leur test sur émulateur ; garde-fou qui refuse tout test Firebase hors émulateur local `demo-*`.
- ESLint 9 : boundaries (dépendances entre paquets), dépendances externes interdites par paquet, pas de couleur hexadécimale ni de `collection()` hors de leur paquet, pas d'import direct de `zod`. Vérifié avec des violations volontaires. Prettier, Knip.
- Sentry (site et Functions), inactif sans DSN. `/api/health`. `.env.example` complet.
- Playwright : projets iPhone 13, iPhone SE, Pixel 7, ordinateur ; test de fumée (sonde, langue, pas de défilement horizontal).
- CI GitHub Actions : format, lint, types, Knip, tests sous émulateurs, build ; e2e Chromium + WebKit.

**Vérifié dans cette session** : `pnpm format:check`, `lint`, `typecheck`, `knip`, `test` (sous émulateurs), `build` ; e2e sur Pixel 7 et ordinateur (seul Chromium est installé ici ; les projets iPhone tournent sur WebKit dans la CI).

**Reste / dettes connues**
- `pnpm dev` : le site et les Functions démarrent ; ici, l'interface web des émulateurs n'a pas pu être téléchargée (réseau du conteneur). À vérifier sur un poste : `pnpm dev`, puis http://localhost:4000.
- Premier passage de la CI GitHub à observer (téléchargement de WebKit, cache des émulateurs).
- Lot 2 : brancher `verifierPermission` (`peut()`), `limiterDebit`, `auditer` et `idempotence` sur Firestore ; lot 4 : `uid` depuis le cookie de session dans `action()`.
- Déploiement des Functions : `lib/index.js` est autonome (esbuild) ; le déploiement réel sera validé au lot 14.
- Lighthouse CI et build Storybook : lot 1b.

## 7. Lot 1b — Design system et composants (terminé le 27/09/2026)

**Fait**
- `@ph/ui/tokens` : source unique des 4 thèmes (rampes 100 → 900 des maquettes ; ardoise admin complétée en 800/900), neutres et ombres Broadsheet, statuts, Premium, rayons, polices, points de rupture. Génération de `themes.css` (`[data-theme]`) et du thème Tailwind 4 (`@theme`, palette par défaut désactivée) ; un test vérifie la synchronisation et les contrastes AA.
- Primitives : Logo (3 espaces + admin, version inversée), Button (`asChild`), IconButton, Chip, ChipGroup, Badge, StatusBadge, Field (libellé, aide, erreur reliés), Input (préréglages MOBILE §5 : tel, email, code postal, SIREN, code SMS…), Textarea, Select natif (`optgroup`), Checkbox, RadioCard, Skeleton.
- Patterns : Card composable, Stepper (barre de progression sous 640 px), Modal (feuille du bas sous 640 px, balayage pour fermer) et Sheet, ConfirmDialog (motif obligatoire), EmptyState, Banner, Combobox (ARIA 1.2), Toast (Radix), BottomNav, StickyActionBar (zones sûres iOS), PageErreur.
- Storybook 10 : les 4 thèmes côte à côte ou un seul, tailles 320 / 390 / 768 / 1280, extension a11y. Test « catalogue » Playwright sur le Storybook compilé : chaque story à 320 px, sans défilement horizontal, cibles ≥ 44 px, champs ≥ 16 px, axe avec contraste.
- Site : thème par espace (`(particuliers)`, `/pro`, `/diagnostic-immobilier`, `/admin`, ce dernier en `noindex`), posé aussi sur `<html>` pour les fenêtres ; `theme-color` et `viewport-fit=cover` par espace ; polices Source Sans 3 et Source Serif 4 italique (next/font).
- Pages d'erreur d'après la maquette : 404 par espace avec recherche et liens (ERR-01, code 404), 500 avec identifiant d'incident envoyé à Sentry en étiquette `incident` (ERR-02), page de maintenance et bascule `MAINTENANCE=1` dans `proxy.ts` (réécriture en 503, sauf `/admin` et `/api`).
- Tests : MOB-01 à 03 sur 5 pages, 4 appareils ; ERR-01 et ERR-02. `PW_CHROMIUM_SEUL=1` permet de lancer les projets iPhone sans WebKit.
- Performance : Sentry navigateur et pages d'erreur chargés à la demande (JavaScript initial de l'accueil passé de 226 à 154 Ko). Lighthouse CI mobile : performance ≥ 0,95, LCP ≤ 2 s, CLS ≤ 0,05, TBT ≤ 150 ms, accessibilité ≥ 0,95.
- CI : jobs « catalogue » (Storybook + Playwright) et « Lighthouse ».

**Écarts et décisions à valider**
- **D45** : les boutons principaux pro utilisent `#c94f0a` au lieu de `#e05a10` (contraste AA) ; ambre et or plus foncés pour le texte.
- **D46** : budget JavaScript initial irréaliste avec Next.js 16 (voir DECISIONS) ; seuil provisoire de 160 Ko en CI.
- Chips : 44 px de haut partout (MOB-02), au lieu d'environ 37 px dans les maquettes.
- ERR-03 : la maintenance se pilote par variable d'environnement ; le branchement sur `config/app.maintenance` se fera avec les feature flags (lot 2).

**Reste / dettes connues**
- Comparaison visuelle automatique aux maquettes (`/maquette`) : les `.dc.html` ne s'affichent pas en `file://` ; à outiller au lot 6 (serveur statique sur `docs/designs`).
- Layouts complets (PublicLayout, ProLayout avec sidebar, AdminLayout) : ils arrivent avec leurs écrans (lots 6, 10, 13), en réutilisant BottomNav, Sheet et Logo.

## 8. Lot 2 — Données et sécurité (terminé le 27/09/2026)

**Fait**
- `@ph/core/schemas` : un schéma Zod par collection et sous-collection de DATABASE §16 (registre `SCHEMAS`, test de couverture), `schemaVersion` partout, dates en `Date`, montants en centimes entiers, `artisansPublic`, `avis` et `iaRedactions` stricts (un champ privé en trop fait échouer l'écriture).
- `@ph/core/equipe` : `peut(membre, action, contexte)` (matrice COMPTES §4.1, collaborateur limité à ses métiers ou à ses demandes assignées, gérant sans pouvoir sur le propriétaire ni les gérants, surcharges jamais sur les actions du propriétaire). `@ph/core/admin` : permissions effectives (rôle + plus − moins, rôles personnalisés), codes de section des claims. `@ph/core/flags` : `flag(nom, sources)` avec surcharge par artisan.
- `firestore.rules` complet, `storage.rules`, 36 index composites, 14 TTL sur `expireLe`.
- Tests de règles : matrice de 118 cas Firestore et 17 cas Storage, chacun vérifié pour 16 profils (anonyme, particulier, propriétaire, gérant, collaborateur, comptable, membre suspendu, autre artisan, 6 rôles staff, impersonation) ; test dédié : les prix du référentiel sont illisibles côté client. Test de mutation fait : une règle affaiblie fait échouer la matrice.
- `@ph/firebase` : `chemins` (seul endroit qui nomme les collections), conversion Timestamp/GeoPoint, convertisseur et dépôt validés par Zod, `dependancesEnveloppe` (permission via `membres` ou `admins`, limite de débit en transaction, audit, idempotence 24 h), branchés dans `action()` et `callable()`.

**Écarts de sécurité par rapport à DATABASE §12 (appliqués, à relire)**
1. **Avis** : un avis publié est lisible par tous et les règles ne masquent aucun champ. L'email, l'uid et l'empreinte IP de l'auteur passent donc dans `avis/{id}/prive/auteur` (modération avec droit aux données personnelles).
2. Lecture par l'équipe interne **par section** (`lit('dem')`, `lit('art')`, `lit('ao')`…) au lieu de « tout staff ».
3. Profils `users` et consentements : lisibles par le staff seulement avec le droit aux données personnelles (`staff.pii`, absent pour le rôle `lecture`).
4. Téléphone retiré des champs modifiables par l'utilisateur (changement par Function avec vérification par code, comme l'email).
5. Réalisations non publiées : visibles de l'équipe seulement ; publication impossible sans l'autorisation du propriétaire du chantier.
6. Rayon d'intervention contrôlé (10 à 100 km) et date d'acceptation non falsifiable.
7. Consentements : horodatage serveur obligatoire, champs et types contrôlés.
8. Documents : chemin de stockage imposé, 10 Mo maximum. Écritures Storage vérifiées aussi sur le document `membres` (révocation immédiate).
9. Correction de `notesInternes` (`staff().r`) et ouverture en lecture de `referentiel/recherche/*` (intentions, métiers, synonymes).
10. Zone Storage `televersements/{uid}/` pour les photos d'avis et de demande (écrites par leur auteur, déplacées par Function).

**Écarts de modèle de données (DATABASE.md mis à jour)**
- Nouvelle collection `idempotence/{cle}` (TTL 24 h) pour l'enveloppe des actions.
- TTL toujours sur `expireLe` : un TTL sur `createdAt` ou `fenetreDebut`, comme le prévoyait §11, supprimerait les documents immédiatement.
- `demandes` et `dossiersDiag` sans TTL (anonymisation planifiée, §14).
- `referentiel/recherche/synonymes/global` (un document ne peut pas se trouver au chemin `referentiel/recherche/synonymes`).
- Points géographiques stockés en `GeoPoint`, manipulés en `{ latitude, longitude }`.

**Vérifications**
- Ici : `typecheck`, `lint`, `knip`, 172 tests core, 1 890 cas Firestore, 11 tests serveur sur émulateur, ping de bout en bout.
- Storage : 247 cas sur 255 passent ici. Les 8 restants (écritures qui relisent `membres` depuis Storage) échouent seulement dans ce conteneur, parce que `firebase-tools` y passe par le proxy réseau pour interroger Firestore. La CI GitHub les valide.

**Reste**
- `syncClaims` (claims `roles`, `ent`, `staff`) : lot 4.
- Migrations (`scripts/migrations`, curseur dans `migrations/{id}`) : dès la première évolution de schéma.
- Remote Config pour les valeurs globales des flags : branché avec le premier flag utilisé (lot 12).

## 9. Lot 3 — Logique métier pure (terminé le 27/09/2026)

**Méthode** : les cas attendus sont calculés **en exécutant le code des maquettes** dans un bac à sable Node (`packages/core/scripts/maquette.mjs`), puis le portage TypeScript doit les reproduire. Quand aucune maquette ne calcule le résultat (prix des appels d'offres, matching), les cas viennent d'une **implémentation de référence écrite séparément** à partir de la formule du document. `pnpm --filter @ph/core cas` régénère tous les fichiers `__tests__/*.cases.json`.

| Module (`@ph/core/…`) | Source | Cas |
|---|---|---|
| `simulateur` | `calculer()`, `coefRegion` de la maquette ; 9 formules + moteur générique des 103 prestations du catalogue ; prix passés en paramètre (`docs/data/prestations-prix-detaillees.json`) | 560 |
| `diagnostic` | Parcours Diagnostic (obligatoires, conseillés, validités, remise pack ; année de référence en paramètre, `docs/data/diagnostics-regles.json`) | 300 |
| `recherche` | `recherche-projets.js` porté à l'identique ; 411 requêtes étiquetées : **96,4 %** au 1er rang, 100 % dans le top 3, 17 exemples obligatoires | 554 + 411 |
| `parcours` | `migrer`, `valeursParDefaut`, `lisible`, champs des 112 prestations (`champsDuTarif`) ; brouillon strict, étape de reprise, arrivée avec paramètres | 260 |
| `stats` | `PH_DEMANDES.estimer` (Bordeaux ≈ 800, plombier 104, couvreur 28, Lozère 5) ; bascule vers le réel à 3 mois ; paramètres dans `docs/data/stats-demandes.json` | 204 |
| `leads` | DATABASE §5 : barème, Premium, crédits, promo ; barème initial `docs/data/bareme-appels-offres.json` | 120 |
| `annuaire` | `filtrer()` et `trier()` de la maquette, Premium en tête | 150 |
| `matching` | MATCHING §3 : filtres durs (raison consignée), score, sélection équitable, aiguillage D41, qualité de la demande ; config `docs/data/matching-config.json` | 600 + 40 populations |
| `referentiel` | `pnpm verifier:referentiel` : 112 prestations, 15 familles, 60 métiers, 137 intentions cohérents | — |

**Écarts assumés par rapport aux maquettes**
1. Recherche : bonus de correspondance exacte (libellé +8, mot-clé +4), mots vides « qui, que, quoi », mots-clés ajoutés (pompe à chaleur, fuite de toiture) pour passer de 93,9 % à 96,4 % au 1er rang (RECHERCHE.md mis à jour).
2. Reprise de parcours : la maquette enregistre la fourchette de prix dans le brouillon et l'affiche dans l'encart ; REPRISE_PARCOURS §3 l'interdit (aucun montant avant l'envoi des coordonnées). Le brouillon n'a donc pas de fourchette, et un brouillon contenant une clé inconnue (email, nom…) est rejeté.
3. Étape de reprise : la maquette reprend à l'étape enregistrée ; le code reprend à la première étape dont une réponse a disparu ou changé de bornes (SIM-06e), ou à l'étape 4 si le code postal est incomplet.

**Vérifications** : `typecheck`, `lint`, `knip`, `format`, 3 324 tests core (lignes 100 %, branches 97,4 %), tests de mutation sur la migration des réponses et la sélection du matching. Le test de pertinence calcule ses classements une seule fois (il dépassait 5 s en CI à côté des émulateurs).

**À valider** : D47 (compléments au barème des appels d'offres) et D48 (points non précisés du matching), appliqués en attendant.

**Reste** : branchement Firestore des moteurs (lots 4, 8, 9, 12) ; domaine RGE par prestation (lot 12b).

## 10. Lot 4 — Comptes, entreprises, équipes, jeu de données (terminé le 27/09/2026)

**Fait**
- `@ph/core/equipe` : claims (`ent` ne contient que les appartenances actives, 10 entreprises et 1 000 octets au maximum), répartition des sièges (suspension sans perte, propriétaire toujours actif), dernier propriétaire bloqué, email masqué. `@ph/core/entreprises` : contrôles de l'étape SIREN (fermée, hors bâtiment, récente, déjà inscrite). `@ph/core/geo` (geohash), `slugifier`, entrées Zod de toutes les opérations de compte.
- Enveloppe : écriture refusée en impersonation, mot de passe ressaisi depuis moins de 5 min et double authentification exigibles par option ; contexte tiré du jeton (`callable()`) ou du cookie de session (`action()`, vérifié avec révocation).
- Session : `POST/DELETE /api/session` (cookie httpOnly 14 j particuliers, 7 j pros, créé seulement après une connexion récente, contrôle de l'en-tête Origin).
- `@ph/firebase/comptes` : `finaliserOnboarding` (transaction + `sirenIndex`), invitations (jeton haché, même email vérifié, sièges revérifiés, 20 par jour), `modifierMembre`, `retirerMembre` (jetons révoqués, demandes désassignées), `quitterEntreprise`, `transfererPropriete` (2FA du destinataire, vérifiée après la permission), `appliquerSieges`, demandes d'accès, `supprimerMonCompte`, `fermerEntreprise`, `rattacherOuCreerParticulier`, `rechercherEntreprise` (API Recherche d'entreprises, cache 24 h), `synchroniserClaims`. Functions : callables, déclencheur `syncClaims`, expiration horaire des invitations.
- Jeu de données `pnpm seed` (déterministe, relançable) : 109 comptes dont les 5 fixes, 60 entreprises (tous plans et statuts), 5 équipes, une personne dans 2 entreprises, 200 demandes, 40 appels d'offres (auto, manuel, gratuit, promo), 300 avis, référentiel complet (prix séparés), 11 communes, invitation expirée, revendication en cours, SIREN en doublon. Chaque document est validé par son schéma. Refus hors émulateur ou préproduction.

**Écarts et changements du modèle (signalés)**
1. Nouveau statut de demande `appel_offres` (MATCHING [7] l'écrivait, le schéma ne l'avait pas) — DATABASE mis à jour.
2. Fiche créée par l'admin : `proprietaireUid` facultatif et `nbMembres` à 0 tant qu'elle n'est pas revendiquée (COMPTES §3.5).
3. Tarifs du catalogue stockés en objets dans `referentiel/prestations/prix` (Firestore refuse les tableaux imbriqués), conversion sans perte testée sur les 103 prestations.
4. `prive/facturation` n'est pas créé à l'onboarding (il exige un client Stripe) : créé par le lot 11.
5. Recherche d'entreprise : API Recherche d'entreprises seule ; l'appel Sirene INSEE (clé `INSEE_API_KEY`) n'apporte rien de plus pour ces contrôles, à ajouter si besoin.
6. Nouvelle dépendance de développement : `tsx` (exécution du script de seed).

**Reste**
- Emails réels (invitation, bienvenue, demande d'accès…) : notificateur provisoire qui trace sans données personnelles, remplacé par `notifier()` au lot 5.
- Revendications (`demanderRevendication`, `validerRevendication`), `adminCreerEntreprise`, `adminImpersonerLecture` : lot 13 (back-office).
- Parcours d'authentification côté navigateur (lien magique, Google, liaison, 2FA) : avec les écrans (lots 6, 8, 10). `/dev/comptes` non réalisé (non nécessaire, tout est testé sur émulateur).
- `matchingConfig` et `grillesTarifaires` : schémas à aligner sur MATCHING §2 et le barème (D47) au lot 12, puis ajout au seed.

## 11. Lot 5 — Emails, SMS et notifications (terminé le 28/09/2026)

**Fait**
- `@ph/core/notifications` : catalogue des **110 modèles** (EMAILS §4, catégorie, charte, SMS, in-app, différé, groupé) ; décisions de canal (sécurité et transactionnel jamais coupés, un email de sécurité passe une fois malgré la liste de blocage), heures calmes des SMS (21 h – 8 h, heure de Paris, sauf codes), limites de pression (1 email non transactionnel par jour, offres pro 2 par semaine et jamais le week-end), clé d'idempotence. *Le message du commit f65dd86 annonce 150 modèles par erreur : il y en a 110.*
- `@ph/emails` (React Email) : 16 blocs (les 14 de la documentation, plus `code` et `lien`), mise en page commune aux 4 chartes (couleurs issues des tokens, `couleursEmail` ajouté à `@ph/ui`), pied légal, préférences et désabonnement selon la catégorie, version texte générée. **41 modèles rédigés** (§4.1 à 4.3 et `reprise-simulateur`), 69 squelettes (sujet et données d'exemple) complétés dans leurs lots. Aperçu : `pnpm email:dev`.
- `@ph/firebase/notifications` : `notifier()` (une écriture `emails/{id}` par clé d'idempotence, préférences, liste de blocage, in-app, planification) ; **les secrets (liens magiques, jetons d'invitation) ne passent que par la tâche d'envoi**, jamais par Firestore ; suivi des statuts, 5 tentatives puis abandon et tâche de modération ; webhook (rebond définitif ou plainte → `suppressions`) ; désabonnement par catégorie ; jetons HMAC des liens.
- Functions : tâche Cloud Tasks `envoyerEnvoi` (10 envois/s, 5 tentatives), relances annulées si `encoreValable` est faux (onboarding, invitation, reprise, fiche incomplète), liens absolus avec `utm_campaign`, en-têtes `List-Unsubscribe` en un clic, liste blanche de staging ; fournisseurs Resend, Brevo (SMS) et capture Mailpit (`pnpm mailpit`, `EMAIL_CAPTURE=mailpit`). Callables `demanderLienConnexion`, `demanderReinitialisation`, `renvoyerVerificationEmail` : liens Firebase envoyés par `notifier()`, même réponse que l'adresse existe ou non, 5 envois par heure et par adresse.
- Site : `/api/resend/webhook` (signature Svix vérifiée, anti-rejeu 5 min), `/api/desabonnement` (POST RFC 8058 et lien), page `/preferences` sans connexion (jeton signé).
- Functions du lot 4 branchées sur `notifier()` : bienvenue, invitation (et relance J+3), invitation acceptée ou expirée, demande d'accès et réponse, rôle modifié, membre retiré, transfert de propriété, sièges suspendus, entreprise fermée.

**Nouvelles dépendances (signalées)** : `@react-email/components`, `@react-email/render`, `react`, `react-dom` (emails et Functions) ; en développement `react-email`, `@react-email/ui` (aperçu).

**Non fait ou non vérifié**
1. **Parcours Playwright + Mailpit** (inscription particulier, onboarding avec relance, invitation, mot de passe oublié) : ils exigent les écrans de connexion, d'inscription et d'équipe (lots 8 et 10). À écrire avec ces écrans ; Mailpit sera ajouté comme service de la CI à ce moment-là.
2. `pnpm email:dev` : configuré mais pas lancé ici (serveur local refusé dans ce conteneur).
3. `.env.example` : inaccessible depuis cette session ; variables à y ajouter : `MAILPIT_URL`, `EDITEUR_MENTION`, `NEXT_PUBLIC_SITE_URL` (liste complète dans EMAILS §9).
4. Regroupement 15 min des modèles « groupés » (`nouveau-message`) : branché avec la messagerie (lots 8 et 10).
5. Mention légale de l'éditeur (raison sociale, adresse) : valeur provisoire dans `EDITEUR_MENTION`, à fournir.

**Point de vigilance CI** : l'affichage principal de `/maintenance` mesuré à 2,55 s une fois (seuil provisoire 2,5 s, D46), passé aux exécutions suivantes ; à surveiller avec D46.

## 12. Lot 6 — Pages publiques, SEO, cookies (terminé le 28/09/2026)

**Fait**
- **Accueil particuliers** `/` : hero (formulaire projet + code postal + délai, chips « Projets populaires » qui remplissent le champ et fixent la prestation, ACC-02 ; envoi vers `/simulateur?prestation=&cp=&delai=`, ACC-03), métiers, comment ça marche, aperçu du simulateur, artisans, avis, inspirations, application, villes, bandeau artisan, FAQ, appel final. Chiffres lus dans `stats/public` (ACC-01) avec régénération horaire (ISR) ; sans document, les chiffres sont masqués. La recherche avec suggestions reste au lot 7.
- **En-tête public** commun (bandeau, navigation, bouton principal, menu plein écran Radix sous 1024 px avec `aria-expanded`, ACC-04) : nouveau pattern `MenuPleinEcran` dans `@ph/ui` ; pied de page commun.
- **Diagnostic immobilier** `/diagnostic-immobilier` (hero préremplissant le parcours `?motif&type&periode`, cartes, tableau, repères, tarifs, FAQ) et **11 pages communes** générées au build depuis `docs/data/communes.json` (DIA-05 : titre unique, liens vers les 10 autres ; commune inconnue → 404). Les tableaux deviennent des cartes sous 640 px.
- **Acquisition artisans** `/pro` : accroche, carte d'inscription (champs, métiers groupés par famille en `<optgroup>`, `?metier=` présélectionne et affiche le bandeau), exemples de demandes, étapes, espace artisan, application, **tarifs annuel / mensuel** lus dans `config/app.prix` (repli : D24/D25 dans `@ph/core/facturation`), FAQ. La page reste statique (paramètre lu dans le navigateur).
- **Pages légales** `/legal/[public]/[doc]` : 12 documents statiques, textes extraits de la maquette vers `docs/data/documents-legaux.json`.
- **Aide et contact** `/aide` (maquette Contact) : sujets `?sujet=`, champ de précision selon le sujet, Server Action (Zod, limite 5/h, App Check), `contacts/{CT-XXXXXX}` en transaction, piège à robots. La page d'aide de l'espace pro (maquette « Aide et Contact ») est `/pro/aide`, au lot 10.
- **SEO** : metadata par page, canoniques (`metadataBase`), JSON-LD `Organization`, `FAQPage`, `BreadcrumbList`, `LocalBusiness` (communes) ; `sitemap.xml` (27 adresses) ; `robots.txt` (espaces privés exclus, tout bloqué hors production).
- **Bandeau cookies CNIL** : « Tout refuser », « Personnaliser », « Tout accepter » au même niveau ; « Mesure d'audience détaillée » décochée par défaut ; choix redemandé après 6 mois (`@ph/core/consentement`) ; lien « Gérer les cookies » dans les pieds de page ; événement `ph:consentement` pour les futurs traceurs.
- Core : `calculerStatsPublic` (le seed écrit maintenant `stats/public`), `formatNombre`, `nombreArrondi` (« 2 000+ »), `formatFourchette`, `grilleTarifs`, sujets de contact. Captures Playwright à 1440 et 390 px comparées aux maquettes (`CAPTURES=1 pnpm e2e captures`).

**Modèle de données (signalé)** : `contacts.referenceDossier?` ; identifiant du contact = référence donnée à l'usager ; nouvel index `avis (statut, publieLe desc)`. DATABASE corrigé (prix de `config/app` alignés sur D24/D25, qui faisaient foi).

**Décision proposée** : **D49** (contenus de la maquette sans source réelle : artisans, témoignages, inspirations tirés des vraies données et masqués sinon ; pas de badge App Store / Google Play tant que l'application est une PWA ; témoignages d'artisans de la landing pro masqués). Appliquée en attendant.

**Performance (Lighthouse mobile, budget D46)** : la CI a échoué après l'accueil puis le bandeau cookies (JS 272 Ko, LCP 3,1 s sur `/maintenance`). Corrections : bandeau rendu côté serveur et masqué avant l'affichage par un script en tête quand un choix existe (il devenait l'élément LCP), lecture du cookie sans Zod, détail des catégories et panneau du menu chargés à la première ouverture (`PanneauPleinEcran` sans déclencheur dans `@ph/ui`), classes `bouton` isolées de Radix, liens des pages d'erreur et du bandeau sans préchargement, sections sous la ligne de flottaison en `content-visibility: auto`, formulaire du hero en GET natif (plus de JavaScript à l'envoi ; le texte libre part en `?projet=`), police serif non préchargée, routes passées en propriétés aux composants client. Mesure locale : `/maintenance` conforme ; accueil LCP conforme, JS ≈ 164 Ko pour 160 Ko (socle Next + React ≈ 150 Ko).

**Non fait ou à fournir**
1. **Textes légaux** : emplacements entre crochets (raison sociale, SIREN, hébergeur, directeur de publication…) à compléter et à faire relire avant la mise en production ; `EDITEUR_MENTION` idem (lot 5).
2. **Visuels** : aucun visuel définitif (README « Visuels ») ; des aplats teintés occupent la place, au bon ratio.
3. Formulaire d'inscription pro : mise en page et validation seulement ; création du compte, autres métiers, chantiers acceptés et estimation par code postal au **lot 10** (le bouton affiche pour l'instant un message d'attente).
4. Accusé de réception par email du formulaire de contact : aucun modèle au catalogue EMAILS ; à ajouter si souhaité.
5. Enregistrement du choix cookies dans `consentements` pour les utilisateurs connectés : avec la connexion (lot 8).
6. Numéro de téléphone de la maquette Contact (fictif) non repris.

## 13. Lot 7 — Recherche de projet (terminé le 28/09/2026)

**Fait**
- **Champ « Quel est votre projet ? »** de l'accueil : suggestions dès 2 caractères, 7 au plus, mots reconnus en gras, métier, badge « Estimation en ligne », « Résultats pour … » (correction), message d'urgence (délai « Dès que possible » présélectionné), métiers vers l'annuaire, « Projets associés » à la place des chips, champ vide → « Projets les plus demandés ». Clavier (↓ ↑ Entrée Échap), ARIA combobox + listbox + `aria-activedescendant`, nombre de suggestions annoncé. Sur mobile, recherche en plein écran avec « Annuler » (MOBILE §7).
- **Poids** : l'accueil n'embarque qu'un champ ; moteur, index (≈ 16 Ko compressés) et liste sont chargés au premier focus. La liste suit la frappe sans délai (moteur local instantané ; un délai laissait une liste périmée que la touche Entrée pouvait choisir). Sans JavaScript ou avant le chargement, l'envoi GET natif reste possible.
- **Routage à la validation** (`cibleRecherche`, core) : prestation → `/simulateur?prestation&intention&cp&delai` ; `diagnostic` → parcours diagnostic ; rien de choisi → meilleur résultat s'il est net (score ≥ 8), sinon demande libre (`?projet=&metier=`).
- **Journal** `evenements` (type `recherche`) : `saisie`, `choix` (intention, rang), `zero` (après 800 ms sans frappe), `abandon` ; requête normalisée sans email ni suite de chiffres (téléphone, code postal), identifiant d'onglet aléatoire ; `POST /api/recherche/evenement` (même origine, 120 / h, sans App Check, envoi `fetch` en `keepalive`).
- **`GET /api/recherche?q=`** : cache CDN 1 h, 30 requêtes / min / IP (par instance, meilleur effort), Typesense si configuré sinon moteur local ; surlignage, correction, urgence, métiers et projets associés viennent toujours du moteur local.
- **Typesense** (D4 ⏳) : formats dans `@ph/core/recherche` (collection, documents, synonymes, mots vides, paramètres de RECHERCHE §4) ; Functions `syncIntentionTypesense` et `syncSynonymesTypesense` déclenchées à chaque modification du référentiel, **inactives sans configuration**.

**Variables à fournir si D4 est validé** : `TYPESENSE_HOTE`, `TYPESENSE_CLE_RECHERCHE` (site, clé de recherche seule), `TYPESENSE_CLE_ADMIN` (Functions, Secret Manager). Première indexation : réécrire les intentions (le seed le fait) ou lancer une synchronisation complète à ajouter au lot 13 (écran admin Recherche).

**Non fait (lots suivants)** : annuaire `/artisans?q=` (lot 9) ; écran admin Recherche, banc d'essai et popularité mensuelle (lot 13) ; saisonnalité (`saison`) non utilisée par le moteur.

## 14. Lot 8 — Parcours particuliers (terminé, 28/09/2026)

**Fait**
- **Création d'une demande** (`creerDemande`, `POST /api/demandes`) : réponses revérifiées, estimation **recalculée avec les prix privés** (lecture d'une seule prestation), géocodage du code postal (API Découpage administratif, gratuite), compte particulier créé ou rattaché **sans ouvrir de session** (SIM-09), consentements (confidentialité, mise en relation), référence `PH-XXXXXX`, email `demande-confirmee` (lien magique si le compte vient d'être créé, sinon page de connexion), 5 envois / h (SIM-10), idempotence. Aucun montant accepté dans la requête (SIM-08).
- **Simulateur** `/simulateur` : 5 étapes (112 prestations, recherche et 15 familles ; `?prestation=` démarre à l'étape 2), étape dans l'URL (SIM-02), messages d'erreur liés aux champs (SIM-03), **aucun prix avant l'envoi** (SIM-01b : descriptions d'options citant des euros retirées de la partie publique, aussi dans le seed), résultat affiché depuis la réponse du serveur, aides en négatif (SIM-05).
- **Reprise** (REPRISE_PARCOURS) : `useParcours` + `<RepriseParcours />` (réutilisable), brouillon local sans coordonnées, Reprendre / Recommencer (Annuler 8 s), autre onglet, arrivée avec une autre prestation (SIM-06j), stockage bloqué sans erreur ; **lien de reprise par email** (case non cochée par défaut, jeton à usage unique 30 jours, empreintes seules, 3 liens / adresse / jour), brouillon serveur supprimé à l'envoi.
- **Parcours diagnostic** `/diagnostic-immobilier/estimation` : préremplissage `?motif&type&periode&ville` (DIA-01), liste des diagnostics obligatoires gratuite **sans prix** (le navigateur reçoit un référentiel aux prix nuls), `creerDossierDiag` (`POST /api/diagnostics`) recalcule dossier et budget pack côté serveur (`PHD-XXXXXX`, email `dossier-diag-confirme`).
- **Laisser un avis** `/avis` : choix de l'artisan (fiches en ligne, liste régénérée toutes les heures), formulaire (note globale, 4 critères, points forts, commentaire limité à 1 200 caractères), publication bloquée sans note ni certification (AVI-01, AVI-02) ; `deposerAvis` (`POST /api/avis`) crée l'avis `en_attente` (AVI-03), refuse un deuxième avis même email + même artisan + même mois de chantier (AVI-04), 5 avis / jour, email `avis-recu`.
- **Connexion des particuliers** `/connexion` → `/connexion/lien` : lien magique (même réponse que le compte existe ou non), adresse reconfirmée au retour (mémorisée sur l'appareil qui a demandé le lien), code échangé **côté serveur** contre la session (API d'identité REST : aucun SDK Firebase dans le navigateur), profil particulier créé au premier clic, adresse vérifiée, retour vers la page demandée (chemins internes seulement).
- **Mon espace** `/mon-espace` : mes projets (statut, nombre d'artisans et de devis, ESP-01), détail d'une demande (suivi en 4 étapes, artisans, montant des devis, messages), demande d'un autre = « introuvable » (ESP-02), messages avec coordonnées masquées **avant enregistrement** tant que l'artisan n'a pas accepté (ESP-03), export JSON de mes données et suppression du compte en deux temps (fenêtre + « SUPPRIMER » tapé ; demandes en cours annulées) (ESP-04).
- **Reprise « compte »** (REPRISE_PARCOURS §5, niveau 2) : personne connectée → brouillon `brouillons/{uid}_simulateur` écrit à chaque changement d'étape (et au départ de la page), le plus récent de l'appareil et du compte est proposé ; supprimé à l'envoi de la demande. Aucun appel réseau sans session.
- **Budget JavaScript** (D46) : l'accueil ne précharge plus le simulateur ; `tailwind-merge` n'est plus chargé au démarrage des pages (−11 Ko : `optimizePackageImports`, page 404 et formulaire de l'accueil en éléments natifs).

**À signaler**
1. **DIA-02** cite le plomb pour une maison de 1968 ; les règles de la maquette (et la loi) ne l'imposent qu'avant 1949. Le code suit la maquette. → corriger ACCEPTANCE ?
2. **Lighthouse (D46 ⏳)** : le temps d'affichage de l'accueil et de `/maintenance` mesuré en CI oscille autour de 2,5 s selon la machine (même code rouge puis vert). Proposition : comparer la médiane de 5 passages, ou une marge (2,7 s) — à trancher.
3. **App Check côté navigateur** non branché : les routes l'exigent, `APP_CHECK_MODE=desactive` en local et en e2e. À faire avec la configuration Firebase du site.
4. Référentiels du simulateur (partie publique) et du diagnostic lus dans `docs/data` côté serveur (même source que le seed) ; la lecture Firestore viendra avec leur édition dans l'administration (lot 13).
5. Emails de relance J+3 (`reprise-simulateur-rappel`) non planifiés.
6. **Modèle de données** : `avis/{id}/prive/auteur` gagne `cleUnicite` (empreinte SHA-256 de « email + artisan + mois de chantier ») et un index de groupe de collections `prive.cleUnicite`, pour refuser les doublons (AVI-04) sans stocker l'email en clair ailleurs.
7. **Photos d'avis** non envoyées : l'emplacement de la maquette n'est pas encore branché (Storage + analyse antivirus D9). Lien `?jeton=` d'invitation à noter (D40) : au lot 10 avec les chantiers terminés.

8. **Connexion sans SDK Firebase dans le navigateur** (choix de coût et de poids JS, D46) : le lien magique est validé par le serveur. Google et mot de passe pour les particuliers (COMPTES §5) ne sont pas proposés : ils demanderaient ce SDK (+~60 Ko). À trancher si vous les voulez.
9. **Cookie `ph_connecte=1`** (lisible par le navigateur, sans donnée personnelle) posé avec la session : il évite tout appel de synchronisation pour les visiteurs non connectés. Durée = celle de la session. À ajouter à la liste des cookies strictement nécessaires (page cookies).
10. **Export des données** : téléchargement immédiat d'un fichier JSON (profil, demandes, messages, dossiers de diagnostic), au lieu de « archive envoyée par email sous 24 h » (maquette). Les avis déposés n'y sont pas encore (ils ne sont reliés au compte que par l'email).
11. **Mes avis** : l'onglet propose de laisser un avis ; la liste des avis déposés viendra avec leur modération (lot 13). « Voir le devis » (fichier) et la notification de l'artisan à chaque message viendront avec l'espace pro (lot 10).
12. **Index ajouté** : `demandes` (`particulierUid`, `createdAt` décroissant) pour « Mes projets ».
13. L'accès à `/mon-espace` sans cookie renvoie à la connexion ; la validité de la session est vérifiée par chaque route `/api/mon-espace/*`.

## 15. Lot 9 — Annuaire et fiche publique (terminé, 28/09/2026)

**Fait**
- **Fiche publique calculée par une seule fonction** (`projeterArtisanPublic`, partagée par le déclencheur `projeterArtisan` et le seed) : liste blanche de champs (aucune donnée privée, testé), labels **vérifiés et non expirés** seulement (FIC-01), téléphone seulement en Premium ou avec l'option Visibilité (ANN-06), `scoreClassement` de MATCHING §4, fiche retirée si hors ligne, suspendue ou supprimée (FIC-02). Index Typesense de l'annuaire mis à jour si configuré (D4).
- **`/artisans`** (page serveur, tout l'état dans l'URL, ANN-01) : recherche texte + lieu (commune ou code postal, API Découpage administratif ; Bordeaux par défaut), filtres métier, rayon 5–60 km, note, labels, disponibilité, budget ; colonne fixe sur ordinateur, feuille du bas sur mobile ; chips retirables et « Tout effacer » (ANN-02) ; « Artisans à la une » Premium signalés + mention L111-7 (ANN-03) ; tri ; état vide avec « Déposer mon projet » (ANN-05).
- **Recherche par rayon** : plages de geohash calculées par notre code (portage de geofire-common, **aucune dépendance ajoutée**), puis distance exacte ; un artisan n'apparaît que si le lieu est dans le rayon choisi **et** dans sa zone d'intervention (cadrage n° 13).
- **Texte** : Typesense s'il est configuré, sinon recherche de repli mot à mot sans accents (« douche italienne », ANN-04).
- **`/artisans/[slug]`** (ISR 1 h) : présentation, réalisations publiées, derniers avis publiés avec réponse de l'artisan, labels vérifiés, zone, devis moyen, « Demander un devis » (le simulateur cible l'artisan : `?artisan=`, `source: fiche_artisan`), JSON-LD `LocalBusiness` avec note et nombre d'avis (FIC-03), 404 si hors ligne (FIC-02). `?apercu=1` : bandeau d'aperçu et en-tête `X-Robots-Tag: noindex`.
- **Sitemap** : annuaire et fiches en ligne (régénéré toutes les heures).
- **Composant partagé** `NoteMoyenne` (packages/ui) : « ★ 4,8 (24 avis) », rien sans avis ; remplace 2 copies existantes.

**À signaler**
1. **Formule de pertinence** : README et maquette (`note × 12 + avis × 0,4 − km × 0,6`) contredisent MATCHING §4 (`scoreClassement − 0,6 × km`). Appliqué : MATCHING, la formule de la maquette ne servant que si le score manque. À confirmer.
2. **Mode démonstration `ANNUAIRE_DEMO=1`** (tests de bout en bout sans base) : l'annuaire et les fiches sont servis par le jeu de test généré en mémoire. **Refusé en production** (erreur au démarrage si `VERCEL_ENV=production`), conformément à D49.
3. **Aperçu `?apercu=1`** d'une fiche **hors ligne** par son artisan : demande une session pro (lot 10) ; pour l'instant l'aperçu ne montre que les fiches en ligne.
4. **Métiers proposés en filtre** : les 8 de la maquette (plomberie, électricité, peinture, carrelage, menuiserie, chauffage, couverture, maçonnerie) + ceux déjà choisis. L'intention reconnue par la recherche du lot 7 n'est pas encore transformée en filtre métier : le texte passe par la recherche plein texte.
5. **Test du jeu de données (`seed.test.ts`)** : dépasse 5 s sur ce poste (déjà le cas avant ce lot), passe en CI.

## 16. Lot 10 — Espace artisan (terminé le 29/09/2026)

**Fait**
- **10a Connexion pro** (`/connexion?espace=pro`) : message identique que l'email existe ou non (CON-01), attente croissante après 5 échecs (CON-03), double authentification par application (TOTP) ; propriétaire ou gérant Premium sans 2FA → activation demandée avant la facturation (CON-02). **SMS : prêt mais coupé** par le flag `deuxFacteursSms` (activable en un clic dans `config/flags`, une fois les SMS Identity Platform payés).
- **10b Inscription** : étape 1 sur `/pro` (métiers, chantiers, estimation des demandes), zone 30/50/100 km, entreprise par SIREN (fermée refusée, déjà inscrite → « Demander à rejoindre »), mot de passe, activation ; lien de reprise par email (ONB-04).
- **10c Cadre et tableau de bord** : barre latérale repliable (ordinateur), onglets du bas + « Plus » (mobile), menu selon le rôle (le comptable ne voit que la facturation), sélecteur d'entreprise (plusieurs entreprises, bascule vérifiée côté serveur), tableau de bord : indicateurs, complétude, « 3 étapes pour être en ligne » (ONB-06).
- **10d Mes demandes** (`/pro/demandes`) : nouvelle demande affichée sans recharger (écoute Firestore, PRO-01), coordonnées du particulier seulement après « Accepter la demande » (PRO-02 ; numéros et emails masqués dans le texte avant), « Je m'en occupe » et « Pris en charge par … » (PRO-03), compteurs, recherche, filtre d'état ; comptable exclu.
- **10e** : **Statistiques** réservées aux Premium (PRO-07 ; période dans l'URL, vues, appels, demandes de devis, vues par semaine) ; **Mes avis** (résumé, répartition, filtres, réponse publique unique) ; **Ma fiche** modifiable section par section (présentation, informations, devis moyen, zone), complétude recalculée côté serveur ; **documents** (dépôt Storage, vérification serveur : type, taille, SHA-256) avec **mise en ligne automatique** dès que le SIREN est vérifié (ou le Kbis envoyé) et la décennale envoyée (ONB-06b, COMPTES §3) ; **logo** et **projets réalisés** (accord du propriétaire du chantier).
- **10f Équipe et invitations** : page **Équipe** (membres, sièges avec invitations en cours, inviter, annuler, changer de rôle, retirer, « Quitter » refusé au dernier propriétaire — EQU-01 à 04) ; page **Invitation** (entreprise, rôle, invitant ; accès créé pour qui n'a pas de compte, l'email étant prouvé par le lien ; autre adresse connectée : refus avec email masqué ; lien expiré ou annulé : nouvelle invitation — INV-01 à 03) ; **Rejoindre** une entreprise déjà inscrite (demande au propriétaire, acceptée ou refusée depuis Équipe).
- **10g Mon compte** (`/pro/compte`, ancres `#profil`, `#telephone`, `#securite`, `#appareils`, `#notifications`, `#donnees`) : nom, changement d'email (lien à la nouvelle adresse, alerte masquée à l'ancienne), mobile ; mot de passe (alerte de sécurité par email) ; Google lié ou délié ; **double authentification par application** (QR code, clé, lien direct sur téléphone ; retrait avec mot de passe + code) et emails `2fa-activee` / `2fa-desactivee` ; **SMS (vérification du mobile, SMS de secours) prêts mais cachés** tant que le flag `deuxFacteursSms` est coupé ; « Tout déconnecter » (jetons révoqués partout) ; notifications par catégorie et canal (enregistrées aussitôt, consentements journalisés) et par entreprise (nouvelles demandes, avis, factures) ; export des données et suppression (bloquée pour le dernier propriétaire). Firebase Auth fait foi : `users/{uid}` (email, `mfaActive`, méthodes, téléphone vérifié) est recopié à chaque ouverture de la page.
- **10h Application pro (PWA)** : manifest `/pro/manifest.webmanifest` (« Portail Habitat Pro », autonome, raccourcis), icônes 192 / 512 / maskable / Apple générées à la compilation, service worker `/pro/sw.js` (pages de l'espace gardées pour le **mode hors ligne**, page « Vous êtes hors ligne » sinon, pages effacées à la déconnexion), invitation à installer **dès la 2e visite** (bouton du navigateur, ou guide « Partager → Sur l'écran d'accueil » sur Safari iOS ; « Plus tard » retenu), bouton **Se déconnecter** (manquait dans l'espace pro). **Notifications push prêtes mais coupées** : flag `notificationsPush` + clé `NEXT_PUBLIC_FIREBASE_VAPID_KEY` ; activées par la personne depuis Mon compte (jamais au chargement), puis toute notification in-app (nouvelle demande, message, avis) part aussi en push ; jetons périmés oubliés ; désabonnement à la déconnexion.
- **Tests de bout en bout sur émulateurs** (`pnpm e2e:pro`, job CI dédié) : vraie connexion, vraies règles, comptes du seed. Sous émulateur, les envois d'emails sont capturés (`capturesEmulateur`, jamais en ligne) pour lire les liens secrets.

**À signaler**
1. **Dépendances ajoutées** : `firebase` (SDK client, chargé à la demande dans l'espace pro seulement) et `@phosphor-icons/react` dans le site.
2. **Modèle de données** : `brouillonsOnboarding.jetonHash` (empreinte du lien de reprise) ; collection `capturesEmulateur` (émulateur uniquement, refusée par les règles).
3. **Écarts avec la maquette et ACCEPTANCE** : email demandé dès l'étape 1 (nécessaire au lien de reprise) ; SIREN demandé à l'étape 3 ; rayon en choix 30/50/100 km sans carte ; tableau de bord : « Devis envoyés » et « Chantiers signés » remplacés par « Taux de réponse » et « Fiche complétée » (données inexistantes), pas encore de liste « Demandes récentes » sur le tableau de bord (le bouton mène à Mes demandes) ; encart Premium sans « 24 h d'avance » (non décidé).
4. **Complétude de la fiche : pondération proposée, à valider** — métiers et zone 20, téléphone vérifié 15, présentation ≥ 60 caractères 20, logo 10, 3 photos 20, certifications 15. Seuil de mise en ligne : 60 % (EMAILS `bienvenue-pro`).
5. **Double authentification** : nécessite **Identity Platform** activé sur le projet Firebase (TOTP gratuit ; SMS facturés, d'où le flag).
6. PRO-04 à 06 (débloquer, paiement) passent au lot 11 (Stripe). D45 (contraste) toujours à valider.
7. **Corrections de fond** : cookies `Secure` refusés par WebKit sur `http://localhost` (émulateur seulement) ; configuration Firebase du navigateur lisible après navigation côté client.
8. **Mes demandes** : l'onglet « Appels d'offres » de la maquette arrive avec les appels d'offres (lot 12) ; l'écriture au particulier passe pour l'instant par email / téléphone (messagerie intégrée avec le devis) ; le routage des collaborateurs par métier attend la correspondance prestation → métier du matching (lot 12) ; refuser ne demande pas encore de motif.
9. **Espace pro, suite** : les statistiques quotidiennes (`statsJour`) ne sont pas encore alimentées (suivi des vues au lot 13c ; le seed en contient pour la démonstration) ; « Demander un avis » donne le lien de `/avis`, sans présélection de l'entreprise ; le nom commercial et les métiers ne se modifient pas encore depuis Ma fiche ; **contradiction à trancher** : COMPTES §3 met la fiche en ligne dès que le Kbis (ou SIREN vérifié) et la décennale sont envoyés, alors qu'EMAILS `bienvenue-pro` annonce 3 étapes (téléphone, décennale, fiche à 60 %). Le tableau de bord suit EMAILS ; la mise en ligne suivra COMPTES (prime sur les autres documents).
10. **Documents** : le refus d'un document par un modérateur (retrait de la fiche + email `document-refuse`) arrive avec le back-office (lot 13) ; les photos ne sont pas encore débarrassées de leurs données EXIF (Function prévue par storage.rules) ; les règles Storage qui vérifient l'appartenance en base échouent sur **ce** poste (émulateur local, déjà le cas avant ce lot), elles passent en CI.
11. **Équipe** : « Ajouter un siège » mène à la facturation (achat de sièges au lot 11) ; la **revendication** d'une fiche sans propriétaire passe par le support (vérification par un modérateur au lot 13) ; le transfert de propriété et le plafond de crédits par membre (services prêts) n'ont pas encore d'écran ; EQU-05 (accès coupé immédiatement) est couvert par les tests de service du lot 4.
12. **Contrôle MOB-01 renforcé** : il compare désormais la largeur de la page à celle de l'appareil (un navigateur mobile dézoome une page trop large, ce qui masquait le défaut). Il a révélé un débordement de l'en-tête de Ma fiche, corrigé.
13. SIM-06f (simulateur) échoue parfois sous forte charge locale (30 s), passe isolé ; à surveiller en CI.
14. **Mon compte — dépendance ajoutée** : `uqr` (QR code, sans dépendance, ~15 Ko) pour l'application d'authentification ; nouveau composant `Interrupteur` dans `@ph/ui` (Radix Switch, déjà présent).
15. **Mon compte — écarts avec la maquette** : la **liste des appareils** (« Safari sur iPhone · Mérignac ») demande un suivi des sessions qui n'existe pas dans DATABASE : seul l'appareil actuel est affiché, avec « Tout déconnecter » (y compris celui-ci) ; les notifications suivent le modèle de données (catégories `activite`, `relance`, `offres_pro`, `marketing` × canaux, plus `membres.notifs` pour l'entreprise) et non les 7 lignes de la maquette ; l'export est téléchargé tout de suite (JSON) au lieu d'une archive ZIP par email ; « Modifié il y a 4 mois » (mot de passe) n'est pas disponible dans Firebase.
16. **Mon compte — à savoir** : l'email « Ce n'était pas moi » renvoie vers l'aide (sujet « pro »), l'annulation d'un changement d'email en 7 jours et le blocage de 24 h (EMAILS) ne sont pas encore faits ; sans SMS, le mobile ne peut pas être « vérifié », donc les 15 points « téléphone vérifié » de la complétude restent inaccessibles tant que le flag SMS est coupé (**à trancher** : compter un mobile renseigné en attendant ?) ; l'application d'authentification (TOTP) n'est pas gérée par l'émulateur Firebase : l'activation complète se vérifie sur le projet de recette, une fois Identity Platform activé.
17. **Corrections** : un changement de mot de passe révoque les sessions en cours, la session est donc renouvelée avant tout autre appel ; la lecture des envois capturés (e2e) parcourt maintenant toutes les pages.
18. **PWA — pour activer le push en un clic** : dans la console Firebase, Cloud Messaging → « Certificats Web push » → générer la paire de clés ; mettre la clé publique dans `NEXT_PUBLIC_FIREBASE_VAPID_KEY` (et `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`), puis passer `notificationsPush` à vrai dans `config/flags`. Sur iPhone, le push ne marche que dans l'application installée (iOS 16.4+, D39).
19. **PWA — modèle de données** : nouvelle sous-collection `users/{uid}/appareilsPush/{empreinte}` (`jeton`, `appareil`, `majLe`), écrite par le serveur seulement (règles : tout refusé côté client, testé). **Écarts** : pas de file d'envoi rejouée hors ligne (aucun formulaire de l'espace n'en a encore besoin : le brouillon de devis arrive au lot 12) ; raccourci « Appels d'offres » ajouté avec la page (lot 12) ; le mode hors ligne est vérifié par un test unitaire du worker (Playwright ne coupe pas le réseau du service worker), l'enregistrement du worker par un test de bout en bout ; la réception réelle d'une notification (MOB-06) se vérifie sur le projet de recette avec la clé VAPID.

## 17. Lot 11 — Paiements Stripe (terminé le 30/09/2026)

**Fait**
- **Catalogue** (`@ph/core/facturation`) : Premium 99,90 € HT/mois ou 958,80 € HT/an payé en une fois, Visibilité 12,90 € HT/mois ou 79,90 € HT/an, siège 9 € HT/mois, packs 10/25/50 crédits (D24 à D29), en centimes ; TVA 20 % ; récapitulatif HT/TVA/TTC (en annuel, le total dû couvre 12 mois, ACQ-03).
- **Script** `pnpm stripe:produits` : crée les produits (`ph_premium`…) et les prix retrouvés par **clé de recherche** (`ph_premium_annuel`…), relançable sans doublon ; aucun identifiant de prix à copier ; clé live refusée sans `--live`.
- **Webhook** `/api/stripe/webhook` : signature vérifiée, **un seul effet par événement** (`stripeEvents`, PAY-02), erreur notée puis retraitée au renvoi de Stripe, événements dans le désordre ignorés. Seul endroit qui écrit `plan`, `planPeriode`, `optionVisibilite` (Premium l'inclut), `siegesMax` (3 + sièges achetés ; équipe suspendue ou réactivée en conséquence), avec **7 jours de grâce** après un échec de paiement. Miroirs `abonnements`, `factures`, `paiements` ; crédits inclus Premium remis à 5 à chaque facture payée (D27) ; pack de crédits crédité une fois (mouvement `achat_pack`).
- **Emails** (§4.6) : `abonnement-active`, `recu`, `paiement-echoue`, `renouvellement` (annuel, 7 jours avant), `abonnement-resilie`, `abonnement-termine`, `pack-achete`.
- **Pages de paiement** `/pro/abonnement/premium` et `/pro/abonnement/visibilite` (formule préremplie par `?facturation=`, liens de la landing mis à jour), **Stripe Checkout** (client Stripe créé au premier paiement, TVA automatique, numéro de TVA, codes promo saisis chez Stripe), page de retour qui **attend le webhook** (PAY-01), **Facturation** (abonnement en cours, sièges, factures téléchargeables, « Gérer mon abonnement » = portail client Stripe ; CON-02 conservé ; comptable en lecture).

**À signaler**
1. **Dépendance ajoutée** : `stripe` (SDK officiel, serveur et script seulement).
2. **Modèle de données** : `abonnements/{id}.evenementLe` (date de l'événement Stripe, pour ignorer un état plus ancien).
3. **Écart avec les maquettes** : le formulaire de carte des maquettes est remplacé par un bouton vers la page sécurisée Stripe (règle 7) ; le code promo s'y saisit.
4. **Non vérifiable ici, à faire en recette avec la clé de test** : redirection réelle vers Checkout, portail client, **Test Clocks** (renouvellement, échec, résiliation) ; le parcours est couvert avec des événements signés et un faux Stripe.
5. **Reste pour d'autres lots** : achat de packs et déblocage à l'unité (lot 12, avec les appels d'offres) ; remboursements et litiges (`charge.refunded`, `charge.dispute.created` : lots 12 et 13) ; codes promo personnels (lot 13b) ; relances J+3 et J+6 après échec et `moyen-paiement-expire` (envois différés) ; bandeau « paiement refusé » sur le tableau de bord (la page Facturation l'affiche déjà) ; achat de sièges supplémentaires depuis l'écran Équipe (possible via le portail client si la modification de quantité y est activée).
6. Décisions ⏳ appliquées en attendant : D19 (TVA 20 %, Stripe Tax), D26 (siège 9 €), D27 (5 crédits), D29 (packs), D32 (pas d'essai).

## 18. Lot 12 — Matching et appels d'offres (terminé le 02/10/2026)

**Fait**
- **Attribution des nouvelles demandes** (Function `attribuerNouvelleDemande`, rejouable) : modération avant tout matching (qualité < 30), candidats de la zone lus dans `artisansPublic` (géohash + métier) puis filtres durs et score du cœur, trace `matching/{demandeId}`. Aiguillage D41 : demande **garantie** exclusive au meilleur Premium qui a du quota (24 h pour accepter, 4 h si urgente), sinon **appel d'offres** anonymisé au prix du barème (D47), 3 places, invitations notifiées (Premium tout de suite, les autres **60 minutes plus tard**, D50).
- **Relances** (`matchingRelance`, toutes les 15 min) : propositions expirées, garantie refusée ou expirée → appel d'offres sans réinviter l'artisan, appel d'offres sans preneur à 48 h signalé une fois dans la file admin, appel d'offres échu clos.
- **Déblocage** en une transaction : place libre, fenêtre Premium, RGE si exigé, droit `leads.debloquer` et plafond mensuel du collaborateur, prix recalculé côté serveur, crédits inclus Premium puis crédits achetés, achat + déblocage + attribution acceptée avec coordonnées. Dix artisans sur la dernière place : un seul réussit, aucun débit en trop (PRO-06).
- **Carte et packs** : Stripe Checkout en paiement unique (prix du déblocage recalculé avant la session, montant encaissé conservé) ; le webhook finalise le déblocage ou crédite le pack ; plus de place entre le paiement et le webhook → tâche de remboursement pour l'équipe finance.
- **Écran `/pro/appels-d-offres`** (maquette « Appels d Offres ») : bandeau Premium, filtres par métier, cartes (réservé avec compte à rebours, ouvert, débloqué, complet), feuille de déblocage (crédits, sinon carte ou pack, PRO-05). Collaborateur sans droit de dépense : pas de bouton (PRO-04). Paiements derrière le flag `appelsOffresPayants` (coupé par défaut : la page s'affiche en consultation).
- **Scores de nuit** (`scoresNuit`, 3 h) : taux de réponse, médiane du temps de réponse, refus et charge récents, labels automatiques `rapide` et `recommande` ; recopiés sur l'entreprise seulement si une valeur change (chaque écriture relance la projection publique).

**À signaler**
1. **Modèle de données** : attribution `rang`, `expireLe`, `appelOffresId` ; demande `metierRequis`, `qualiteLead`, `moderation`, `appelOffresId` ; `appelsOffres.artisansInvites` (≤ 50) ; `achatsLeads.par` ; `artisans.attributions7j` et `tauxRefus30j` ; champs détaillés dans `artisanScores`. Nouveaux index : attributions (statut + expireLe, statut + reponduLe, proposeeLe en groupe), appels d'offres (statut + nbDeblocages + ouvertLe, statut + ouvertJusquau, artisansInvites + statut + ouvertLe).
2. **Décisions ⏳ appliquées en attendant** : D47 (barème) et D48 (paramètres du matching). D50 tranchée : 60 minutes d'avance Premium (la maquette affiche 24 h, texte adapté).
3. **Choix à valider** : pas de vagues supplémentaires pour une demande garantie (elle passe directement en appel d'offres) ; empreintes de conflit d'intérêts limitées aux contacts publics de l'artisan et à son SIREN ; double authentification exigée pour payer par carte ou acheter un pack (comme la facturation, CON-02), pas pour dépenser des crédits ; achat de pack réservé au droit `abonnement.gerer` (propriétaire, gérant).
4. **Reste pour d'autres lots** : contestation d'un déblocage par l'artisan et remboursement (écran admin, lot 13) ; onglet « Appels d'offres » dans Mes demandes (l'entrée du menu mène à la page) ; réponse écrite à un appel d'offres (`reponses`) avec le devis ; scores `tauxDevis`, `tauxConversion`, `tauxRemboursementLeads` quand ces données existeront.
5. **Non vérifiable ici** : redirection réelle vers Checkout pour une carte (même mécanique que les abonnements, à vérifier en recette avec la clé de test).

## 19. Lot 12b — Demandes partenaires (terminé le 02/10/2026)

**Fait**
- **Webhook** `importerDemandePartenaire` (Function HTTPS, contrat IMPORT_LEADS) : clé API (empreinte seule en base) et IP autorisées, quota du jour, corps de 32 Ko au plus, validation stricte, **idempotence** par `idExterne` y compris pour deux envois simultanés (IMP-01), consentement exact (version, texte, finalités) sinon rejet tracé **sans donnée personnelle** (IMP-02), téléphone français, zone couverte, doublons sur 30 jours, qualification **A/B/C**, estimation recalculée (surface fournie), preuve de consentement (IP et navigateur hachés), demande `source: 'partenaire'` sans compte particulier ; le matching démarre aussitôt.
- **SMS de confirmation** (votre choix) quand le partenaire n'a pas vérifié le téléphone : lien vers `/confirmer-telephone`, confirmation par un clic (les aperçus de liens ne confirment pas à la place de la personne), niveau relevé (B → A).
- **Matching** : RGE vérifié exigé si éligible aux aides, avec un domaine qui couvre la prestation (IMP-03) ; niveau C jamais en exclusive, prix × 0,4 / 0,7 / 1 selon le niveau et × 1,2 / 0,9 selon l'éligibilité (IMP-05) ; exclusive **non vue sous 2 h** réattribuée (ouvrir Mes demandes la marque vue) ; rayon de l'artisan respecté (filtres existants, IMP-06).
- **Invendues** : marquées à 24 h sans déblocage, archivées à 72 h (appel d'offres clos, jamais revendue). **Supervision** : alerte dans les journaux si une demande attend plus de 15 min.
- **Espace artisan** : niveau et « Aides estimées du client (… montant indicatif) » sur la carte de Mes demandes et dans l'email nouvelle-demande (IMP-06).
- **Script** `pnpm partenaire:source <fichier.json>` (exemple : `docs/data/source-partenaire.exemple.json`) : crée la source, affiche la clé API une seule fois.
- **Test de charge IMP-04** : 200 demandes importées puis proposées, chacune bien en dessous des 5 minutes.

**À signaler**
1. **Modèle de données** : `sourcesDemandes.departementsCouverts` et `versionConsentement` ; `importsDemandes.details` (chemins des champs en cause, jamais leur valeur) et `traiteLe` ; `demandes.partenaire.cleDoublon` et `jetonTelephoneHash` ; `demandes.invendueLe`, `archiveeLe` ; `attributions.expireLeSiVue`. Index : doublons (empreinte + date), quota (source + date), demandes en attente (statut + date). `notifier()` accepte un téléphone sans compte (SMS de confirmation).
2. **Choix à valider** : barème du score de qualification 0-100 (téléphone 35, propriétaire 25, bailleur 20, horizon jusqu'à 25, aides jusqu'à 15) ; « bailleur » compte comme propriétaire pour le niveau A ; horizon 3-6 mois → délai « 3 mois », plus de 6 mois → « je me renseigne » ; un RGE sans domaine déclaré est accepté (pas encore de table prestation → domaine RGE) ; pas de compte particulier créé pour une demande partenaire (pas d'email au particulier, seulement le SMS si besoin).
3. **À fournir avant la mise en ligne** (IMPORT_LEADS §5) : IP de sortie du partenaire, table de correspondance de ses types de travaux, texte exact et version de la case de consentement, quota et zone couverte ; clé Brevo pour l'envoi réel des SMS (docs/CLES.md).
4. **Reste pour d'autres lots** : écrans admin (sources, journal des imports et rejets, rentabilité par métier et zone) au lot 13 ; offre de la demande invendue aux artisans Gratuit contre l'activation de Visibilité au lot 13b.

## 20. Lot 13 — Back-office (fait le 04/10/2026, points à confirmer ci-dessous)

Découpage validé le 02/10/2026 : 13a socle, 13b tableau de bord et file, 13c artisans, 13d demandes et appels d'offres (dont sources partenaires), 13e avis, litiges, finances, 13f référentiels et réglages, 13g équipe, audit, RGPD. Conversion, comportement et IA : lots 13b/13c du plan général.

**Fait (13a et Artisans)**
- **Connexion admin** `/connexion?espace=admin` : session de **8 h** au plus, déconnexion après **30 min d'inactivité** (vérifiée par le serveur à chaque page, `admins/{uid}.dernierAcces`, et dans le navigateur), **double authentification obligatoire** (sinon seule la page d'activation est accessible), compte artisan refusé.
- **Coque** d'après la maquette : menu à icônes filtré par les permissions, repliable à 72 px (mémorisé), menu plein écran sur mobile ; section hors permissions → **403** (`forbidden()`).
- **Enveloppe `actionAdmin`** : permission relue dans `admins/{uid}`, double authentification, audit, refus pendant une impersonation ; audit détaillé (avant, après, motif) écrit dans la transaction de chaque action.
- **Données personnelles masquées**, « Afficher » journalisé (liste fermée de champs), rien pour le rôle lecture (ADM-02) ; **motif + confirmation** pour les actions sensibles (ADM-03) ; **« Voir en tant que »** réservé au superadmin, journalisé, lecture seule avec **bandeau rouge** (ADM-04).
- **Artisans** : liste (filtres, recherche), fiche (identité, abonnement, activité, sanctions, notes), vérifier, suspendre / lever (fiche retirée de l'annuaire), créditer (5 au plus sans permission illimitée).
- **Artisans, suite** (13c) : onglet Documents (aperçu journalisé, valider avec date de fin ou refuser avec motif ; label vérifié décennale, RGE ou Qualibat sur la fiche ; artisan prévenu par email ; chaque dépôt crée sa tâche dans la file), onglet Équipe (membres, sièges), notes internes. **Reste** : création d'une entreprise non revendiquée, transfert de propriété assisté, suppression définitive (avec double confirmation), recalcul forcé de la fiche publique.
- **Tableau de bord** (13b) : demandes 30 jours et du jour, demandes par jour sur 14 jours, artisans en ligne, appels d'offres sans preneur, chiffre d'affaires HT (rôles finances seulement), urgences par type, santé (webhooks Stripe, envois) ; compteurs par agrégations Firestore.
- **File de travail** (13b) : tâches filtrées par permission, priorité puis ancienneté, SLA vert / orange / rouge, prendre, rendre, clore avec résolution journalisée, lien vers l'élément.
- **Comptes de test** par rôle dans le seed ; **script** `pnpm admin:creer <email> "<Prénom Nom>"` pour le premier superadmin (lien pour choisir le mot de passe).
- **Demandes** (13d, 04/10/2026) : liste filtrée et recherche par référence, fiche avec contact masqué et **trace de l'algorithme** (candidats retenus, écartés, exclus avec la raison), artisans sollicités ; marquer comme spam, annuler, relancer l'algorithme (nouvelle demande : nouveau calcul ; demande garantie sans réponse : appel d'offres), proposer à un artisan choisi.
- **Appels d'offres et prix** (13d) : liste (prix, mode, déblocages, qualité, ancienneté) ; **éditeur de prix** : détail du calcul automatique, prix manuel dans les bornes et **30 € HT au plus sans `leads.prix_illimite`**, gratuit, retour au calcul, promo (au plus tard à la clôture), déblocages maximum et accès ; historique des prix (`historiquePrix`) et audit.
- **Barèmes** (13d, **ADM-05**) : édition des prix de base par métier, coefficients budget et urgence, remise Premium, valeur du crédit, plancher et plafond ; **simulation sur les 50 derniers leads** obligatoire avant publication ; versions `grillesTarifaires/gironde-2026-vN` (une seule active), lues par l'algorithme pour les nouveaux appels d'offres.
- **Contestations** (13d) : l'artisan conteste depuis Mes demandes (7 jours, une fois par achat ; « hors zone » refusé d'office dans son rayon) ; l'équipe rembourse en crédits, sur la carte (Stripe) ou refuse avec motif ; artisan prévenu ; au-delà de 3 contestations acceptées, la demande est marquée douteuse.
- **Sources partenaires** (13d, **IMP-02**) : sources avec les imports des 7 derniers jours (créées, doublons, rejetées), journal des imports avec le motif de rejet et le champ en cause (jamais de donnée personnelle), couper ou rouvrir une source (`matching.config`). La création et les clés restent faites par script (`pnpm partenaire:source`).
- **Reste en 13d** : onglet « Facebook et invendues » (il dépend du moteur de conversion, lot 13b du plan). **Packs de crédits** : ils restent fixés par le catalogue et le script Stripe (D29, 10/25/50) ; un écran d'édition demanderait de créer des prix Stripe depuis l'admin, à décider.

- **Avis** (13e) : file d'après la maquette (en attente, risque élevé, publiés), **score de risque** (auteur lié à l'entreprise 40, même IP 30, texte proche 25, compte de moins de 48 h 20, sans preuve 10) ; publier (note de l'entreprise recalculée), refuser avec un motif prédéfini envoyé à l'auteur, demander une preuve, suspendre, supprimer définitivement ; jamais de modification du texte. Chaque nouvel avis crée sa tâche dans la file.
- **Litiges** (13e) : fil d'échanges, message du médiateur aux deux parties, clôture (résolu ou clos sans suite) avec rappel ou avertissement éventuel à l'artisan.
- **Finances** (13e) : MRR, abonnés et part en annuel, appels d'offres du mois, factures, codes promo (lecture), remboursements ; **export CSV mensuel** journalisé (date, pièce, client, HT, TVA, TTC, moyen).

- **Algorithme** (13f) : poids (en %, total 100), seuils et options ; **bac à sable** qui rejoue une demande passée et compare rangs et scores sans rien écrire ; publication versionnée lue par les Functions du matching.
- **Référentiels** (13f) : prix privés de chaque prestation (chaque nombre du barème, nouvelle version, ancienne archivée), retrait ou remise en ligne d'une prestation ; **fonctionnalités** (feature flags) activables avec motif.
- **Contenus** (13f) : annonces in-app (public, ton, période) affichées en haut des espaces artisan et particulier.

- **Équipe et audit** (13g) : membres, invitation (lien pour choisir le mot de passe, double authentification à la première connexion), changement de rôle, désactivation (sessions coupées) ; jamais soi-même ni le dernier superadmin ; journal d'audit filtrable (action, acteur, cible) et exportable.
- **RGPD** (13g) : demandes enregistrées avec l'échéance d'un mois, export des données, anonymisation d'un compte particulier, constat pour les autres cas ; preuve archivée et téléchargeable, consultation journalisée.
- **Tests** : 24 scénarios sur émulateur (`tests/admin.test.ts`) et un test de bout en bout par écran (`e2e-pro/admin*.spec.ts`), tous verts ; CI verte.
- **Reste du lot 13** : sections Conversion, Comportement et Assistant IA (lots 13b et 13c du plan général) ; onglet « Facebook et invendues » ; métiers, labels et pages communes ; création d'entreprise non revendiquée, transfert de propriété assisté, suppression définitive d'une entreprise, recalcul forcé de la fiche publique.

**À signaler**
1. **ADM-01** dit « le modérateur ne voit que Projets et Avis » ; la maquette et les permissions du lot 2 lui donnent aussi la file de travail, les artisans, les demandes, les appels d'offres et les litiges. J'ai suivi la maquette (le test vérifie qu'il ne voit ni les finances, ni l'équipe, ni le RGPD, ni l'algorithme, et que ces adresses renvoient une 403). À confirmer.
2. **Tests** : les émulateurs n'ont pas d'application d'authentification ; `ADMIN_MFA=desactive` coupe l'exigence pour les tests de bout en bout seulement (refusé en production). La vraie double authentification se vérifie en recette.
3. **Invitations admin** : pas de limite de domaine pour l'instant (votre choix).
4. **Modèle** : `admins/{uid}.dernierAcces` utilisé pour l'inactivité ; jeton d'impersonation avec le claim `imp` ; `filesModeration.resolution`, `traiteePar`, `traiteeLe` ; index factures et emails (statut + date).
5. **Permissions modifiées** : le modérateur reçoit en plus `artisans.verifier`, `leads.lire`, `leads.rembourser`, `litiges.traiter` (comme la maquette). **Priorités** des tâches réalignées sur la maquette (5 = la plus urgente) et deux permissions inexistantes corrigées dans les tâches créées par le matching.
6. **Permissions choisies (13d), à confirmer** : promo avec `leads.prix` ; déblocages maximum et accès avec `leads.publier` ; simuler un barème avec `leads.prix`, le **publier avec `leads.prix_illimite`** (admin et superadmin) ; rembourser sur la carte avec `finances.rembourser_carte` (admin et superadmin).
7. **Barèmes** : les paliers de qualité, de concurrence, de niveau et d'aides restent modifiables seulement par script pour l'instant (pas dans l'écran) ; les métiers s'affichent par leur identifiant.
9. **Points 13e à trancher** : (a) l'ouverture d'un litige par le particulier ou l'artisan n'existe pas encore (seul l'admin les traite) ; (b) codes promo en lecture seule : leur création se fait dans Stripe, à brancher si vous le souhaitez ; (c) l'export comptable lit Firestore : les factures d'abonnement, les déblocages par carte et les packs (prix du catalogue D29) ; les **avoirs** (remboursements) n'y figurent pas encore et Stripe reste la référence comptable ; (d) poids du score de risque des avis choisis par moi ; (e) trois nouveaux modèles d'email en squelette : `avis-preuve-demandee`, `litige-message`, `litige-decision`.
11. **Points 13g** : l'export RGPD et la réponse à la personne s'envoient à la main (le fichier est téléchargé depuis l'admin) ; un modèle d'email dédié reste à écrire ; nouveau modèle « invitation-equipe-admin » en squelette.
10. **Points 13f** : les métiers, labels et pages communes ne sont pas encore éditables depuis l'admin (le matching et le SEO en dépendent, à faire avec précaution) ; `config/app` n'est lu par aucun code, je ne l'ai donc pas exposé (les fonctionnalités passent par `config/flags`) ; modèle : `matchingConfig` reçoit `options` et `motif`, `referentiel/prestations/prix/{id}/versions`.
8. **Modèle (13d)** : `grilleTarifaire` reçoit `prixBaseDefaut` et `seuilsConcurrence` ; `remboursementLead` reçoit `appelOffresId`, `demandeId`, `motifDecision` (identifiant = celui de l'achat) ; `demande` reçoit `contestationsAcceptees` et `douteux` ; index `demandes` et `appelsOffres` (statut + date décroissante) ; client Stripe : `refunds.create` (remboursement intégral du paiement, clé d'idempotence).

## 21. Lot 13b — Conversion et séquences (en grande partie fait le 05/10/2026)

**Fait**
- **Cœur** (`@ph/core/conversion`) : score, offre cible, étape, groupe témoin, pression et créneaux, séquences par défaut (S1, S4 à S9), chiffres obligatoires par modèle, position dans le secteur, signaux (concurrent passé devant, crédits achetés, demandes exclusives manquées, garantie Premium tenue), remises et codes personnels, demandes offertes, libellés.
- **Moteur** : `cycleCalculer` (5 h : vues, position, dépense 30 jours, étape, séquence, signaux), `cyclePlanifier` (7 h et 18 h 15 : signaux d'abord, puis séquences), `cycleHebdo` (lundi : `prem-demandes-manquees`), `cycleCodesExpires` (chaque heure), `cycleDemandesInvendues` (chaque heure). Chaque décision est tracée, y compris les non-envois et leur raison.
- **22 emails de conversion rédigés** (catégorie `offres_pro`), avec les vrais chiffres ; sans chiffre, l'email ne part pas.
- **Codes promo personnels** (CONV-01, 02) : réservés à l'envoi, créés chez Stripe au premier clic (usage unique, réservés au client, date de fin réelle), appliqués sans saisie par le lien ; le paiement les marque utilisés, recalcule l'étape tout de suite (plus aucune offre ensuite) et trace la conversion. Le rappel J+17 ne part que si l'offre a été ouverte.
- **Demandes invendues offertes** (CONV-07) : 24 h sans déblocage → 5 artisans Gratuit du secteur ; les 3 premiers qui activent Visibilité la reçoivent débloquée ; une fois par entreprise.
- **Tâches d'appel automatiques** : activation (J+10, score ≥ 40), appel commercial (J+7, score ≥ seuil réglable), risque de résiliation (14 jours sans activité du propriétaire, lue sur `membres.derniereActivite`) ; séquence en pause tant que la tâche est ouverte.
- **Mise en veille** : chaque email offres_pro remis compte comme non ouvert jusqu'à son ouverture (webhook Resend) ; après N d'affilée (réglage), plus d'email commercial ; une ouverture ou un clic remet à zéro. Champ ajouté : `emails.compteNonOuvert`.
- **Statistiques** : `cycleAgreger` (1 h 30) écrit `cycleStats/{jour}` (étapes, envois, ouvertures, clics, conversions et revenu par modèle, témoin) ; chaque conversion est attribuée au dernier email planifié dans les 7 jours, avec le montant réellement payé (remise déduite, prix du catalogue HT). La vue d'ensemble lit ces agrégats.
- **Prospects** (validé le 05/10/2026) : sur `/pro`, « Pas encore prêt ? Recevez cette estimation par email » (texte d'usage de l'adresse à côté du bouton) ; un prospect par adresse, jamais si l'adresse a déjà un compte (même réponse dans tous les cas) ; `prospect-estimation` part tout de suite (demandes estimées comme sur la page, inscrits à 20 km, budget moyen des vraies demandes du département sur 90 jours, absent sinon) ; l'inscription arrête la séquence. Conservation 3 ans. Suite (`cycleProspects`, 7 h 05) : une vraie demande du métier à moins de 15 km arrivée la veille (de J+1 à J+30, une par semaine), « dernière » signée à J+12, résumé de la zone le 1er du mois pendant 6 mois (à partir de J+20) ; un email par jour au plus, sans chiffre rien ne part. Index ajouté : demandes (métier + date).
- **Écran `/admin/conversion`** : vue d'ensemble, séquences (créer, modifier, dupliquer, pause, supprimer avec devenir des entreprises, versions et audit), journal filtré, fiche cycle (pause, exclusion, étape forcée), tâches, réglages.

**À trancher ou signaler**
1. **D32c (⏳) remises** : valeurs codées par défaut (−30 % sur 12 mois, 72 h, 7 j en reconquête, une remise tous les 90 jours). La relance `vis-offre-relance` passe de J+90 à **J+104** (validé le 05/10/2026) pour respecter la règle des 90 jours.
2. **D32d (⏳) catégorie offres_pro** et **D32e (⏳) relances signées Julie** : en place, à valider juridiquement.
3. **Choix faits par moi** : valeur d'un crédit dans les emails = 10 € (« 5 crédits (50 €) ») ; budget d'une demande manquée = milieu de la fourchette ; distance minimale affichée 1 km ; délai d'activation d'une demande offerte 48 h.
4. **Modèle de données** : `codesPromo.stripePromotionCodeId` devient facultatif ; `cycleEtat` reçoit `codeActif`, `demandeOfferte`, `demandeOfferteRecue`, `derniersSignaux`, `signal`, `signaux.montantAchete30j` ; `appelsOffres` reçoit `offerteLe`, `offerteA` ; `emails` reçoit `ouvertLe`, `cliqueLe` ; nouveau moyen de déblocage `offerte_conversion` ; abonnement Stripe : métadonnée `codePromo` ; index ajoutés (attributions exclusives, codes, artisans par métier et plan, traces par séquence, témoin, tâches). La liste des délais souhaités est passée dans `@ph/core/demandes`.
5. **Reste à faire** : `prospect-temoignage` (J+5) attend un vrai délai de première demande par métier  ; réponses aux emails (Resend Inbound, tâches `reponse_commerciale`) ; `vis-recherches-manquees` (attend le comptage des recherches du lot 13c) ; `prem-appel-offres-complet`, `prem-renouvellement`, compteur d'échéances pour `passage-annuel` ; écran de résiliation (S8) ; publication Facebook (CONV-08) ; bascule automatique des tests A/B ; journal en temps réel (aujourd'hui rechargé à l'ouverture).

## 2. Incohérences et zones floues

**Toutes tranchées le 27/09/2026** : propositions retenues et documents corrigés (DECISIONS D5, D6, D8, D15, D17 passées en ✅ ; nouvelles décisions D40 à D43). Détail conservé ci-dessous pour mémoire.

1. **Deux fichiers de suivi.** CLAUDE.md, PLAN_DEV §2 et README citent `PROGRESSION.md` ; CLAUDE.md (« Où trouver quoi »), ARCHITECTURE §13 et les commandes `/nouveau-lot`, `/fin-lot`, `/reprise` citent `AVANCEMENT.md`.
   → *Proposition* : `AVANCEMENT.md` = suivi détaillé (ce fichier), `PROGRESSION.md` = tableau de statut court ; les deux mis à jour par `/fin-lot`. Ou fusionner dans `AVANCEMENT.md` et supprimer `PROGRESSION.md` (plus simple).
2. **Routes divergentes entre README/ACCEPTANCE et PLAN_DEV §4.**
   | Écran | README / ACCEPTANCE / INTEGRATIONS | PLAN_DEV §4 / CONVERSION |
   |---|---|---|
   | Diagnostic | `/diagnostic-immobilier`, `/estimation`, `/[commune]` | `/diagnostic`, `/diagnostic/[commune]` |
   | Connexion | `/pro/connexion` | `/connexion` |
   | Avis | `/avis` | `/avis/[jeton]` |
   | Paiement | `/pro/abonnement/premium` et `/visibilite` | `/pro/paiement?offre=&facturation=&code=` |
   → *Proposition* : garder les routes de README (plus SEO pour `/diagnostic-immobilier/...`, déjà dans ACCEPTANCE) ; `/avis` avec `?jeton=` facultatif ; `/connexion` unique pour tous les publics avec redirection `/pro/connexion` → `/connexion?espace=pro` ; paiement : `/pro/abonnement/[offre]?facturation=&code=`. Mettre PLAN_DEV §4 et CONVERSION à jour en conséquence.
3. **Emplacement du code : `lib/…` vs `packages/…`.** CLAUDE.md (règle 2 : `lib/schemas`), README, COMPTES §6.1, DATABASE (`lib/simulateur/formules.ts`), EMAILS et INTEGRATIONS parlent de `lib/` ; ARCHITECTURE et les prompts des lots 1-3 imposent `packages/core/*`.
   → *Proposition* : ARCHITECTURE fait foi ; `lib/schemas` = `packages/core/schemas`, `lib/simulateur` = `packages/core/simulateur`, `lib/notifications/notifier.ts` = `apps/functions/src/notifications/notifier.ts` (ou `packages/firebase` côté serveur). Corriger CLAUDE.md et les autres documents.
4. **Packs de crédits.** DECISIONS D29 : packs de 10, 25 et 50 crédits ; INTEGRATIONS §1 : `price_pack_5`, `price_pack_10`, `price_pack_25`.
   → *Proposition* : D29 fait foi (10/25/50) ; les identifiants Stripe deviennent `price_pack_10/25/50`, et les packs restent pilotés par `packsCredits`.
5. **Variables Stripe incomplètes.** INTEGRATIONS §8 n'a qu'un `STRIPE_PRICE_VISIBILITE` alors qu'il y a deux prix (annuel, mensuel) ; rien pour le siège supplémentaire (D26, quantité `seat`) ni pour les packs.
   → *Proposition* : `STRIPE_PRICE_VISIBILITE_ANNUEL`, `STRIPE_PRICE_VISIBILITE_MENSUEL`, `STRIPE_PRICE_SIEGE`, `STRIPE_PRICE_PACK_10/25/50` (ou lecture par `lookup_key` Stripe, sans variables : plus robuste, créé par le script idempotent du lot 11).
6. **Code promo.** INTEGRATIONS §1 : « −30 % sur le premier mois » (coupon `duration: once`) ; D32c/CONVERSION : codes personnels −30 % max, 1 fois / 90 j, expiration réelle. Un −30 % « premier mois » n'a pas de sens sur un annuel payé en une fois.
   → *Proposition* : −30 % appliqué à la première facture (mensuelle ou annuelle), codes personnels selon D32c ; supprimer la mention générique d'INTEGRATIONS.
7. **Fournisseur SMS.** D2 : Brevo ; EMAILS §1 : « Brevo SMS ou Twilio » ; variables génériques `SMS_API_KEY`.
   → *Proposition* : Brevo seul, derrière une interface `EnvoiSms` pour pouvoir changer ; variable `BREVO_API_KEY`.
8. **BigQuery.** README décrit COMPORTEMENT comme « chaîne BigQuery » et IA_ADMIN §3 lit « Firestore + BigQuery », alors que COMPORTEMENT §3 et COUTS excluent BigQuery au lancement.
   → *Proposition* : pas de BigQuery au lancement ; `construireContexte` lit les agrégats Firestore (`cumuls 7/30/90 j`). Corriger README et IA_ADMIN.
9. **Tailwind 4 et « preset ».** D37 : Tailwind 4 + preset ; Tailwind 4 se configure en CSS (`@theme`), la notion de preset JS est héritée de la v3.
   → *Proposition* : le script de tokens génère `themes.css` + un fichier `@theme` partagé (`packages/config/tailwind/theme.css`) importé par le site et Storybook ; pas de `tailwind.config.js`.
10. **Nombre de prompts.** README annonce « les 13 prompts » ; il y a 18 lots (0 à 14, plus 12b, 13b, 13c). → corriger README.
11. **Route admin des appels d'offres.** ADMIN §2.5 : `/admin/leads` (le mot « lead » apparaît dans l'URL, visible par l'équipe) ; maquette `Admin Appels d offres`.
    → *Proposition* : `/admin/appels-d-offres` (règle de vocabulaire D34b).
12. **Case « jusqu'à 3 artisans ».** DATABASE §4 `miseEnRelation` : « case jusqu'à 3 artisans » ; MATCHING (en tête) dit que ce « 3 artisans par demande » est remplacé (demande garantie Premium = 1 artisan ; appels d'offres = 3 réponses max).
    → *Proposition* : renommer le libellé de la case (« Être mis en relation avec des artisans ») et documenter dans DATABASE quel canal il déclenche. **À trancher par vous** : une demande du site qui n'est pas une demande garantie Premium devient-elle automatiquement un appel d'offres ?
13. **Rayons.** Annuaire : filtre 5–60 km ; transmission des demandes : 10–100 km (D31c). Cohérent en soi, mais l'annuaire filtre-t-il sur la distance au client ou sur le rayon d'intervention déclaré par l'artisan ?
    → *Proposition* : distance au client ≤ filtre ET client dans le rayon déclaré de l'artisan.
14. **Branches.** CLAUDE.md : une branche `lot-XX-nom` par lot ; la session actuelle impose `claude/relaxed-meitner-lxsu0r`.
    → *Proposition* : en session web, travailler sur la branche imposée ; sinon `lot-XX-nom`. Merci de confirmer.
15. **Composants du lot 1.** Le prompt du lot 1 et ARCHITECTURE §5.3 citent Chip, Combobox, Toast… ; MOBILE ajoute Sheet, BottomNav, StickyActionBar. Aucun écart, mais le lot 1 est très gros (monorepo + ~22 composants + Storybook + CI + Lighthouse + Playwright + Sentry).
    → *Proposition* : le découper en 1a (monorepo, config, CI, émulateurs, `core/format`, enveloppes) et 1b (tokens, composants, Storybook, layouts, pages d'erreur).
16. **Données de départ.** Les chiffres annoncés concordent avec `docs/data/` (9 + 103 prestations, 15 familles, 137 intentions, 60 métiers, 11 communes). Aucun écart constaté.

## 3. Lignes ⏳ de DECISIONS.md qui bloquent les premiers lots

| Décision | Proposition | Lot touché | Pourquoi c'est bloquant |
|---|---|---|---|
| D5 Hébergement | Vercel `cdg1` | 1 | config Next.js (runtime, `output`), CI de prévisualisation |
| D6 Suivi des erreurs | Sentry UE | 1 | intégration site + Functions au lot 1 |
| D8 Feature flags | Remote Config + surcharge Firestore | 1-2 | `packages/core/flags.ts`, `config/flags` et règles au lot 2 |
| D15 Projets Firebase | `portail-habitat-dev/-staging/-prod` | 1-2 | `.firebaserc`, garde-fou du seed (émulateur ou staging) |
| D17 Dépôt Git | GitHub privé, `main` protégée, CI obligatoire | 1 | configuration de la CI et des branches |
| D9 Antivirus | extension « Scan files » | 2 | champ de statut de scan et règles Storage des documents |
| D26 Sièges | 3 inclus, +9 € HT | 2-4 | valeur par défaut de `siegesMax`, tests des invitations |
| D27 / D28 Crédits | 5 / mois, 10 € HT l'unité | 2-3 | portefeuilles et `packages/core/leads/prix` |
| D1 Emails | Resend | 4-5 | branchement des emails Auth (lot 4) et `notifier()` (lot 5) |
| D14 Sous-domaines | tout sur le domaine, emails `notifications.` | 5 | expéditeurs et DNS Resend |

Non bloquants avant le lot 5 : D2, D3, D4 (lot 7), D7, D19, D21, D23, D29, D32, D32c-e. Les 🔒 (D13, D18, D20, D22) ne bloquent que la mise en ligne.

## 4. Variables d'environnement et comptes externes

**Comptes à créer (MISE_EN_PROD étape 1)** : GitHub · Firebase Blaze (3 projets) · Vercel · Stripe (test) · Resend (domaine vérifié) · Brevo (SMS, expéditeur `PortailHab`) · Typesense Cloud UE · clé API Sirene INSEE · Sentry UE · Anthropic · registrar du domaine. Pour le lot 1, seuls **GitHub, Firebase (dev) et Sentry** sont nécessaires ; tout le reste fonctionne sur émulateurs et captures locales jusqu'aux lots concernés.

| Service | Variables | Lot |
|---|---|---|
| Firebase (client) | `NEXT_PUBLIC_FIREBASE_API_KEY`, `_AUTH_DOMAIN`, `_PROJECT_ID`, `_STORAGE_BUCKET`, `_APP_ID`, `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` (App Check) | 1 |
| Firebase (admin) | `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY` | 1 |
| Site | `NEXT_PUBLIC_SITE_URL` | 1 |
| Sentry | `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` (+ `SENTRY_AUTH_TOKEN` pour les sourcemaps en CI, absent des docs) | 1 |
| INSEE | `INSEE_API_KEY` | 4 |
| Resend / emails | `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `EMAIL_FROM`, `EMAIL_FROM_PRO`, `EMAIL_FROM_HUMAIN`, `EMAIL_REPLY_TO`, `EMAIL_REPLY_TO_COMMERCIAL`, `EMAIL_CAPTURE`, `EMAIL_WHITELIST`, `NOTIF_SIGNING_SECRET` | 5 |
| SMS (Brevo) | `SMS_API_KEY`, `SMS_SENDER` | 5 |
| Typesense | `TYPESENSE_HOST`, `TYPESENSE_ADMIN_KEY`, `NEXT_PUBLIC_TYPESENSE_SEARCH_KEY` | 7 |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_PREMIUM_MENSUEL`, `STRIPE_PRICE_PREMIUM_ANNUEL`, `STRIPE_PRICE_VISIBILITE` (à dédoubler, voir §2 n° 5) | 11 |
| Partenaires | `PARTENAIRE_API_KEYS` (Secret Manager) | 12b |
| Comportement | `REPLAYS_BUCKET`, `COMPORTEMENT_SALT_SECRET` (Secret Manager) | 13c |
| IA | `ANTHROPIC_API_KEY` (Secret Manager) | 13c |

Les clés passent uniquement par `.env.local` (non commité) et les secrets Vercel / Firebase, jamais par le chat.

## 5. Réponses du cadrage (27/09/2026)
1. Suivi : fusion dans `AVANCEMENT.md` (D43).
2. Routes : proposition validée (D40).
3. Une demande du site hors quota Premium garanti devient automatiquement un appel d'offres (D41, MATCHING, DATABASE §4).
4. Lot 1 découpé en 1a et 1b (D43, PROMPT_CLAUDE_CODE, PLAN_DEV §3).
5. D5, D6, D8, D15, D17 : propositions par défaut retenues.
6. Corrections documentaires appliquées (§2 n° 3 à 11). N° 13 (rayon de l'annuaire) : proposition retenue, à reporter dans MATCHING §4 au lot 9. N° 12 : libellé de la case corrigé dans DATABASE.

## Décisions prises en cours de route
(date, décision, document mis à jour)
- 05/10/2026 — Relance `vis-offre-relance` à J+104 ; formulaire de capture des prospects sur /pro (validés) — CONVERSION §3 S4, AVANCEMENT §21.
- 27/09/2026 — D47 barème des appels d'offres, D48 matching (propositions ⏳) — DECISIONS, docs/data ; STATS_DEMANDES §4 (emplacement des paramètres).
- 27/09/2026 — D44 versions du socle (Next.js 16, TypeScript 6, ESLint 9, Zod 4 en français) — DECISIONS, CLAUDE.md, README, PROMPT_CLAUDE_CODE. EXPLOITATION §5 : DEPLOIEMENT.md au lot 14.
- 27/09/2026 — D40 routes, D41 aiguillage des demandes, D42 emplacement du code et Tailwind 4, D43 suivi et découpage du lot 1 — DECISIONS, PLAN_DEV, README, ACCEPTANCE, INTEGRATIONS, CONVERSION, ADMIN, MATCHING, DATABASE, EMAILS, IA_ADMIN, COMPTES, ARCHITECTURE, PROMPT_CLAUDE_CODE, CLAUDE.md.

## Journal
- 27/09/2026 — Rangement du dépôt (`docs/`, `CLAUDE.md` et `.claude/` à la racine). Lot 0 : cadrage produit.
- 27/09/2026 — Réponses reçues, documents corrigés, lot 0 clos.
- 27/09/2026 — Lot 1a terminé (socle technique). Décision D44 : Next.js 16, TypeScript 6.
- 27/09/2026 — Lot 1b terminé (design system). Décisions D45 (contraste) et D46 (budget JS) proposées, à valider.
- 27/09/2026 — Lot 2 terminé (données et sécurité). Dix corrections de sécurité par rapport à DATABASE §12 (§8).
- 27/09/2026 — Lot 3 terminé (logique métier pure, 9 modules). Décisions D47 (barème) et D48 (matching) proposées, à valider.
- 27/09/2026 — Lot 4 terminé (comptes, équipes, session, seed). Nouveau statut de demande `appel_offres`, dépendance `tsx`.
- 28/09/2026 — Lot 5 terminé (emails, SMS, notifications). Parcours Playwright + Mailpit reportés aux lots 8 et 10.
- 28/09/2026 — Lot 6 terminé (pages publiques, SEO, cookies). Décision D49 proposée ; textes légaux et visuels à fournir.
- 28/09/2026 — Lot 7 terminé (recherche de projet). Typesense prêt mais inactif (D4 à valider, clés à fournir).
- 28/09/2026 — Lot 8 terminé (simulateur, reprise, diagnostic, avis, connexion particulier, Mon espace). Points à trancher : §14.
- 28/09/2026 — Lot 9 terminé (annuaire, fiche publique). Formule de pertinence à confirmer (§15).
- 02/10/2026 — Lot 12 terminé (matching, appels d'offres, déblocage, scores de nuit). D50 : 60 minutes d'avance Premium.
- 02/10/2026 — Lot 12b terminé (demandes partenaires : webhook, SMS de confirmation, matching A/B/C, invendues).
- 05/10/2026 — Lot 13b en grande partie fait (moteur de conversion, codes personnels, demandes offertes, écran admin). Restes et points à trancher : §21.
