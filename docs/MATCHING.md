# Algorithme de mise en relation (matching)

> **État au 19/11/2026 (code, lots 12 et 12b, puis D54).** Le moteur est codé dans `packages/core/src/matching` (logique pure, testée) et `packages/firebase/src/serveur/matching` (Function `attribuerNouvelleDemande`, relances, déblocage). Ce qui a changé depuis la rédaction :
> - **Plus de demandes garanties Premium** (D31 modifiée, D54) : l'offre Premium n'existe plus, le quota mensuel de demandes n'est plus appliqué (`quotaDemandesMois` neutralisé à l'attribution).
> - **Demande laissée sur la fiche d'un artisan** : depuis le 01/11/2026, le formulaire « Demander un devis » de la fiche publique (et celui du site de l'artisan) crée une demande **attribuée directement** à cet artisan, **hors matching**, gratuite, coordonnées visibles (`creerDemandeDirecte`, `source: 'fiche_artisan'` ou site). Le §5 point 3 (« artisan ciblé en rang 1 ») ne s'applique plus à ces demandes.
> - **Autres demandes** (simulateur, recherche, partenaires) : `aiguiller` donne la demande **à l'artisan ciblé seul** s'il y en a un et qu'il est éligible (canal interne `garantie`, gratuit, quelle que soit sa formule) ; sinon **appel d'offres** (3 réponses maximum).
> - **Avance sur les appels d'offres** : **12 h** pour **Tout inclus** (`avanceAppelsOffresH`, PAIEMENTS §2, D57), et non plus 24 h ni 60 min. **Contradiction à signaler** : D83 (✅, 30/09/2026) fixe 60 minutes pour Premium ; le code applique 12 h (720 min) pour Tout inclus, conformément à PAIEMENTS (qui fait foi sur les offres).
> - Avantages du score : `bonusPremium` = Tout inclus, `bonusVisibilite` = toute formule avec Fiche Pro (Fiche Pro, Fiche + Site, Tout inclus) (D60).
> - **Déblocage payant fermé** : flag `appelsOffresPayants` coupé par défaut ; les appels d'offres se consultent sans pouvoir être achetés.
>
> Ancien texte : **Deux canaux** : (1) les **demandes garanties** de l'offre Premium (4 par mois) sont attribuées à **un seul artisan**, exclusif (un projet multi-métiers peut avoir un artisan par métier) ; (2) les **appels d'offres**, ouverts à toutes les formules, acceptent **3 réponses maximum**, avec 24 h d'avance pour Premium. Ceci remplace toute mention de « 3 artisans par demande » ailleurs dans ce document.
>
> **Filtre métier** : la demande porte `intention` et `prestation` (référentiel `referentiel/recherche`). Un artisan est éligible si `artisans.intentions` contient l'intention de la demande ; sinon, repli sur `artisans.metiers` contenant le métier de l'intention. Voir COMPTES.md §3.1 bis.

Objectif : pour chaque projet (demande de travaux ou dossier de diagnostic), proposer **les bons artisans**, c'est-à-dire compétents, disponibles, proches, fiables et réactifs. Il faut aussi **avantager le Premium sans exclure les autres** et **ne pas saturer** un même artisan.

Code : `packages/core/src/matching/` (TypeScript pur, **testé unitairement**, déterministe à configuration et données égales) et `packages/firebase/src/serveur/matching/` ; Functions dans `apps/functions`. Paramètres : `matchingConfig/actif`, modifiable dans l'admin (Algorithme : poids, seuils, options, bac à sable) et versionné. Valeurs par défaut : `CONFIG_MATCHING_DEFAUT` (`packages/core/src/matching/config.ts`). Compléments décidés : D80 (barème) et D81 (points non précisés).

---

## 1. Vue d'ensemble

```
Demande créée ─► [1] Normalisation ─► [2] Candidats (géo + métier) ─► [3] Filtres durs
      ─► [4] Score (0–100) ─► [5] Ajustement Premium / équité ─► [6] Sélection top N
      ─► [7] Écritures Firestore (transaction) ─► [8] Notifications
      ─► [9] Suivi & réattribution (planifié) ─► [10] Apprentissage (scores de nuit)
Si < N artisans acceptent ─► conversion en APPEL D'OFFRES payant (prix via barème)
```

Déclencheurs :
- `onDocumentCreated('demandes/{id}')` et `onDocumentCreated('dossiersDiag/{id}')`
- `matchingRelance` (planifiée toutes les 15 min) : attributions expirées, demandes sous-servies
- `adminRelancerMatching` (manuel)

---

## 2. Configuration `matchingConfig/actif`

```json
{
  "version": 7,
  "nbCibles": 3,
  "nbPropositionsInitiales": 3,
  "vagueSupplementaire": 2,
  "delaiAcceptationH": 24,
  "delaiAcceptationUrgentH": 4,
  "rayonMaxKm": 60,
  "poids": {
    "competence": 0.25, "distance": 0.20, "qualite": 0.20,
    "reactivite": 0.15, "disponibilite": 0.10, "adequationBudget": 0.05, "completude": 0.05
  },
  "bonusPremium": 12,
  "bonusVisibilite": 4,
  "quotaPremiumMax": 2,
  "garantirUnNonPremium": true,
  "penaliteSaturation": { "seuilDemandes7j": 8, "points": 10 },
  "penaliteRefus": { "tauxSeuil": 0.5, "points": 8 },
  "nouvelArtisanBoost": { "joursMax": 30, "points": 6 },
  "scoreMin": 35,
  "convertirEnAppelOffres": true,
  "delaiAvantAppelOffresH": 24
}
```

---

## 3. Étapes

### [1] Normalisation de la demande
- `metierRequis` : dérivé de `prestationId` (`sdb` → `plomberie` + `carrelage`, `cuisine` → `menuiserie`, `diagnostic` → `diagnostiqueur`). Table dans `referentiel/prestations.metiersRequis`
- `exigences` : `rge` si isolation, chauffage ou aides demandées ; `certif_diag` pour le diagnostic ; `decennale` pour tout le gros œuvre
- `geo` + `geohash` du code postal (table des communes ou API BAN), `trancheBudget`, `urgence` (issue de `delaiSouhaite` : `asap` → `urgente`), `qualiteLead` (§4)

### [2] Génération des candidats
- Requête `artisansPublic` : `enLigne == true`, `metiers array-contains metierPrincipal`, **bornes geohash** (geofire-common `geohashQueryBounds(centre, rayonMaxKm)`)
- Filtre fin sur la distance réelle (haversine) : `distance ≤ min(artisan.rayonKm, rayonMaxKm)`. **`artisan.rayonKm` : 10 à 100 km** (choisi par l'artisan, défaut 30 km, CGV Pro §1 bis), mesuré entre l'adresse de l'établissement et la commune du chantier
- 200 candidats au maximum (au-delà, on garde les plus proches)

### [3] Filtres durs (exclusion, raison consignée)
| Règle | Raison |
|---|---|
| `verification.statut != 'verifie'` | `non_verifie` |
| Décennale absente (D81), expirée ou expirant avant le démarrage | `assurance` |
| Exigence non couverte (`rge`, `certif_diag`…) | `exigence:<x>` |
| Sanction active | `sanction` |
| `demandesRecuesMois ≥ quotaDemandesMois` | `quota` (règle encore dans le cœur, **neutralisée** à l'attribution depuis la fin des demandes garanties) |
| Déjà attribué ou déjà refusé pour cette demande | `deja_vu` |
| Membre lié au particulier (même email, téléphone ou SIREN) | `conflit` |
| Paramètre « pause » activé par l'artisan | `pause` |
| `budgetMax` de la demande < `artisan.budgetMin × 0,5` | `budget` |

> **À signaler** : depuis le 01/11/2026 (assurance facultative) et le 15/11/2026 (fiche en ligne dès le SIREN reconnu, `verification.statut: 'en_cours'`), une fiche peut être en ligne sans être `verifie` ni avoir de décennale. Ces deux filtres l'écartent alors de tous les appels d'offres et des demandes ciblées du matching (pas des demandes laissées sur sa fiche ou son site, attribuées hors matching). Comportement voulu ou non : à confirmer par le propriétaire.

### [4] Score de pertinence (0–100)
Chaque sous-score est normalisé entre 0 et 1, puis pondéré par `poids` (somme = 1) et multiplié par 100.

| Sous-score | Formule |
|---|---|
| `competence` | 1 si `metierPrincipal == metierRequis` ; 0,8 si c'est un métier secondaire ; +0,1 par `tag` correspondant aux réponses (« douche italienne »), plafonné à 1 |
| `distance` | `1 − (d / rayonEffectif)^1,3` |
| `qualite` | **moyenne bayésienne** : `(C·m + n·note) / (C + n)` avec `m = 4,3` (moyenne plateforme) et `C = 5`, puis `(x − 3) / 2`, borné à [0, 1] ; + `tauxRecommandation × 0,2` |
| `reactivite` | `0,6 × tauxReponse + 0,4 × (1 − min(tempsReponseMoyenMin, 1440) / 1440)` |
| `disponibilite` | `1` si `delaiDispoJours ≤ délai souhaité`, sinon `max(0, 1 − (dispo − souhait) / 30)` |
| `adequationBudget` | chevauchement entre [budgetMin, budgetMax] de l'artisan et [min, max] de l'estimation, rapporté à la fourchette de l'estimation |
| `completude` | `artisan.completude / 100` |

Ajustements additifs (en points) :
- **+ `bonusPremium`** si la formule est Tout inclus ; **+ `bonusVisibilite`** si la formule contient Fiche Pro (Fiche Pro, Fiche + Site, Tout inclus)
- **− `penaliteSaturation`** si plus de `seuilDemandes7j` attributions sur 7 jours
- **− `penaliteRefus`** si le taux de refus sur 30 jours dépasse `tauxSeuil`
- **+ `nouvelArtisanBoost`** pendant les 30 premiers jours (cold start), si l'artisan est vérifié
- Si le score final est inférieur à `scoreMin`, le candidat est exclu (`score_faible`)

### [5] Sélection équitable
1. Tri par score décroissant (en cas d'égalité : distance, puis ancienneté de la dernière attribution, pour faire tourner)
2. On retient les `nbPropositionsInitiales` premiers en respectant :
   - au plus `quotaPremiumMax` Premium parmi eux (le Premium est avantagé sans capter tous les projets)
   - si `garantirUnNonPremium`, au moins un artisan gratuit lorsqu'il en existe un éligible
   - diversité : pas deux artisans de la même entreprise (même SIREN)
3. `artisanCibleId` : **remplacé**. Un artisan ciblé éligible reçoit la demande seul (`aiguiller`, voir l'encadré en tête) ; et les demandes laissées sur une fiche ne passent plus par le matching (attribution directe, 01/11/2026)

### [6] Écritures Firestore (une seule transaction)
| Document | Champs écrits |
|---|---|
| `demandes/{id}` | `statut = 'en_attribution'`, `nbAttributions`, `metierRequis`, `qualiteLead`, `matchingVersion`, `matchingLe` |
| `demandes/{id}/attributions/{artisanId}` | `statut = 'proposee'`, `rang`, `scoreMatching`, `detailScore`, `proposeeLe`, `expireLe = now + delaiAcceptation` |
| `artisans/{artisanId}` | `demandesRecuesMois += 1`, `derniereAttributionLe` |
| `artisans/{artisanId}/statsJour/{jour}` | `demandesRecues += 1` |
| `matching/{demandeId}` | `version`, `candidats: [{ artisanId, distance, sousScores, ajustements, score, rang, retenu, raisonExclusion }]`, `nbCandidats`, `nbExclus`, `dureeMs`, `resultat` (`ok`, `sous_servi`, `aucun`) |
| `users/{uid}/notifications` (artisans) | nouvelle demande |

Puis les notifications : email `nouvelle-demande` (+ SMS si urgente), et push si l'application mobile est installée (push et SMS prêts mais coupés par leurs flags).

**Devis par écrit sans appel (D90, 18/11/2026)** : le particulier peut demander à recevoir des devis par écrit seulement (`contactSouhaite: 'ecrit_uniquement'`, case du simulateur) et joindre son plan (`planJoint`). Dans ce cas, son téléphone n'est **jamais** montré aux artisans, même après acceptation ou déblocage ; ils répondent par la messagerie ou par devis.

**Mise en œuvre réelle (AVANCEMENT §18)** : pas de vagues de propositions à plusieurs artisans. Une demande ciblée non acceptée dans le délai (24 h, 4 h si urgente) ou refusée passe **directement** en appel d'offres, sans réinviter l'artisan. Sinon la demande part tout de suite en appel d'offres anonymisé au prix du barème, 3 places, invitations notifiées (Tout inclus tout de suite, les autres 12 h plus tard).

### [7] Suivi et réattribution (`matchingRelance`, toutes les 15 min)
- Attribution `proposee` avec `expireLe` dépassé → `statut = 'expiree'`, `artisanScores.expirations30j += 1`
- Attribution `refusee` ou `expiree`, avec `nbAcceptees < nbCibles` → nouvelle vague de `vagueSupplementaire` candidats (étapes 2 à 6, en excluant ceux déjà vus)
- Après `delaiAvantAppelOffresH`, si toujours moins de `nbCibles` acceptations et `convertirEnAppelOffres` actif → **création de l'appel d'offres** :
  - `appelsOffres/{id}` : résumé anonymisé, `qualiteLead`, `acces = 'premium_prioritaire'`, `tarification` calculée par le barème actif (voir DATABASE.md §5)
  - `demandes/{id}.statut = 'appel_offres'`
  - notification `nouvel-appel-offres` aux artisans éligibles de la zone qui n'ont pas encore été sollicités
- Appel d'offres sans déblocage au bout de 48 h → entrée `lead_sans_preneur` dans la file admin, qui peut appliquer une promo ou le rendre gratuit

### [8] Déblocage d'un appel d'offres (Function `debloquerAppelOffres`)
Transaction :
1. Vérifier que `statut == 'ouvert'`, que `nbDeblocages < nbDeblocagesMax`, que l'accès est autorisé (fenêtre Premium), que l'artisan passe les filtres durs et qu'il n'a pas déjà débloqué
2. Déterminer le prix, **recalculé côté serveur** : prix de l'admin (grille ou prix manuel), −15 % pour Tout inclus (`remiseAppelOffres`), promo appliquée
3. Moyen de paiement (flag `appelsOffresPayants` ouvert seulement) :
   - ~~`inclus_premium` si `portefeuilles.creditsInclusRestants ≥ prixCredits`~~ : crédits inclus Premium **supprimés** (D54)
   - `credits` si `soldeCredits ≥ prixCredits` → mouvement `debit_lead`
   - `carte` → création d'un PaymentIntent Stripe (Checkout `mode: 'payment'`) ; le déblocage est finalisé par le webhook `payment_intent.succeeded`
4. Écrire `achatsLeads`, `appelsOffres/{id}/deblocages/{artisanId}`, puis `nbDeblocages += 1` ; passer le statut à `complet` si le maximum est atteint
5. Créer l'attribution `acceptee` dans la demande, avec `coordonneesDebloquees = true`

### [9] Score de qualité de la demande `qualiteLead` (0–100)
```
+25 email vérifié          +20 téléphone vérifié (SMS)     +15 réponses complètes (≥ 80 % champs)
+10 photos jointes         +10 précisions ≥ 60 caractères   +10 délai ≤ 3 mois
+10 budget cohérent avec l'estimation
−30 IP / téléphone déjà vus ≥ 3 fois en 7 j    −40 email jetable    −20 hors zone couverte
```
Une demande dont le score est inférieur à 30 est placé dans la file de modération (`fraude_suspectee`) **avant** tout matching.

### [10] Scores de nuit `artisanScores/{artisanId}` (planifié chaque nuit à 3 h)
| Champ | Calcul (fenêtre glissante de 90 jours) |
|---|---|
| `tauxReponse` | attributions ayant eu une réponse / proposées |
| `tempsReponseMoyenMin` | médiane de `reponduLe − proposeeLe` |
| `tauxAcceptation`, `tauxRefus`, `expirations30j` | |
| `tauxDevis` | devis envoyés / acceptées — **pas encore calculé** |
| `tauxConversion` | devis acceptés / devis envoyés — **pas encore calculé** |
| `tauxRemboursementLeads` | remboursements acceptés / demandes achetées — **pas encore calculé** |
| `noteBayesienne` | voir §4 |
| `capaciteHebdo` | estimation de charge (attributions actives) |
| `scoreGlobal` | synthèse 0–100 pour l'admin |

Ces scores sont ensuite recopiés dans `artisans/{id}` (`tauxReponse`, `tempsReponseMoyenMin`, labels automatiques `rapide` si la médiane est inférieure à 24 h et `recommande` si le taux de recommandation dépasse 95 % avec au moins 10 avis), puis dans `artisansPublic` via `onArtisanWrite`, ce qui met à jour le classement de l'annuaire.

---

## 4. Classement de l'annuaire (même moteur, sans demande)
`artisansPublic.scoreClassement` est recalculé à chaque écriture de l'artisan et chaque nuit :
`0,35 × qualite + 0,25 × reactivite + 0,15 × completude + 0,15 × disponibilite + 0,10 × anciennete (plafonnée à 10 ans)`, sur 100.
Tri « Pertinence » à l'affichage : `scoreClassement − 0,6 × distanceKm` (+ correspondance du texte si Typesense renvoie un score ; Typesense prêt mais inactif, clés à fournir). Les fiches mises en avant (formules avec Fiche Pro, label « Premium Portail Travaux ») sont affichées à part dans « Artisans à la une » (mention légale obligatoire, voir README), les **partenaires** (Tout inclus) en tête (01/11/2026). Sans artisan dans le secteur, l'annuaire montre « Les artisans les plus proches » (jusqu'à 150 puis 500 km).

---

## 5. Tests obligatoires
- Chaque filtre dur exclut bien et consigne sa raison
- Quota Premium respecté ; au moins un non-Premium quand il existe
- `artisanCibleId` éligible : la demande lui revient seul (ancien critère « toujours en rang 1 »)
- Réattribution : aucun artisan n'est sollicité deux fois
- Déblocage concurrent : **deux artisans ne peuvent jamais dépasser `nbDeblocagesMax`** (test de transaction en parallèle)
- Prix : les formules du barème reproduisent un jeu de 20 cas attendus
- Solde de crédits jamais négatif
- Résultat déterministe pour une même configuration et un même jeu de données


---

## Demandes partenaires et éligibilité aux aides
- Les demandes `source: 'partenaire'` (DATABASE §4 bis) suivent le même algorithme.
- `rgeRequis == true` → filtre dur : seuls les artisans avec `rge.verifie` et un domaine RGE correspondant à la prestation sont candidats. S'il n'y en a aucun dans le rayon, la demande part en appel d'offres réservé aux RGE, puis en demande offerte.
- **Niveau de qualification** (`qualification.niveau`) :
  - A : téléphone vérifié, propriétaire, projet à moins de 3 mois ;
  - B : un critère manquant ;
  - C : « je me renseigne » ou locataire.

  A et B peuvent être des demandes exclusives (attribuées à un seul artisan) ; **C ne l'est jamais** (appel d'offres à prix réduit uniquement).
- **Prix de l'appel d'offres** = grille × coefficient de niveau (A 1,0 · B 0,7 · C 0,4) × coefficient d'éligibilité (éligible 1,2 · non éligible 0,9).
- **Rayon** : `distance ≤ artisan.rayonKm` (10 à 100 km, CGV Pro §1 bis).
- **Vitesse** : la proposition au premier artisan part dans les 5 minutes suivant l'import ; les attributions exclusives non vues après 2 h sont réattribuées (au lieu de 72 h pour les demandes classiques).
