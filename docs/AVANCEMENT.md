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
| 8 | Parcours particuliers | ⬜ | | SIM, ESP, DIA, AVI | |
| 9 | Annuaire, fiche publique | ⬜ | | ANN, FIC | |
| 10 | Espace artisan, équipes, PWA | ⬜ | | ACQ, ONB, PRO | |
| 11 | Stripe | ⬜ | | PAY | |
| 12 | Matching, appels d'offres | ⬜ | | unitaires + e2e | |
| 12b | Demandes partenaires | ⬜ | | IMP | |
| 13 | Back-office | ⬜ | | ADM | |
| 13b | Conversion, séquences | ⬜ | | CONV | |
| 13c | Comportement, IA | ⬜ | | CMP, IA, RED | |
| 14 | Qualité, préparation de la mise en production | ⬜ | | ERR, MISE_EN_PROD | |

### Lot en cours
- Lot : 8 (parcours particuliers et espace particulier)
- Dernier lot terminé : 7, le 28/09/2026 (détail §13)

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
