# Modèle de données : Firestore et Storage

Région : **`eur3` (multi-région UE)** pour Firestore, **`europe-west1`** pour Storage et Functions.
Conventions : `camelCase`, dates en `Timestamp`, montants en **centimes entiers** (`number`), identifiants Firestore auto sauf mention contraire. Chaque document porte `createdAt`, `updatedAt` et, pour les objets supprimables, `deletedAt` (suppression logique).

---

## 1. Vue d'ensemble

```
users/{uid}                          ← profil commun (particulier | artisan | admin)
  └─ notifications/{id}
  └─ consentements/{id}

artisans/{artisanId}                 ← entreprise (1 artisan = 1 entreprise, n membres)
  ├─ membres/{uid}
  ├─ documents/{docId}               ← assurances, Kbis, certifications (PRIVÉ)
  ├─ realisations/{id}
  ├─ zones/{id}
  ├─ disponibilites/{yyyy-mm}
  ├─ statsJour/{yyyy-mm-dd}
  └─ prive/facturation               ← stripeCustomerId etc. (PRIVÉ)

artisansPublic/{artisanId}           ← projection publique dénormalisée (annuaire/fiche)

demandes/{demandeId}                 ← projet travaux (simulateur / hero / fiche)
  ├─ attributions/{artisanId}        ← mise en relation (max 3)
  └─ messages/{messageId}

appelsOffres/{id}                    ← demandes ouvertes visibles par zone, PRIX FIXÉ PAR L'ADMIN
  ├─ reponses/{artisanId}
  └─ deblocages/{artisanId}          ← qui a payé / débloqué

grillesTarifaires/{id}               ← barème auto du prix des appels d'offres (admin)
achatsLeads/{id}                     ← chaque déblocage payé (argent ou crédits)
portefeuilles/{artisanId}            ← solde de crédits (Premium inclus + packs)
  └─ mouvements/{id}                 ← journal immuable des crédits
packsCredits/{id}                    ← offres de packs vendus (admin)
remboursementsLeads/{id}             ← contestations « faux lead » (admin)

matching/{demandeId}                 ← trace de chaque calcul d'algo (explicabilité)
matchingConfig/actif                 ← poids & seuils de l'algo (admin, versionné)
  └─ versions/{v}
artisanScores/{artisanId}            ← scores précalculés nuit (qualité, réactivité, capacité)

admins/{uid}                         ← fiche équipe interne + permissions fines
filesModeration/{id}                 ← tâches à traiter (docs, avis, leads, litiges)
sanctions/{id}                       ← avertissements / suspensions artisans
notesInternes/{id}                   ← post-it internes sur artisan/demande/particulier
annonces/{id}                        ← bannières & messages in-app pilotés par l'admin
rolesAdmin/{id}                      ← rôles admin personnalisés (les 6 rôles système sont dans le code)
rgpdDemandes/{id}                    ← demandes RGPD (accès, rectification, effacement)

prospects/{id}                       ← artisans non inscrits (email connu) : CONVERSION.md
cycleEtat/{artisanId}                ← étape du cycle de vie, score, signaux, séquence en cours
cycleTraces/{id}                     ← chaque décision du moteur (envoi, blocage, signal, conversion)
cycleStats/{yyyy-mm-dd}              ← agrégats quotidiens (entonnoir, revenu attribué, témoin)
sequences/{id}                       ← séquences d'emails éditables dans l'admin
  └─ versions/{v}
config/cycle                         ← interrupteur, pression, remises, seuils du score

pagesSuivies/{page}                  ← pages analysées (sections, éléments data-ph, objectif) : COMPORTEMENT.md
comportementSessions/{id}            ← résumé d'une page vue (TTL 35 j) : COMPORTEMENT.md
comportementAgregats/{page_jour_app} ← cartes et indicateurs agrégés, plus cumuls 7/30/90 j prêts à afficher
iaContexte/{perimetre}               ← contexte compact pré-calculé chaque nuit pour l'IA
comportementAlertes/{id}             ← frictions détectées chaque nuit
abTests/{id}                         ← tests A/B des pages
config/comportement                  ← échantillonnage, seuils de détection
iaAnalyses/{id}                      ← analyses de l'assistant IA : IA_ADMIN.md
iaRecommandations/{id}               ← recommandations et leur suivi
config/ia                            ← modèle, budget, consignes, planification

sourcesDemandes/{id}                 ← sites partenaires qui envoient des demandes (§4 bis)
importsDemandes/{id}                 ← journal d'import (idempotence, rejets)
preuvesConsentement/{id}             ← preuve RGPD horodatée de chaque demande partenaire

dossiersDiag/{id}                    ← parcours diagnostic immobilier
  └─ attributions/{artisanId}

avis/{avisId}
  └─ signalements/{id}
  └─ reponse (champ)                 ← réponse publique de l'artisan

abonnements/{subscriptionId}         ← miroir Stripe (écrit par webhook uniquement)
factures/{invoiceId}                 ← miroir Stripe
paiements/{paymentIntentId}
codesPromo/{code}                    ← miroir Stripe promotion codes

referentiel/prestations/items/{id}   ← grilles du simulateur
referentiel/diagnostics/items/{id}   ← règles & prix diagnostics
referentiel/metiers/items/{id}
referentiel/labels/items/{id}
communes/{slug}                      ← données Insee + contenu SEO

contacts/{id}                        ← formulaire aide & contact / tickets
litiges/{id}                         ← médiation
emails/{id}                          ← journal d'envoi (idempotence, audit)
evenements/{id}                      ← analytics produit (vues fiche, clics tel)
auditLog/{id}                        ← actions admin (immuable)
stats/public                         ← compteurs affichés (home, annuaire)
config/app                           ← flags, prix affichés, versions CGU
stripeEvents/{eventId}               ← idempotence webhooks
rateLimits/{clé}                     ← anti-abus formulaires publics
```

---

## 2. Utilisateurs et comptes

### `users/{uid}` (uid = Firebase Auth)
| Champ | Type | Notes |
|---|---|---|
| `roles` | `('particulier' \| 'artisan')[]` | cumulables ; **copié dans les custom claims** par `syncClaims`. L'équipe interne est dans `admins/{uid}` (claim `staff`), voir COMPTES.md §1 et §12 |
| `email` | string | minuscules |
| `emailVerifie` | bool | |
| `telephone` | string E.164 | `+33612345678` |
| `telephoneVerifie` | bool | |
| `prenom`, `nom` | string | |
| `nomAffiche` | string | pour les avis (« Camille M. ») |
| `adresse` | `{ ligne1, ligne2?, codePostal, ville, pays:'FR', geo?: GeoPoint, geohash? }` | |
| `artisanId` | string? | si rôle artisan |
| `preferences` | `{ notifs: { activite: { email, sms, inapp }, relance: {…}, offres_pro: {…}, marketing: {…} }, langue:'fr' }` | `offres_pro` activé par défaut pour les pros, `marketing` désactivé par défaut (EMAILS.md §2) |
| `mfaActive` | bool | |
| `cguVersionAcceptee` | string | ex. `2026-09-22` |
| `cguAccepteeLe` | Timestamp | |
| `derniereConnexion` | Timestamp | |
| `statut` | `'actif' \| 'suspendu' \| 'supprime'` | |
| `suspensionMotif` | string? | |
| `createdAt`, `updatedAt`, `deletedAt?` | Timestamp | |

### `users/{uid}/consentements/{id}` (journal RGPD en ajout seul)
`type` (`cgu`, `cgv`, `confidentialite`, `marketing_email`, `opposition_offres_pro`, `cookies_mesure`, `cookies_pub`, `mise_en_relation`), `valeur: bool`, `version`, `ip` (hachée), `userAgent`, `source` (page), `createdAt`.

### `users/{uid}/notifications/{id}`
`type`, `titre`, `corps`, `lien`, `lu: bool`, `createdAt`.

---

## 3. Artisans

### `artisans/{artisanId}` (privé : lecture par ses membres et les admins)
| Champ | Type | Notes |
|---|---|---|
| `raisonSociale` | string | |
| `nomCommercial` | string | affiché |
| `slug` | string unique | `bertrand-renovation-bordeaux` |
| `siren` | string(9) | unique, vérifié via l'API Sirene / INSEE |
| `siret` | string(14) | |
| `formeJuridique` | string | |
| `tvaIntra` | string? | |
| `codeNaf` | string | |
| `dateCreationEntreprise` | Timestamp | → « X ans d'activité » |
| `adresseSiege` | objet adresse + `geo` + `geohash` | |
| `telephonePublic` | string | affiché uniquement si Premium ou option Visibilité |
| `emailContact` | string | |
| `siteWeb` | string? | |
| `metiers` | string[] | ids de `referentiel/metiers` |
| `metierPrincipal` | string | |
| `tags` | string[] | mots-clés recherche (« douche italienne ») |
| `pitch` | string (≤ 280) | |
| `description` | string (≤ 3000) | |
| `logoUrl` | string? | Storage |
| `labels` | string[] | `decennale`, `rge`, `qualibat`, `local`, `rapide`, `recommande`, `photos`, `devis48` |
| `labelsVerifies` | `{ [label]: { verifieLe, expireLe?, docId } }` | seuls les labels vérifiés sont affichés |
| `zoneIntervention` | `{ centre: GeoPoint, geohash, rayonKm, communes: string[] }` | `rayonKm` **10 à 100** (défaut 30), accepté avec la clause CGV Pro §1 bis (`rayonAccepteLe`) |
| `source` | `'direct' \| 'facebook' \| 'prospect' \| 'admin'` | canal d'acquisition (UTM à l'inscription) |
| `rge` | `{ verifie: bool, domaines: string[], expireLe }` | condition pour recevoir les demandes éligibles aux aides |
| `demandeOfferteUtilisee` | bool | une seule demande offerte par entreprise (CONVERSION §3 bis) |
| `budgetMin`, `budgetMax` | number (centimes) | → filtre budget |
| `budgetCle` | `'petit' \| 'moyen' \| 'grand'` | calculé |
| `delaiDispoJours` | number | → filtre disponibilité (mis à jour par l'artisan ou chaque nuit) |
| `plan` | `'gratuit' \| 'visibilite' \| 'premium'` | **écrit par le webhook Stripe uniquement** (Premium inclut Visibilité) |
| `planPeriode` | `'mensuel' \| 'annuel'?` | |
| `planExpireLe` | Timestamp? | |
| `optionVisibilite` | bool | webhook uniquement ; `true` si plan `visibilite` ou `premium` |
| `optionVisibiliteExpireLe` | Timestamp? | |
| `verification` | `{ statut: 'a_faire' \| 'en_cours' \| 'verifie' \| 'refuse' \| 'expire', verifieLe?, verifiePar?, motifRefus? }` | |
| `assuranceDecennale` | `{ assureur, numeroPolice, debut, fin, activitesCouvertes: string[], docId }` | **alerte 30 j avant `fin`** |
| `assuranceRcPro` | idem | |
| `noteMoyenne` | number (0–5, 1 décimale) | agrégat, **écrit par Function** |
| `nbAvis` | number | agrégat |
| `notesCriteres` | `{ qualite, delais, proprete, rapportQP }` moyennes | |
| `tauxRecommandation` | number 0–1 | |
| `tempsReponseMoyenMin` | number | → label `rapide` |
| `tauxReponse` | number 0–1 | |
| `quotaDemandesMois` | number | selon le plan |
| `demandesRecuesMois` | number | remis à zéro le 1er du mois |
| `completude` | number 0–100 | score de fiche |
| `enLigne` | bool | publié dans l'annuaire |
| `avertissements` | number | charte, sanctions graduées |
| `statut` | `'actif' \| 'suspendu' \| 'dereference' \| 'supprime'` | |
| `onboarding` | `{ etape: 1..3, termineLe? }` | |
| `stripeCustomerId` | ✗ **ne pas mettre ici** → `prive/facturation` | |
| `createdAt`, `updatedAt`, `deletedAt?` | | |

### `artisans/{id}/prive/facturation` (lecture par le propriétaire et les admins, écriture par le serveur uniquement)
`stripeCustomerId`, `stripeSubscriptionId`, `stripeVisibiliteSubscriptionId`, `adresseFacturation`, `emailFacturation`, `defaultPaymentMethodLast4`, `defaultPaymentMethodBrand`.

### `artisans/{id}/membres/{uid}`
`role: 'proprietaire' | 'collaborateur'`, `ajouteLe`, `ajoutePar`. Les règles de sécurité vérifient l'appartenance ici.

### `artisans/{id}/documents/{docId}` (PRIVÉ : membres en lecture, admins en lecture et écriture)
`type` (`kbis`, `decennale`, `rc_pro`, `rge`, `qualibat`, `piece_identite`, `urssaf_vigilance`), `storagePath`, `nomFichier`, `mime`, `tailleOctets`, `sha256`, `statut` (`en_attente`, `valide`, `refuse`, `expire`), `valideDu`, `valideAu`, `motifRefus`, `verifiePar`, `verifieLe`, `createdAt`. **Suppression automatique** 3 ans après la fin de la relation.

### `artisans/{id}/realisations/{id}`
`titre`, `description`, `metier`, `ville`, `budget` (centimes), `photos: [{ url, storagePath, largeur, hauteur }]`, `autorisationProprietaire: bool` (**obligatoire**, voir CGV §9), `publie`, `ordre`, `createdAt`.

### `artisans/{id}/statsJour/{yyyy-mm-dd}` (écrit par Function)
`vuesFiche`, `vuesAnnuaire`, `clicsTelephone`, `clicsDevis`, `demandesRecues`, `demandesRepondues`, `devisEnvoyes`, `devisAcceptes`, `sources: { annuaire, recherche, direct, diagnostic }`. Alimente `Statistiques.dc.html`.

### `artisansPublic/{artisanId}` (**lecture publique**, écriture par Function uniquement)
Projection dénormalisée, recalculée à chaque changement de `artisans/{id}` par un trigger `onDocumentWritten`. Contient **uniquement** les champs affichables :
`slug`, `nomCommercial`, `metiers`, `metierPrincipal`, `tags`, `pitch`, `description`, `logoUrl`, `ville`, `geo`, `geohash`, `rayonKm`, `labels` (vérifiés seulement), `noteMoyenne`, `nbAvis`, `notesCriteres`, `anneesActivite`, `budgetMin`, `budgetMax`, `budgetCle`, `delaiDispoJours`, `dispoLabel`, `premium: bool`, `argumentPremium`, `telephone` (**null si ni Premium ni Visibilité**), `scoreClassement` (précalculé), `enLigne`, `updatedAt`.
> Cette collection est aussi celle qui est **indexée dans Typesense**.

---

## 4. Demandes de travaux (simulateur)

### `demandes/{demandeId}`
| Champ | Type | Notes |
|---|---|---|
| `reference` | string unique | `PH-XXXXXX` |
| `source` | `'simulateur' \| 'hero' \| 'fiche_artisan' \| 'annuaire' \| 'partenaire'` | `partenaire` = demande importée du simulateur d'aides (§4 bis) |
| `partenaire?` | `{ sourceId, idExterne, recueLe, coutAchatCentimes }` | demandes importées uniquement |
| `aides?` | `{ eligibilite: 'eligible' \| 'ampleur_seulement' \| 'non_eligible', trancheRevenus: 'bleu' \| 'jaune' \| 'violet' \| 'rose' \| null, montantEstimeCentimes, dispositifs: string[], mention: 'indicatif' }` | affiché à l'artisan (« aides estimées ») |
| `qualification` | `{ telephoneVerifie: bool, statutOccupation: 'proprietaire_occupant' \| 'bailleur' \| 'locataire' \| 'inconnu', horizon: 'moins_3_mois' \| '3_6_mois' \| 'plus_6_mois' \| 'renseignement', score: 0-100, niveau: 'A' \| 'B' \| 'C' }` | calculé à la réception ; sert au prix et au routage |
| `rgeRequis` | bool | `true` si `aides.eligibilite != 'non_eligible'` et prestation d'efficacité énergétique |
| `particulierUid` | string? | null si l'envoi se fait sans compte : un compte est créé par lien magique à l'envoi |
| `contact` | `{ prenom, nom, email, telephone }` | **PII** |
| `prestationId` | string | `peinture`, `sdb`… |
| `reponses` | `{ [champId]: number \| string \| string[] }` | brut |
| `reponsesLisibles` | `[{ question, reponse }]` | pour les emails et les artisans |
| `adresseChantier` | `{ codePostal, ville, geo, geohash }` | adresse précise **non** partagée avant acceptation |
| `acces` | `'facile' \| 'etage' \| 'difficile'` | |
| `delaiSouhaite` | `'asap' \| '1mois' \| '3mois' \| 'renseignement'` | |
| `precisions` | string? | |
| `photos` | `[{ storagePath }]` | |
| `estimation` | `{ minCentimes, maxCentimes, coefRegion, coefAcces, aidesCentimes, postes: [{ label, min, max }], versionReferentiel }` | **figée au moment de l'envoi** |
| `miseEnRelation` | bool | case « Être mis en relation avec des artisans » : demande garantie Premium (1 artisan) si un Premium a du quota, sinon appel d'offres (3 réponses max), voir MATCHING |
| `artisanCibleId` | string? | si la demande part d'une fiche |
| `statut` | `'nouvelle' \| 'en_attribution' \| 'appel_offres' \| 'attribuee' \| 'devis_recus' \| 'signee' \| 'close' \| 'annulee' \| 'spam'` | |
| `nbAttributions` | number (≤ 3) | |
| `consentementId` | string | lien vers le journal ; pour les demandes partenaires, pointe vers `preuvesConsentement` |
| `ipHash`, `userAgent` | string | anti-fraude |
| `createdAt`, `updatedAt`, `expireLe` | | purge après 3 ans |

### 4 bis. Demandes importées d'un site partenaire (simulateur d'aides)

#### `sourcesDemandes/{id}` (admin)
`nom` (« Simulateur aides »), `actif`, `cleApiHash` (clé du webhook, Secret Manager), `ipAutorisees[]`, `coutUnitaireCentimes` (700), `mappingPrestations` (types du partenaire → `prestationId` du référentiel), `texteConsentementAttendu` (version), `quotaJour`, `createdAt`.

#### `importsDemandes/{id}` (ajout seul, écrit par la Function d'import)
`sourceId`, `idExterne` (**unique par source** : idempotence), `recueLe`, `statut` (`creee` → `demandes/{id}`, `doublon`, `rejetee`), `motifRejet?` (`consentement_absent`, `telephone_invalide`, `hors_zone_couverte`, `doublon_30j`, `schema_invalide`), `demandeId?`, `payloadHash`. **Aucune donnée personnelle** (elles vont dans la demande). TTL 13 mois.

#### `preuvesConsentement/{id}` (ajout seul, jamais modifié)
`sourceId`, `idExterne`, `texteAffiche` (texte exact de la case cochée), `versionTexte`, `coche: true`, `horodatage` (fourni par le partenaire), `urlPage`, `ipHash`, `userAgentHash`, `finalites` (`transmission_portail_habitat`, `mise_en_relation_professionnels`, `rappel_telephonique`), `recueLe`. Conservé **5 ans** après la dernière utilisation de la demande (preuve RGPD et démarchage). Une demande sans preuve complète est **rejetée**.

#### Règles de traitement (Function `importerDemandePartenaire`, webhook HTTPS)
1. Authentification par clé + IP autorisée, validation Zod, idempotence sur `idExterne`.
2. Rejet si consentement absent ou texte différent de la version attendue.
3. Doublon : même téléphone + même prestation dans les 30 jours → `doublon` (non facturé par le partenaire, voir contrat).
4. Qualification : téléphone valide (format + opérateur ; code SMS si le partenaire ne l'a pas vérifié), statut d'occupation, horizon, éligibilité aux aides → `qualification.score` et `niveau` A / B / C.
5. Création de `demandes/{id}` (`source: 'partenaire'`) puis **le matching standard** démarre (MATCHING.md) : `rgeRequis` filtre les artisans RGE vérifiés ; prix de l'appel d'offres selon le niveau (`grillesTarifaires` : A plein tarif, B −30 %, C −60 %).
6. Délai cible réception → première proposition à un artisan : **< 5 minutes** (supervisé, alerte si > 15 min).
7. Invendue après 24 h → demande offerte (CONVERSION §3 bis) ; après 72 h → archivée, jamais revendue.

### `demandes/{id}/attributions/{artisanId}`
`artisanId` (copie de l'identifiant du document, **obligatoire** pour les requêtes collection group), `demandeId`, `assigneA?`, `statut` (`proposee`, `vue`, `acceptee`, `refusee`, `devis_envoye`, `devis_accepte`, `devis_refuse`, `expiree`), `proposeeLe`, `vueLe`, `reponduLe`, `devis: { montantCentimes, storagePath, envoyeLe }?`, `motifRefus`, `coordonneesDebloquees: bool`, `scoreMatching`.
> Les coordonnées complètes du particulier ne sont lisibles par l'artisan **qu'une fois `acceptee`**, via une Function qui renvoie une vue filtrée. Elles ne sont jamais exposées par les règles de sécurité.

### `demandes/{id}/messages/{id}`
`auteurUid`, `auteurRole`, `artisanId`, `texte`, `pieces: [{ storagePath, nom }]`, `lu: bool`, `createdAt`. Filtrage automatique des numéros et emails avant acceptation (anti-contournement).

---

## 5. Appels d'offres (leads payants)

Un appel d'offres est une demande **anonymisée** publiée pour les artisans de la zone. Pour voir les coordonnées et répondre, l'artisan **débloque** l'appel d'offres à un **prix fixé par l'admin** (automatiquement par barème, ou manuellement). Paiement en **euros** (Stripe, paiement unique) ou en **crédits** (inclus dans Premium ou achetés en pack).

### `appelsOffres/{id}`
| Champ | Type | Notes |
|---|---|---|
| `demandeId` | string | source |
| `titre`, `resume` | string | **anonymisés** (sans nom, rue ni téléphone) |
| `metier`, `metiersSecondaires` | string / string[] | |
| `ville`, `codePostal`, `geo`, `geohash` | | point approximatif (centre de commune) |
| `budgetMinCentimes`, `budgetMaxCentimes` | number | issus de l'estimation |
| `trancheBudget` | `'S' \| 'M' \| 'L' \| 'XL'` | < 5 k€, 5–20 k€, 20–60 k€, > 60 k€ |
| `urgence` | `'normale' \| 'rapide' \| 'urgente'` | |
| `exigences` | string[] | `rge`, `qualibat`, `decennale`… (filtre dur) |
| `qualiteLead` | number 0–100 | score de l'algo (§15.4) |
| **`tarification`** | objet | **voir ci-dessous** |
| `nbDeblocagesMax` | number | 3 par défaut (réglable par l'admin) |
| `nbDeblocages` | number | compteur transactionnel |
| `acces` | `'tous' \| 'premium_seul' \| 'premium_prioritaire'` | `premium_prioritaire` : Premium seul pendant `fenetrePremiumMin`, puis ouvert à tous |
| `fenetrePremiumMin` | number | ex. 60 |
| `ouvertLe`, `ouvertJusquau` | Timestamp | |
| `statut` | `'brouillon' \| 'ouvert' \| 'complet' \| 'clos' \| 'annule' \| 'suspendu'` | |
| `publiePar` | `'algo' \| uid admin` | |
| `createdAt`, `updatedAt` | | |

#### `tarification`
| Champ | Type | Notes |
|---|---|---|
| `mode` | `'auto' \| 'manuel' \| 'gratuit'` | |
| `prixBaseCentimes` | number | prix HT standard (ex. 1900 = 19 €) |
| `prixPremiumCentimes` | number | prix HT pour un Premium (ex. remise de −30 %) |
| `prixCredits` | number | coût en crédits (ex. 2) |
| `grilleId` | string? | barème appliqué si `auto` |
| `detailCalcul` | `{ base, coefMetier, coefBudget, coefUrgence, coefQualite, coefConcurrence }` | transparence et audit |
| `fixePar` | uid? | admin, si `manuel` |
| `fixeLe` | Timestamp | |
| `prixPlancherCentimes`, `prixPlafondCentimes` | number | bornes de sécurité |
| `promo` | `{ pourcentage, jusquau }?` | ex. −50 % pour relancer un lead sans preneur |
| `historique` | `[{ le, par, ancien, nouveau, motif }]` | chaque changement de prix |

> **Le prix est figé au moment du déblocage** (copié dans `achatsLeads`). Un changement de prix n'affecte que les déblocages suivants.

### `appelsOffres/{id}/deblocages/{artisanId}` (écrit par Function uniquement)
`achatId`, `moyen` (`carte`, `credits`, `inclus_premium`, `offert_admin`), `montantCentimes`, `credits`, `debloqueLe`, `vuCoordonneesLe`, `statut` (`actif`, `rembourse`).

### `appelsOffres/{id}/reponses/{artisanId}`
`message`, `montantIndicatifCentimes`, `delaiJours`, `createdAt`, `statut` (`envoyee`, `vue`, `retenue`, `non_retenue`). **Réservé aux artisans ayant débloqué.**

### `appelsOffres/{id}/historiquePrix/{id}` (ajout seul, écrit par `adminFixerPrixLead`)
`mode` (`auto`, `manuel`, `gratuit`), `prixHtCentimes`, `par`, `motif?`, `validePar?` (au-delà du plafond commercial), `createdAt`.

### `grillesTarifaires/{id}` (admin)
| Champ | Exemple |
|---|---|
| `nom` | « Barème Gironde 2026 » |
| `actif` | true (une seule active par zone) |
| `zone` | `{ departements: ['33'] }` |
| `prixBaseParMetier` | `{ plomberie: 1500, electricite: 1500, peinture: 1200, carrelage: 1400, toiture: 2500, isolation: 2200, menuiserie: 2000, cuisine: 2500, sdb: 2500, chauffage: 2400, maconnerie: 2400, renovation_globale: 3900, diagnostic: 900 }` (centimes HT) |
| `coefBudget` | `{ S: 0.8, M: 1, L: 1.5, XL: 2.2 }` |
| `coefUrgence` | `{ normale: 1, rapide: 1.15, urgente: 1.3 }` |
| `coefQualite` | paliers `[{ min: 80, coef: 1.2 }, { min: 50, coef: 1 }, { min: 0, coef: 0.7 }]` |
| `coefConcurrence` | `{ faible: 0.9, normale: 1, forte: 1.15 }` (nombre d'artisans éligibles dans la zone) |
| `remisePremium` | 0.3 |
| `centimesParCredit` | 1000 (1 crédit = 10 € HT) |
| `plancher`, `plafond` | 500 / 9900 |
| `arrondi` | 100 (arrondi à l'euro) |
| `version`, `modifiePar`, `updatedAt` | |

**Formule** (`packages/core/leads/prix.ts`, testée) :
```
prix = arrondi( clamp( prixBaseParMetier[metier]
        × coefBudget[tranche] × coefUrgence[urgence]
        × coefQualite(qualiteLead) × coefConcurrence(nbEligibles),
        plancher, plafond ), arrondi )
prixPremium = arrondi(prix × (1 − remisePremium))
prixCredits = ceil(prix / centimesParCredit)
```
L'admin peut toujours **forcer** un prix (`mode: 'manuel'`), le mettre **gratuit** ou appliquer une **promo**.

### `achatsLeads/{id}` (écrit par Function uniquement, immuable sauf statut)
`artisanId`, `appelOffreId`, `demandeId`, `moyen`, `prixHtCentimes`, `tvaCentimes`, `credits`, `stripePaymentIntentId?`, `stripeInvoiceId?`, `statut` (`paye`, `rembourse`, `rembourse_credits`, `litige`), `createdAt`.

### `portefeuilles/{artisanId}`
`soldeCredits` (number ≥ 0, modifié **uniquement en transaction**), `creditsInclusMois` (ex. Premium = 5), `creditsInclusRestants`, `renouvelleLe`, `updatedAt`.

### `portefeuilles/{artisanId}/mouvements/{id}` (ajout seul)
`type` (`inclus_premium`, `achat_pack`, `debit_lead`, `remboursement`, `geste_admin`, `expiration`), `credits` (+/−), `soldeApres`, `refId`, `par` (uid, `system` ou `stripe`), `motif`, `createdAt`. Les crédits achetés expirent au bout de 12 mois ; les crédits inclus dans Premium, à la fin du mois.

### `packsCredits/{id}` (admin)
`nom` (« Pack 10 »), `credits`, `prixHtCentimes`, `stripePriceId`, `bonusCredits`, `actif`, `ordre`.

### `remboursementsLeads/{id}`
`achatId`, `artisanId`, `motif` (`faux_numero`, `projet_inexistant`, `hors_zone` (**refusé automatiquement** si le chantier est dans le `rayonKm` de l'artisan au moment de l'envoi, CGV Pro §1 bis), `doublon`, `deja_realise`, `autre`), `details`, `preuves`, `statut` (`ouvert`, `accepte`, `refuse`), `decisionPar`, `decisionLe`, `rembourseEn` (`credits`, `carte`). **Délai de contestation : 7 jours après le déblocage.**

---

## 6. Diagnostic immobilier

### `dossiersDiag/{id}`
| Champ | Type |
|---|---|
| `reference` | `PHD-XXXXXX` |
| `bien` | `{ adresse, communeSlug, codePostal, geo, type: 'appartement'\|'maison'\|'immeuble', periode: 'av1949'\|'1949-1976'\|'1977-1996'\|'1997-2010'\|'ap2011', surface, motif: 'vente'\|'location'\|'travaux', gaz, electricite, assainissement, classeDpe }` |
| `existants` | `[{ diagId, annee }]` |
| `resultat` | `[{ diagId, nom, statut: 'a_realiser'\|'a_refaire'\|'deja_valide'\|'conseille', prixMin, prixMax, raison }]` |
| `estimation` | `{ minCentimes, maxCentimes, remisePack: bool, versionRegles }` |
| `contact` | `{ nom, email, telephone, visiteSouhaitee }` |
| `particulierUid?`, `statut`, `nbAttributions`, `consentementId`, `createdAt`, `expireLe` | |

### `dossiersDiag/{id}/attributions/{artisanId}`
Même structure que pour les demandes (réservé aux artisans ayant le métier `diagnostiqueur` et une certification vérifiée).

---

## 7. Avis

### `avis/{avisId}`
| Champ | Type | Notes |
|---|---|---|
| `artisanId` | string | |
| `auteurUid` | string? | |
| `auteurEmail` | string | **privé** : stocké dans `avis/{id}/prive/auteur` (avec `auteurUid`, `ipHash`, `userAgent`), car un avis publié est lisible par tous et les règles ne masquent pas de champ |
| `nomAffiche` | string | |
| `note` | 1..5 | obligatoire |
| `criteres` | `{ qualite?, delais?, proprete?, rapportQP? }` | 1..5 |
| `pointsPositifs` | string[] | |
| `texte` | string ≤ 1200 | |
| `photos` | `[{ storagePath, url }]` | |
| `typeTravaux` | string | |
| `finChantier` | `'YYYY-MM'` | |
| `demandeId` | string? | si lié à une mise en relation (preuve forte) |
| `certificationAcceptee` | bool | obligatoire |
| `preuve` | `{ type: 'facture'\|'devis'\|'mise_en_relation'\|'aucune', storagePath? }` | |
| `statut` | `'en_attente' \| 'publie' \| 'refuse' \| 'retire' \| 'suspendu'` | |
| `moderation` | `{ parUid, le, motif?, score_ia? }` | |
| `reponse` | `{ texte, le, parUid }?` | réponse publique de l'artisan |
| `publieLe` | Timestamp? | |
| `expireAffichageLe` | Timestamp | publication + 3 ans (politique d'avis) |
| `ipHash`, `userAgent` | | détection de fraude (même IP, multi-avis) |
| `createdAt`, `updatedAt` | | |

Invariants **appliqués par Function** : un seul avis publié par (`auteurEmail`, `artisanId`, `finChantier`) ; l'auteur ne peut pas être membre de l'artisan ; à chaque passage en `publie` ou `retire`, recalcul de `noteMoyenne`, `nbAvis`, `notesCriteres` et `tauxRecommandation` sur l'artisan.

### `avis/{id}/signalements/{id}`
`parUid?`, `parRole`, `motif`, `details`, `statut` (`ouvert`, `traite`, `rejete`), `createdAt`.

---

## 8. Facturation (miroir Stripe, écrit par les webhooks uniquement)

### `abonnements/{stripeSubscriptionId}`
`artisanId`, `produit` (`premium`, `visibilite`), `priceId`, `periode` (`mensuel`, `annuel`), `statut` (miroir de Stripe : `trialing`, `active`, `past_due`, `canceled`, `unpaid`, `incomplete`), `debutPeriode`, `finPeriode`, `annulationFinPeriode: bool`, `annuleLe?`, `codePromo?`, `createdAt`, `updatedAt`.

### `factures/{stripeInvoiceId}`
`artisanId`, `numero`, `montantHtCentimes`, `tvaCentimes`, `montantTtcCentimes`, `devise: 'eur'`, `statut`, `pdfUrl`, `hostedUrl`, `periodeDebut`, `periodeFin`, `payeeLe`, `createdAt`.

### `paiements/{paymentIntentId}`
`artisanId`, `montantCentimes`, `statut`, `last4`, `brand`, `echecMotif?`, `createdAt`.

### `codesPromo/{code}`
`stripePromotionCodeId`, `couponId`, `pourcentage` (ex. 30), `duree` (`once`), `produits`, `actif`, `utilisations`, `maxUtilisations`, `expireLe`, `source` (`admin`, `conversion`), `artisanId?` (code personnel), `modele?` (email qui l'a créé), `creePar`.

### `stripeEvents/{eventId}`
`type`, `traiteLe`, `ok: bool`, `erreur?`. **Idempotence** : tout événement déjà présent est ignoré.

---

## 9. Référentiels et contenu

### `referentiel/prestations/items/{id}`
`nom`, `pitch`, `repere`, `icone`, `ordre`, `actif`, `tva` (0,055 ou 0,10), `champs: [{ id, kind, label, aide, min?, max?, pas?, def?, unite?, etape, options?: [{ v, label, desc, coef? }] }]`, `formule` (identifiant de la fonction dans le code, `calcPeinture` par exemple), `parametres` (tous les prix unitaires sous forme de JSON, modifiables dans l'admin), `version`, `updatedAt`.
> La **formule** vit dans le code (`packages/core/simulateur/formules.ts`) ; les **nombres** vivent dans Firestore. Chaque demande garde la `versionReferentiel` utilisée.

### `referentiel/diagnostics/items/{id}`
`nom`, `prixMin`, `prixMax`, `validiteAns`, `invalideAvantAnnee?`, `quand`, `validiteTexte`, `note`, `regle` (identifiant de la fonction), `icone`, `conseille: bool`, `version`.

### `referentiel/metiers/items/{id}` et `referentiel/labels/items/{id}`
`label`, `slug`, `icone`, `ordre`, `actif`, `documentRequis?` (pour un label).

### `communes/{slug}`
`nom`, `codePostal`, `codeInsee`, `population`, `anneePopulation: 2023`, `superficieKm2`, `prixM2`, `prixSource`, `presquile: bool`, `intro`, `bati`, `secteurs`, `risques`, `frequents: [{ titre, texte }]`, `seoTitle`, `seoDescription`, `publie`, `updatedAt`.

### `stats/public`
`nbArtisans`, `nbDemandesMois`, `nbVilles`, `noteMoyenneGlobale`, `nbAvisTotal`, `nbDossiersDiag`. Recalculé chaque nuit.

### `config/app`
`prix: { premiumMensuelHt: 9900, premiumAnnuelHtMois: 7900, visibiliteAnnuelHt: 7990, visibiliteMensuelHt: 1290 }` (affichage seulement, Stripe fait foi), `versionsLegales: { cgu, cgv, confidentialite, avis, charte }`, `maintenance: bool`, `quotas: { gratuit, premium }`, `maxAttributions: 3`.

---

## 10. Support, litiges, journaux

- `contacts/{id}` : `nom`, `email`, `role`, `sujet`, `message`, `pieces`, `statut` (`ouvert`, `en_cours`, `resolu`), `assigneA`, `historique: [{ le, par, action }]`, `createdAt`.
- `litiges/{id}` : `demandeId?`, `avisId?`, `particulierUid`, `artisanId`, `description`, `statut` (`ouvert`, `mediation`, `resolu`, `clos`), `pieces`, `echanges`, `createdAt`.
- `emails/{id}` : schéma complet dans EMAILS.md §1 (`categorie`, `variante`, `envoyerLe`, `sequenceId?`, statuts `en_file` … `annule`, `bloque_preferences`).
- `evenements/{id}` : `type` (`vue_fiche`, `clic_tel`, `clic_devis`, `recherche`), `artisanId?`, `sessionId`, `meta`, `createdAt`, `expireLe` (+13 mois, champ TTL).
- `auditLog/{id}` : `acteurUid`, `action`, `cible`, `avant`, `apres`, `motif?`, `ip`, `createdAt`. **Création seule, jamais modifié.** Inclut les consultations de données personnelles (`consultationPII`) et les exports.
- `rgpdDemandes/{id}` : `type` (`acces`, `rectification`, `effacement`), `demandeurUid?`, `email`, `recueLe`, `echeance` (+1 mois), `statut` (`a_traiter`, `traite`), `traitePar`, `preuveStoragePath`.
- `rateLimits/{hash(cle:client)}` : `compteur`, `fenetreDebut`, `expireLe` (fin de fenêtre + 1 h, champ TTL).
- `idempotence/{hash(cle)}` : résultat sérialisé d'une action déjà traitée (enveloppe `action()` / `callable()`), `expireLe` (+24 h, champ TTL).

### Back-office et conversion (écriture par Functions uniquement)
- `admins/{uid}` : `nom`, `email`, `role` (système ou `rolesAdmin`), `permissionsPlus[]`, `permissionsMoins[]`, `permissionsEffectives[]` (calculé), `mfaObligatoire: true`, `ipAutorisees?`, `actif`, `dernierAcces`, `createdAt`.
- `rolesAdmin/{id}` : `nom`, `permissions[]`, `creePar`, `createdAt`. Suppression refusée si un membre l'utilise.
- `filesModeration/{id}` : types ajoutés `appel_commercial`, `reponse_commerciale`, `risque_resiliation`, `appel_activation`, `garantie_non_tenue` ; champ `permissionRequise` (filtre de la file par rôle).
- `prospects/{id}` : `email` (unique, minuscules), `source`, `metiers[]`, `commune`, `geo`, `geohash`, `rayonKm`, `siren?`, `etape`, `consentement { base, date, texte }`, `desabonne`, `convertiEn?`, `createdAt`, `expireLe` (purge à 3 ans sans contact).
- `cycleEtat/{artisanId}` : schéma dans CONVERSION.md §6. Séparé de `artisans/{id}` pour ne pas relancer `onArtisanWrite` à chaque calcul quotidien.
- `cycleTraces/{id}` : `artisanId?`, `prospectId?`, `type`, `raison?`, `sequenceId?`, `modele?`, `variante?`, `details`, `function`, `traceId`, `createdAt`. Ajout seul, **TTL 6 mois**, décisions uniquement (les ouvertures et clics restent sur `emails`).
- `cycleStats/{jour}` : `entonnoir`, `envois`, `ouvertures`, `clics`, `conversions`, `revenuAttribueCentimes` par modèle et par séquence, `temoin { effectif, conversions }`.
- `sequences/{id}` : `nom`, `etapeEntree`, `objectif`, `actif`, `etapes: [{ modele, declencheur: 'immediat'|'delai'|'signal'|'planifie', valeur, ab }]`, `version`, `modifiePar`, `updatedAt` ; `versions/{v}` garde chaque état précédent. Suppression logique (`supprimee: true`, motif) pour garder l'historique des traces.
- `iaContexte/{perimetre}` : `json` (compact, ≤ 6 000 tokens), `tokensEstimes`, `updatedAt`. Réécrit chaque nuit.
- `iaAnalyses/{id}` : `mode` (`rapide`, `audit`), `perimetres[]`, `question?`, `approfondie`, `demandePar` (uid ou `planifie`), `modele`, `promptVersion`, `resume`, `etapes[{ etape, score, constat }]` (audit), `gainTotal`, `questionsOuvertes[]`, `tokensEntree`, `tokensSortie`, `coutCentimes`, `dureeMs`, `cleCache` (hash mode + périmètres + question, valable 24 h), `statut`, `createdAt`.
- `iaRecommandations/{id}` : `analyseId`, `titre`, `perimetre`, `etape`, `gainEstime`, `priorite`, `impact`, `effort`, `confiance`, `constat`, `preuves[]`, `action{}`, `propositionTexte?`, `statut` (`nouvelle`, `en_cours`, `faite`, `ignoree`), `motifIgnore?`, `effetMesure?`, `createdAt`, `updatedAt`.
- `iaQuotas/{artisanId_jour}` : `utilisations` (incrément en transaction), TTL 2 jours.
- `iaRedactions/{id}` : `artisanId`, `type`, `action`, `ton?`, `accepte`, `tokens`, `coutCentimes`, `createdAt` ; **jamais le texte** ; TTL 90 jours.
- `config/ia` : `actif`, `modeleDefaut` (Haiku), `modeleApprofondi` (Sonnet), `promptVersion`, `quotaJour`, `budgetMensuelCentimes` (1000), `consignes[]`, `auditHebdo: true`.
- `config/cycle` : `actif`, `maxOffresProSemaine`, `maxNonTransacJour`, `veilleApres`, `creneaux`, `remiseBienvenue`, `validiteCodeH`, `delaiEntreRemisesJ`, `remiseRetention`, `seuilPremium`, `seuilAppel`, `tailleTemoin`.

---

## 11. Index composites (`firestore.indexes.json`)

| Collection | Champs |
|---|---|
| `artisansPublic` | `enLigne ==`, `metiers array-contains`, `geohash` asc |
| `artisansPublic` | `enLigne ==`, `premium` desc, `scoreClassement` desc |
| `artisansPublic` | `enLigne ==`, `metiers array-contains`, `noteMoyenne` desc |
| `demandes` | `statut ==`, `prestationId ==`, `createdAt` desc |
| `attributions` (collection group) | `artisanId ==`, `statut ==`, `proposeeLe` desc |
| `attributions` (collection group) | `artisanId ==`, `assigneA ==`, `statut ==` |
| `invitations` | `artisanId ==`, `statut ==`, `createdAt` desc |
| `invitations` | `email ==`, `statut ==` |
| `demandesAcces` | `artisanId ==`, `statut ==` |
| `appelsOffres` | `statut ==`, `metier ==`, `geohash` asc |
| `appelsOffres` | `statut ==`, `acces ==`, `ouvertLe` desc |
| `achatsLeads` | `artisanId ==`, `createdAt` desc |
| `achatsLeads` | `statut ==`, `createdAt` desc |
| `remboursementsLeads` | `statut ==`, `createdAt` asc |
| `filesModeration` | `statut ==`, `priorite` desc, `createdAt` asc |
| `filesModeration` | `assigneA ==`, `statut ==` |
| `filesModeration` | `permissionRequise in`, `statut ==`, `priorite` desc |
| `demandes` | `source ==`, `createdAt` desc |
| `demandes` | `qualification.niveau ==`, `statut ==`, `createdAt` desc |
| `importsDemandes` | `sourceId ==`, `idExterne ==` (unicité vérifiée en transaction) |
| `importsDemandes` | `sourceId ==`, `statut ==`, `recueLe` desc |
| `cycleEtat` | `sequence.id ==`, `sequence.prochainEnvoi` asc (planificateur) |
| `cycleEtat` | `etape ==`, `score` desc |
| `cycleTraces` | `artisanId ==`, `createdAt` desc |
| `cycleTraces` | `type ==`, `createdAt` desc |
| `prospects` | `desabonne ==`, `metiers array-contains`, `geohash` asc |
| `codesPromo` | `artisanId ==`, `createdAt` desc |
| `comportementAlertes` | `statut ==`, `gravite` desc, `createdAt` desc |
| `iaRecommandations` | `statut ==`, `priorite` asc, `createdAt` desc |
| `sanctions` | `artisanId ==`, `createdAt` desc |
| `matching` | `resultat ==`, `createdAt` desc |
| `avis` | `artisanId ==`, `statut ==`, `publieLe` desc |
| `avis` | `statut ==`, `createdAt` asc (file de modération) |
| `abonnements` | `artisanId ==`, `statut ==` |
| `factures` | `artisanId ==`, `createdAt` desc |

| `contacts` | `statut ==`, `createdAt` asc |

Champs TTL (tous sur `expireLe`, jamais sur `createdAt`, qui déclencherait une suppression immédiate) : `brouillons`, `brouillonsOnboarding`, `evenements`, `rateLimits`, `idempotence`, `importsDemandes`, `comportementSessions`, `cycleTraces`, `iaQuotas`, `iaRedactions`, `emails`, `simulations`, `cacheSirene`, `prospects`. `demandes` et `dossiersDiag` ne sont **pas** supprimés par TTL : une Function planifiée les anonymise (§14). Fichier : `firestore.indexes.json`.

---

## 12. Règles de sécurité Firestore

### Claims utilisés (posés par `syncClaims`, jamais par le client)
```
roles:  ['particulier', 'artisan']          // cumulables
ent:    { [artisanId]: 'p' | 'g' | 'c' | 'x' }   // proprietaire, gerant, collaborateur, comptable (≤ 10)
staff:  { r: 'superadmin' | 'admin' | … | 'custom_xxx', s: ['art','dem','ao','avi','lit','fin','cnv','cmp','ia','ref','mat','aud','rgpd','file'], pii: bool }
        // rôle + codes de LECTURE de section + accès aux données personnelles (ADMIN.md). Les écritures relisent admins/{uid}.
imp:    { par, cible } | absent              // impersonation en lecture seule
```
Les permissions fines de l'équipe interne (`admins/{uid}.permissions`) sont vérifiées **dans les Functions**, pas dans les règles. Les règles ne font que de la lecture par rôle.

> **Les règles en vigueur sont dans `firestore.rules` et `storage.rules`** (lot 2), testées pour 16 profils. Elles corrigent le brouillon ci-dessous : lecture staff par section (`lit('dem')`, `lit('art')`…) au lieu de `isStaff()`, profils et consentements lisibles par le staff seulement avec `pii`, téléphone non modifiable par le client, réalisations non publiées privées, rayon 10–100 km vérifié, auteur des avis dans `avis/{id}/prive/auteur`, consentements horodatés par le serveur, `notesInternes` corrigée (`staff().r`), `referentiel/recherche/*` en lecture publique. Détail : AVANCEMENT.md §8.

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    // ---------- helpers ----------
    function signedIn()  { return request.auth != null; }
    function tok()       { return request.auth.token; }
    function uid()       { return request.auth.uid; }
    function noImp()     { return !('imp' in tok()); }                 // aucune écriture en impersonation
    function hasRole(r)  { return signedIn() && ('roles' in tok()) && tok().roles.hasAny([r]); }
    function staff()     { return signedIn() && ('staff' in tok()) ? tok().staff : null; }
    function isStaff()   { return staff() != null; }
    function lit(sec)    { return isStaff() && staff().s.hasAny([sec]); }        // lecture d'une section admin
    function isAdmin()   { return isStaff() && staff().r in ['superadmin', 'admin']; }
    function isModo()    { return lit('avi') || lit('file'); }
    function isFinance() { return lit('fin'); }
    // appartenance rapide (claims) — lecture courante
    function entRole(aid){ return signedIn() && ('ent' in tok()) && (aid in tok().ent) ? tok().ent[aid] : null; }
    function isMembre(aid)      { return entRole(aid) != null; }
    function isGestion(aid)     { return entRole(aid) in ['p', 'g']; }
    function isOperationnel(aid){ return entRole(aid) in ['p', 'g', 'c']; }
    // appartenance vérifiée en base — actions sensibles (révocation immédiate)
    function membreDoc(aid) { return get(/databases/$(db)/documents/artisans/$(aid)/membres/$(uid())); }
    function isMembreActif(aid) { return signedIn() && exists(/databases/$(db)/documents/artisans/$(aid)/membres/$(uid()))
                                   && membreDoc(aid).data.statut == 'actif'; }
    function isGestionActif(aid){ return isMembreActif(aid) && membreDoc(aid).data.role in ['proprietaire', 'gerant']; }
    function onlyChanged(keys)  { return request.resource.data.diff(resource.data).affectedKeys().hasOnly(keys); }

    // ---------- utilisateurs ----------
    match /users/{u} {
      allow read: if signedIn() && (uid() == u || isStaff());
      allow create: if false;                                   // créé par Function (demande, onboarding, invitation)
      allow update: if uid() == u && noImp()
        && onlyChanged(['prenom', 'nom', 'nomAffiche', 'telephone', 'adresse', 'preferences', 'entrepriseActive', 'updatedAt'])
        && (!('entrepriseActive' in request.resource.data) || isMembre(request.resource.data.entrepriseActive));
      match /consentements/{id} { allow read: if uid() == u || isStaff(); allow create: if uid() == u && noImp(); }
      match /notifications/{id} { allow read: if uid() == u; allow update: if uid() == u && noImp() && onlyChanged(['lu']); }
    }

    // ---------- artisans ----------
    match /artisansPublic/{id} { allow read: if true; allow write: if false; }

    match /artisans/{aid} {
      allow read: if isMembre(aid) || isStaff();
      allow update: if noImp() && isGestionActif(aid) && onlyChanged(['nomCommercial', 'pitch', 'description', 'tags', 'metiers',
        'metierPrincipal', 'telephonePublic', 'emailContact', 'siteWeb', 'logoUrl', 'zoneIntervention', 'budgetMin', 'budgetMax',
        'delaiDispoJours', 'updatedAt']);
      allow create, delete: if false;
      match /membres/{m}        { allow read: if isMembre(aid) || isStaff(); allow write: if false; }
      match /etablissements/{s} { allow read: if isMembre(aid) || isStaff(); allow write: if false; }
      match /documents/{d}      { allow read: if isOperationnel(aid) || isModo();
                                  allow create: if noImp() && isMembreActif(aid) && entRole(aid) != 'x' && request.resource.data.statut == 'en_attente';
                                  allow update, delete: if false; }             // validation via Function admin
      match /realisations/{r}   { allow read: if true; allow write: if noImp() && isOperationnel(aid) && isMembreActif(aid); }
      match /statsJour/{j}      { allow read: if isOperationnel(aid) || isStaff(); allow write: if false; }
      match /prive/{p}          { allow read: if isGestion(aid) || entRole(aid) == 'x' || isFinance(); allow write: if false; }
    }

    // ---------- demandes (création et écritures via Functions) ----------
    match /demandes/{id} {
      allow read: if signedIn() && (resource.data.particulierUid == uid() || isStaff());
      allow write: if false;
      match /attributions/{aid} { allow read: if isOperationnel(aid) || isStaff(); allow write: if false; }
      match /messages/{m} {
        allow read: if signedIn() && (get(/databases/$(db)/documents/demandes/$(id)).data.particulierUid == uid()
                     || isOperationnel(resource.data.artisanId) || isStaff());
        allow write: if false;
      }
    }
    // requêtes collection group « mes attributions » (tableau de bord temps réel)
    match /{path=**}/attributions/{aid} { allow read: if isOperationnel(resource.data.artisanId) || isStaff(); }

    match /dossiersDiag/{id} { allow read: if signedIn() && (resource.data.particulierUid == uid() || isStaff()); allow write: if false;
      match /attributions/{aid} { allow read: if isOperationnel(aid) || isStaff(); allow write: if false; } }

    // ---------- appels d'offres, leads, crédits ----------
    match /appelsOffres/{id} {
      allow read: if hasRole('artisan') || isStaff();
      allow write: if false;
      match /reponses/{aid}   { allow read: if isOperationnel(aid) || isStaff(); allow write: if false; }
      match /deblocages/{aid} { allow read: if isOperationnel(aid) || isStaff(); allow write: if false; }
    }
    match /achatsLeads/{id}         { allow read: if isMembre(resource.data.artisanId) || isStaff(); allow write: if false; }
    match /portefeuilles/{aid}      { allow read: if isMembre(aid) || isStaff(); allow write: if false;
      match /mouvements/{m}         { allow read: if isMembre(aid) || isStaff(); allow write: if false; } }
    match /packsCredits/{id}        { allow read: if signedIn(); allow write: if false; }
    match /remboursementsLeads/{id} { allow read: if isOperationnel(resource.data.artisanId) || isStaff(); allow write: if false; }
    match /grillesTarifaires/{id}   { allow read: if isStaff(); allow write: if false; }
    match /matching/{id}            { allow read: if isStaff(); allow write: if false; }
    match /matchingConfig/{p=**}    { allow read: if lit('mat'); allow write: if false; }
    match /artisanScores/{aid}      { allow read: if isGestion(aid) || isStaff(); allow write: if false; }

    // ---------- équipes ----------
    match /invitations/{id}    { allow read: if isGestion(resource.data.artisanId) || isStaff(); allow write: if false; } // lecture par jeton via Function
    match /revendications/{id} { allow read: if (signedIn() && resource.data.demandeurUid == uid()) || isModo(); allow write: if false; }
    match /demandesAcces/{id}  { allow read: if (signedIn() && resource.data.demandeurUid == uid()) || isGestion(resource.data.artisanId) || isStaff(); allow write: if false; }

    // ---------- back-office ----------
    match /admins/{u}          { allow read: if isAdmin() || (signedIn() && uid() == u); allow write: if false; }
    match /filesModeration/{id}{ allow read: if lit('file'); allow write: if false; }   // filtrage par permissionRequise côté requête
    match /sanctions/{id}      { allow read: if isStaff() || isGestion(resource.data.artisanId); allow write: if false; }
    match /notesInternes/{id}  { allow read: if isStaff() && staff() != 'lecture'; allow write: if false; }
    match /annonces/{id}       { allow read: if true; allow write: if false; }
    match /rolesAdmin/{id}     { allow read: if lit('aud') || isAdmin(); allow write: if false; }
    match /auditLog/{id}       { allow read: if lit('aud'); allow write: if false; }
    match /rgpdDemandes/{id}   { allow read: if lit('rgpd'); allow write: if false; }
    // conversion (lecture temps réel dans l'admin, écriture par le moteur uniquement)
    match /cycleEtat/{aid}     { allow read: if lit('cnv'); allow write: if false; }
    match /cycleTraces/{id}    { allow read: if lit('cnv'); allow write: if false; }
    match /cycleStats/{j}      { allow read: if lit('cnv'); allow write: if false; }
    match /sequences/{p=**}    { allow read: if lit('cnv'); allow write: if false; }
    match /prospects/{id}      { allow read: if lit('cnv') && staff().pii; allow write: if false; }
    match /config/cycle        { allow read: if lit('cnv'); allow write: if false; }
    // demandes partenaires
    match /sourcesDemandes/{id}     { allow read: if lit('dem'); allow write: if false; }
    match /importsDemandes/{id}     { allow read: if lit('dem'); allow write: if false; }
    match /preuvesConsentement/{id} { allow read: if lit('rgpd') || (lit('dem') && staff().pii); allow write: if false; }
    // comportement et IA
    match /pagesSuivies/{id}         { allow read: if lit('cmp'); allow write: if false; }
    match /comportementAgregats/{id} { allow read: if lit('cmp'); allow write: if false; }
    match /comportementAlertes/{id}  { allow read: if lit('cmp'); allow write: if false; }
    match /abTests/{id}              { allow read: if lit('cmp'); allow write: if false; }
    match /iaAnalyses/{id}           { allow read: if lit('ia'); allow write: if false; }
    match /iaRecommandations/{id}    { allow read: if lit('ia'); allow write: if false; }

    // ---------- avis ----------
    match /avis/{id} {
      allow read: if resource.data.statut == 'publie' || isModo() || isMembre(resource.data.artisanId);
      allow write: if false;
      match /signalements/{s} { allow read: if isModo(); allow write: if false; }
    }

    // ---------- facturation (miroirs Stripe) ----------
    match /abonnements/{id} { allow read: if isGestion(resource.data.artisanId) || isFinance(); allow write: if false; }
    match /factures/{id}    { allow read: if isGestion(resource.data.artisanId) || entRole(resource.data.artisanId) == 'x' || isFinance(); allow write: if false; }
    match /paiements/{id}   { allow read: if isGestion(resource.data.artisanId) || isFinance(); allow write: if false; }

    // ---------- référentiels et contenu (écriture via Functions admin, versionnée et auditée) ----------
    match /referentiel/{type}/items/{id} { allow read: if true; allow write: if false; }   // champs et libellés uniquement
    match /referentiel/{type}/prix/{id}  { allow read, write: if false; }                  // prix : serveur uniquement (révélation après envoi)
    match /communes/{id}         { allow read: if true; allow write: if false; }
    match /stats/public          { allow read: if true; allow write: if false; }
    match /config/app            { allow read: if true; allow write: if false; }

    // brouillons de parcours : via Server Action sauverBrouillon uniquement (REPRISE_PARCOURS.md)
    // tout le reste (brouillons, contacts, litiges (lus via Function admin), emails, suppressions, evenements, auditLog, stripeEvents, rateLimits,
    // codesPromo, sirenIndex, cacheSirene, brouillonsOnboarding, simulations, migrations, config/flags) : Admin SDK uniquement
  }
}
```
Les écritures admin passent **toutes** par des Functions (`assertPermission` + audit) : aucune règle n'autorise un admin à écrire directement, ce qui garantit que rien n'échappe au journal d'audit.

> **À exiger** : tests des règles avec `@firebase/rules-unit-testing`. Pour chaque règle : un cas autorisé et un cas refusé, avec les profils anonyme, particulier, chaque rôle de membre (p, g, c, x), membre **suspendu** (claims encore présents mais document `statut: 'suspendu'`), autre artisan, chaque rôle staff, et session en impersonation.

### Pièges Firebase à connaître
1. **Collection group** : une requête `collectionGroup('attributions')` exige la règle `/{path=**}/attributions/{aid}` ci-dessus **et** un champ `artisanId` dans le document (on ne peut pas filtrer un collection group sur l'identifiant du document).
2. **Claims en retard** : après un changement de membre, le token garde les anciens claims jusqu'à 1 h. Le client appelle `getIdToken(true)` après chaque action d'équipe ; les actions sensibles vérifient le document `membres` (`isMembreActif`) ; un retrait appelle `revokeRefreshTokens`.
3. **Session serveur ET client** : le cookie de session protège les pages rendues côté serveur, mais les écoutes temps réel du SDK client exigent que le client soit aussi connecté à Firebase Auth. Connexion côté client → envoi de l'ID token au serveur → `createSessionCookie`. Déconnexion : les deux.
4. **`get()` / `exists()` coûtent une lecture** (10 maximum par évaluation). D'où les claims pour les lectures courantes et les documents seulement pour les écritures.
5. **Compteurs chauds** (`nbDeblocages`, `nbAttributions`) : toujours en transaction ; un même document ne supporte qu'environ 1 écriture par seconde en continu, ce qui suffit à ce volume.
6. **Triggers** : `onDocumentWritten` peut se déclencher plusieurs fois pour un même événement. Chaque trigger est idempotent (comparer avant / après, ignorer si rien d'utile n'a changé), sinon boucle infinie (ex. un trigger qui réécrit le document qui l'a déclenché).
7. **Région des triggers** : Firestore est en `eur3` (multi-région). Vérifier au lot 1 la région exacte à déclarer pour les triggers Firestore des Functions v2 (Eventarc) et la documenter dans `docs/decisions/`.
8. **App Check et Server Actions** : App Check ne s'applique pas tout seul aux Server Actions Next.js. L'enveloppe `action()` vérifie le jeton App Check envoyé en en-tête avec `getAppCheck().verifyToken()`.
9. **Émulateurs** : toujours tester les règles et les Functions sur émulateurs ; ne jamais pointer un test sur un vrai projet (garde-fou dans `vitest.setup.ts` qui échoue si `FIRESTORE_EMULATOR_HOST` n'est pas défini).

---

## 13. Storage

```
artisans/{artisanId}/logo/{fichier}              public en lecture, ≤ 2 Mo, image/*
artisans/{artisanId}/realisations/{id}/{fichier} public en lecture, ≤ 8 Mo, image/*
artisans/{artisanId}/documents/{docId}/{fichier} PRIVÉ (membres + admin), ≤ 10 Mo, pdf/jpg/png
demandes/{demandeId}/photos/{fichier}            privé (particulier + artisans acceptés via URL signée)
demandes/{demandeId}/devis/{artisanId}/{fichier} privé
avis/{avisId}/photos/{fichier}                   public après publication (copie par Function)
televersements/{uid}/{fichier}                   dépôt temporaire (photos d'avis, de demande), écrit et relu par son auteur, déplacé par Function
```
- Vérification du type MIME côté règles (`request.resource.contentType.matches('image/.*')`) et de la taille
- Suppression des métadonnées EXIF (géolocalisation) par une Function au moment de l'upload
- Antivirus sur les documents (extension « Scan uploaded files » ou ClamAV sur Cloud Run)
- Aucune URL de téléchargement permanente pour les fichiers privés : **URL signées de 15 min**

---

## 14. Durées de conservation (alignées sur la politique de confidentialité)

| Donnée | Durée | Mécanisme |
|---|---|---|
| Demandes, dossiers diag, messages | 3 ans après le dernier contact | `expireLe` + Function planifiée d'anonymisation |
| Compte particulier inactif | 3 ans | email d'avertissement à J-30, puis suppression |
| Artisan (fiche, documents) | durée du contrat + 5 ans ; documents : 3 ans | Function planifiée |
| Factures | 10 ans | jamais purgées |
| Avis | affichés 3 ans, puis archivés | `expireAffichageLe` |
| Journaux de connexion et événements | 13 mois | TTL |
| Consentements | 5 ans après le retrait | |
| Achats de leads, mouvements de crédits | 10 ans | pièces comptables |
| Traces `matching` | 18 mois | Function planifiée |
| Preuves de consentement des demandes partenaires | 5 ans après la dernière utilisation | jamais modifiées |
| Imports de demandes (`importsDemandes`) | 13 mois | TTL |
| Résumés de visite (`comportementSessions`) | 35 jours | TTL |
| Replays | 30 jours | cycle de vie Cloud Storage |
| Traces de conversion (`cycleTraces`) | 6 mois | TTL |
| Journal de l'assistant de rédaction (`iaRedactions`) | 90 jours | TTL, sans texte |
| Analyses IA (`iaAnalyses`, `iaRecommandations`) | 24 mois | Function planifiée |

---

## 15. Administration et algorithme

Le back-office (rôles, permissions, écrans) est décrit dans **`ADMIN.md`**.
L'algorithme de mise en relation (étapes, formules, champs mis à jour) est décrit dans **`MATCHING.md`**.
Les métiers (`metierPrincipal`, `metiers[]`, `intentions[]` des artisans) sont des **identifiants du référentiel `referentiel/recherche`**, jamais du texte libre : voir COMPTES.md §3.1 bis.
Les comptes, entreprises et équipes multi-utilisateurs (`roles[]`, `membres`, `invitations`, `revendications`, `etablissements`, `sirenIndex`, custom claims) sont décrits dans **`COMPTES.md`**, qui **prime** sur les §2 et §3 de ce document en cas d'écart.

---

## 16. Index de toutes les collections (liste de contrôle)

À cocher au lot 2 : chaque collection a un schéma Zod, ses règles, ses index et sa durée de conservation.

| Domaine | Collections |
|---|---|
| Comptes | `users` (+ `consentements`, `notifications`), `admins`, `rolesAdmin`, `invitations`, `revendications`, `demandesAcces`, `sirenIndex` |
| Artisans | `artisans` (+ `prive/facturation`, `membres`, `etablissements`, `documents`, `realisations`, `statsJour`), `artisansPublic`, `artisanScores`, `sanctions`, `notesInternes` |
| Demandes | `demandes` (+ `attributions`, `messages`), `dossiersDiag` (+ `attributions`), `matching`, `matchingConfig` (+ `versions`) |
| Demandes partenaires | `sourcesDemandes`, `importsDemandes`, `preuvesConsentement` |
| Appels d'offres et crédits | `appelsOffres` (+ `deblocages`, `reponses`, `historiquePrix`), `grillesTarifaires`, `achatsLeads`, `portefeuilles` (+ `mouvements`), `packsCredits`, `remboursementsLeads` |
| Avis | `avis` (+ `signalements`) |
| Facturation | `abonnements`, `factures`, `paiements`, `codesPromo`, `stripeEvents` |
| Référentiels | `referentiel/*`, `communes`, `stats/public`, `config/app`, `annonces` |
| Support et journaux | `contacts`, `litiges`, `emails`, `suppressions`, `evenements`, `auditLog`, `rateLimits`, `rgpdDemandes`, `filesModeration` |
| Conversion | `prospects`, `cycleEtat`, `cycleTraces`, `cycleStats`, `sequences` (+ `versions`), `config/cycle` |
| Comportement | `pagesSuivies`, `comportementSessions`, `comportementAgregats`, `comportementAlertes`, `abTests`, `config/comportement` |
| IA | `iaContexte`, `iaAnalyses`, `iaRecommandations`, `iaQuotas`, `iaRedactions`, `config/ia` |
| Parcours | brouillons de parcours (REPRISE_PARCOURS.md), `brouillonsOnboarding`, `simulations` |
