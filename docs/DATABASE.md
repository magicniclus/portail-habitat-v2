# Modèle de données : Firestore et Storage

Région : **`eur3` (multi-région UE)** pour Firestore, **`europe-west1`** pour Storage et Functions.
Conventions : `camelCase`, dates en `Timestamp`, montants en **centimes entiers** (`number`), identifiants Firestore auto sauf mention contraire. Chaque document porte `createdAt`, `updatedAt` et, pour les objets supprimables, `deletedAt` (suppression logique).

---

## 1. Vue d'ensemble

```
users/{uid}                          ← profil commun (particulier | artisan | admin)
  └─ notifications/{id}
  └─ consentements/{id}
  └─ appareilsPush/{id}              ← jetons FCM (serveur seulement)
  └─ plans/{planId}                  ← plans Dessin du particulier (§8 quater)
       └─ historique/{n}

artisans/{artisanId}                 ← entreprise (1 artisan = 1 entreprise, n membres)
  ├─ membres/{uid}
  ├─ etablissements/{id}
  ├─ documents/{docId}               ← assurances, Kbis, certifications (PRIVÉ)
  ├─ realisations/{id}
  ├─ disponibilites/{yyyy-mm}
  ├─ statsJour/{yyyy-mm-dd}
  ├─ devis, facturesClients, modelesDevis, prestationsBiblio, clients,
  │  parametresFacturation/actuels, compteurs/{devis|factures}   ← §8 bis
  ├─ plans/{planId}                  ← plans Dessin de l'entreprise (§8 quater)
  │    └─ historique/{n}
  └─ prive/facturation               ← stripeCustomerId etc. (PRIVÉ)
  (`zones/{id}` prévu au départ n'existe pas : la zone est dans `zoneIntervention` et dans `etablissements`)

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

-- ajoutés pendant les lots (liste complète : packages/firebase/src/chemins.ts) --
sites/{artisanId} (+ sous-collections), sitesSlugs/{slug}, sitesDomaines/{hôte}   ← §15 bis
partagesPlans/{empreinte}            ← liens de partage des plans Dessin (§8 quater)
studioProjets, studioTendances, studioIdees, studioComptes, studioPublications,
studioSeries, studioReglages         ← Studio vidéo (§15 quinquies)
brouillons/{id}, brouillonsOnboarding/{id}   ← reprise des parcours (REPRISE_PARCOURS.md, COMPTES §3.2)
invitations, revendications, demandesAcces, sirenIndex/{siren}, cacheSirene   ← COMPTES.md
idempotence/{clé}, simulations/{id}, migrations/{id}, recherchesSecteur/{id}, suppressions/{hash}
config/flags (+ artisans/{id}), config/preuveSociale, config/comportement, config/ia, config/cycle
capturesEmulateur/{id}               ← émulateur seulement (tests de bout en bout)
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

Champs ajoutés pendant les lots (schéma `utilisateur`, `packages/core/src/schemas/comptes.ts`) : `entreprises: string[]` (≤ 10) et `entrepriseActive?` (au lieu d'un seul `artisanId`, COMPTES.md), `fournisseurs` (`password`, `lien`, `google`, `telephone`), `origine` (`inscription`, `demande`, `onboarding_pro`, `invitation`, `admin`), `encartsMasques?` (PAIEMENTS §4). Le client ne peut modifier que `prenom`, `nom`, `nomAffiche`, `adresse`, `preferences`, `entrepriseActive` ; le téléphone et l'email changent par le serveur (vérification par code).

### `users/{uid}/appareilsPush/{id}`
Jeton FCM d'un appareil qui a accepté les notifications push (flag `notificationsPush`). Écrit et lu par le serveur seulement.

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
| `bannieres` | string[] (≤ 5) | Storage ; 5 avec la visibilité payante (`droits.ficheMiseEnAvant`), 1 sinon ; écrit par le serveur seulement |
| `cadrageBanniere` | `'haut' \| 'centre' \| 'bas'` ? | Partie gardée visible des bannières rognées (`object-position`) ; centre si absent ; écrit par le serveur (`fiche.modifier`) |
| `videoUrl` | string? | Storage (MP4, WebM, OGG, 50 Mo) |
| `labels` | string[] | `decennale`, `rge`, `qualibat`, `local`, `rapide`, `recommande`, `photos`, `devis48` |
| `labelsVerifies` | `{ [label]: { verifieLe, expireLe?, docId } }` | seuls les labels vérifiés sont affichés |
| `zoneIntervention` | `{ centre: GeoPoint, geohash, rayonKm, communes: string[] }` | `rayonKm` **10 à 100** (défaut 30), accepté avec la clause CGV Pro §1 bis (`rayonAccepteLe`) |
| `source` | `'direct' \| 'facebook' \| 'prospect' \| 'admin'` | canal d'acquisition (UTM à l'inscription) |
| `rge` | `{ verifie: bool, domaines: string[], expireLe }` | condition pour recevoir les demandes éligibles aux aides |
| `demandeOfferteUtilisee` | bool | une seule demande offerte par entreprise (CONVERSION §3 bis) |
| `budgetMin`, `budgetMax` | number (centimes) | → filtre budget |
| `budgetCle` | `'petit' \| 'moyen' \| 'grand'` | calculé |
| `delaiDispoJours` | number | → filtre disponibilité (mis à jour par l'artisan ou chaque nuit) |
| ~~`plan`, `planPeriode`, `planExpireLe`, `optionVisibilite`, `optionVisibiliteExpireLe`~~ | — | **abandonnés** : remplacés par `droits` (§8, PAIEMENTS §5), écrit par le webhook Stripe uniquement ; ces champs n'existent plus dans le schéma |
| `droits` | objet (§8) | `formule`, droits de la formule, `optionBlog`, `statut` (`actif`, `grace`, `resilie_fin_periode`), `finPeriode`, `majLe` ; **webhook Stripe uniquement** |
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

Champs ajoutés pendant les lots (schéma `artisan`, `packages/core/src/schemas/artisans.ts`) :
- `intentions: string[]` (chantiers acceptés, identifiants du référentiel `referentiel/recherche`, COMPTES §3.1 bis) ;
- `zoneIntervention.rayonAccepteLe` (acceptation de la clause CGV Pro §1 bis ; les règles refusent qu'un client la modifie) ;
- `sirenReconnu?: { par: 'repertoire' | 'moderateur', le }` : condition de la mise en ligne (décision du 15/11/2026, parcours d'inscription), écrit par le serveur seulement ;
- `horsLigneVolontaire?` : interrupteur « En ligne » coupé par l'artisan (plus de mise en ligne automatique) ;
- `attributions7j?`, `tauxRefus30j?` : écrits par `scoresNuit`, lus par le matching ;
- `nbMembres`, `siegesMax` (webhook Stripe uniquement), `proprietaireUid?`, `origine` (`onboarding`, `admin`, `import`), `revendiquee` (COMPTES §3.5) ;
- `acquisition?` (landings, voir « Acquisition » en fin de document) ;
- `adresseSiege.ligne1` facultatif (ville et code postal suffisent).

### `artisans/{id}/prive/facturation` (lecture par le propriétaire et les admins, écriture par le serveur uniquement)
`stripeCustomerId`, `stripeSubscriptionId`, `stripeVisibiliteSubscriptionId`, `adresseFacturation`, `emailFacturation`, `defaultPaymentMethodLast4`, `defaultPaymentMethodBrand`.

### `artisans/{id}/membres/{uid}`
`role: 'proprietaire' | 'gerant' | 'collaborateur' | 'comptable'`, `statut` (`actif`, `suspendu`), `permissions?`, `notifs { demandes, avis, factures }`, `metiers?`, `plafondCreditsMois?`, `ajouteLe`, `ajoutePar`, `invitationId?`, `derniereActivite?` (détail : COMPTES.md). Les règles de sécurité vérifient l'appartenance ici (`statut == 'actif'` pour les écritures).

### `artisans/{id}/documents/{docId}` (PRIVÉ : membres en lecture, admins en lecture et écriture)
`type` (`kbis`, `decennale`, `rc_pro`, `rge`, `qualibat`, `piece_identite`, `urssaf_vigilance`), `storagePath`, `nomFichier`, `mime`, `tailleOctets`, `sha256`, `statut` (`en_attente`, `valide`, `refuse`, `expire`), `valideDu`, `valideAu`, `motifRefus`, `verifiePar`, `verifieLe`, `createdAt`. **Suppression automatique** 3 ans après la fin de la relation.

### `artisans/{id}/realisations/{id}`
`titre`, `description`, `metier`, `ville`, `budget` (centimes), `photos: [{ url, storagePath, largeur, hauteur }]`, `autorisationProprietaire: bool` (**obligatoire**, voir CGV §9), `publie`, `ordre`, `createdAt`.

### `artisans/{id}/statsJour/{yyyy-mm-dd}` (écrit par Function)
`vuesFiche`, `vuesAnnuaire`, `clicsTelephone`, `clicsDevis`, `demandesRecues`, `demandesRepondues`, `devisEnvoyes`, `devisAcceptes`, `sources: { annuaire, recherche, direct, diagnostic }`. Alimente `Statistiques.dc.html`.
> Alimentés aujourd'hui (lot 14) : `vuesFiche`, `clicsTelephone`, `clicsDevis` (`POST /api/fiche/evenement`, compteur anonyme) et `demandesRecues` (à l'attribution). **Pas encore fait** : `vuesAnnuaire`, `demandesRepondues`, `devisEnvoyes`, `sources`.

### `artisansPublic/{artisanId}` (**lecture publique**, écriture par Function uniquement)
Projection dénormalisée, recalculée à chaque changement de `artisans/{id}` par un trigger `onDocumentWritten`. Contient **uniquement** les champs affichables :
`slug`, `nomCommercial`, `metiers`, `metierPrincipal`, `intentions`, `tags`, `pitch`, `description`, `logoUrl`, `bannieres` (permises par la formule), `cadrageBanniere` (avec des bannières), `videoUrl`, `ville`, `geo`, `geohash`, `rayonKm`, `labels` (vérifiés et non expirés seulement), `noteMoyenne`, `nbAvis`, `notesCriteres`, `anneesActivite`, `budgetMin`, `budgetMax`, `budgetCle`, `delaiDispoJours`, `dispoLabel`, `misEnAvant: bool` (remplace `premium` : priorité d'affichage, droit `ficheMiseEnAvant`), `partenaire?` (formule Tout inclus), `badgeRecommande`, `argumentPremium`, `telephone` (**null sans le droit `coordonneesVisibles`**), `scoreClassement` (précalculé), `enLigne`, `updatedAt`. Schéma **strict** : un champ en trop fait échouer l'écriture.
> Calculée par une seule fonction, `projeterArtisanPublic`, partagée par le déclencheur `projeterArtisan` et le seed. Cette collection est aussi celle qui est **indexée dans Typesense** quand Typesense est configuré (D4) ; sinon l'annuaire lit Firestore.

### `pagesSecteur/{metier}__{commune}` (**lecture publique**, écriture serveur uniquement ; SEO local, 24/11/2026)
Registre des pages « métier à une commune » (`/metiers/{metier}/{commune}`). Créée par le déclencheur `suivrePagesSecteur` (sur `artisansPublic`) pour chaque métier d'un artisan en ligne, dans **sa commune et les communes de 5 000 habitants et plus de son rayon** (20 au plus, API Découpage administratif) ; jamais supprimée.
Champs : `schemaVersion`, `metier`, `commune` (`nom`, `slug`, `codePostal`, `departement`, `population`, `centre`), `geohash` (centre de la commune), `nbArtisans` (artisans en ligne du métier à 20 km, mêmes lectures et filtres que l'annuaire), `indexable` (`nbArtisans ≥ 1` et non bloquée), `bloquee` (admin), `texte?` (`intro`, `sections[]`, `faq[]`, `faits[]` avec leur source https), `texteEtat` (`absent` | `pret` | `echec`), `texteModele?`, `texteGenereLe?`, `texteEssais`, `texteErreur?`, `texteVerrou?` (rédaction en cours, 10 min), `creeeLe`, `majLe`.
Écritures : déclencheur `suivrePagesSecteur` (création, recomptage des pages voisines, seulement si quelque chose change), `pagesSecteurNuit` (recomptage complet, rattrapage des textes), `textePageSecteur` (texte IA), admin (`adminPageSecteur` : bloquer, débloquer, réécrire, journalisé). Index : (`metier`, `indexable`, `commune.departement`), (`metier`, `indexable`), (`metier`, `texteEtat`), (`indexable`, `texteEtat`), (`commune.slug`, `indexable`). Dépense IA du mois : `iaQuotas/pagesSecteur_{AAAA-MM}`.

---

## 4. Demandes de travaux (simulateur)

### `demandes/{demandeId}`
| Champ | Type | Notes |
|---|---|---|
| `reference` | string unique | `PT-XXXXXX` |
| `source` | `'simulateur' \| 'hero' \| 'fiche_artisan' \| 'annuaire' \| 'partenaire' \| 'site_artisan'` | `partenaire` = demande importée du simulateur d'aides (§4 bis) ; `site_artisan` = formulaire du site de l'artisan, attribuée directement, hors matching (§15 bis) |
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
| `miseEnRelation` | bool | case « jusqu'à 3 artisans » |
| `contactSouhaite` | `'telephone' \| 'ecrit_uniquement'`, facultatif | D90 : « Recevoir des devis par écrit, sans être appelé » ; le téléphone n'est jamais renvoyé aux artisans (liste des demandes, préremplissage du devis) |
| `planJoint` | `{ planId, proprietaireId }`, facultatif | DES-44 : plan du particulier **connecté** (vérifié dans la transaction de création). **Aucun jeton** : l'artisan qui a accepté la demande le lit par `/pro/demandes/{id}/plan` (accès revérifié à chaque lecture, `lirePlanJoint`) ; si le client met le plan à la corbeille ou le supprime, l'artisan ne voit plus rien (décision du 18/11/2026) |
| `artisanCibleId` | string? | si la demande part d'une fiche |
| `statut` | `'nouvelle' \| 'en_attribution' \| 'attribuee' \| 'devis_recus' \| 'signee' \| 'close' \| 'annulee' \| 'spam'` | |
| `nbAttributions` | number (≤ 3) | |
| `consentementId` | string | lien vers le journal ; pour les demandes partenaires, pointe vers `preuvesConsentement` |
| `ipHash`, `userAgent` | string | anti-fraude |
| `createdAt`, `updatedAt`, `expireLe` | | anonymisée après 3 ans par `purgesNuit` (pas de TTL : statistiques gardées), `anonymiseeLe` posé |

Champs ajoutés pendant les lots (schéma `demande`, `packages/core/src/schemas/demandes.ts`) : `intention?` (intention de recherche choisie), `partenaire.cleDoublon` (empreinte téléphone + prestation, doublons 30 jours), `metierRequis?`, `qualiteLead?`, `moderation?`, `appelOffresId?` (MATCHING), `invendueLe?`, `archiveeLe?` (demandes partenaires sans preneur, CONVERSION §3 bis), `contestationsAcceptees?`, `douteux?` (ADMIN §2.5).

### 4 bis. Demandes importées d'un site partenaire (simulateur d'aides)

#### `sourcesDemandes/{id}` (admin)
`nom` (« Simulateur aides »), `actif`, `cleApiHash` (clé du webhook, Secret Manager), `ipAutorisees[]`, `coutUnitaireCentimes` (700), `mappingPrestations` (types du partenaire → `prestationId` du référentiel), `texteConsentementAttendu` (version), `quotaJour`, `createdAt`.

#### `importsDemandes/{id}` (ajout seul, écrit par la Function d'import)
`sourceId`, `idExterne` (**unique par source** : idempotence), `recueLe`, `statut` (`creee` → `demandes/{id}`, `doublon`, `rejetee`), `motifRejet?` (`consentement_absent`, `telephone_invalide`, `hors_zone_couverte`, `doublon_30j`, `schema_invalide`), `demandeId?`, `payloadHash`. **Aucune donnée personnelle** (elles vont dans la demande). TTL 13 mois.

#### `preuvesConsentement/{id}` (ajout seul, jamais modifié)
`sourceId`, `idExterne`, `texteAffiche` (texte exact de la case cochée), `versionTexte`, `coche: true`, `horodatage` (fourni par le partenaire), `urlPage`, `ipHash`, `userAgentHash`, `finalites` (`transmission_portail_travaux`, `mise_en_relation_professionnels`, `rappel_telephonique`), `recueLe`. Conservé **5 ans** après la dernière utilisation de la demande (preuve RGPD et démarchage). Une demande sans preuve complète est **rejetée**.

#### Règles de traitement (Function `importerDemandePartenaire`, webhook HTTPS)
1. Authentification par clé + IP autorisée, validation Zod, idempotence sur `idExterne`.
2. Rejet si consentement absent ou texte différent de la version attendue.
3. Doublon : même téléphone + même prestation dans les 30 jours → `doublon` (non facturé par le partenaire, voir contrat).
4. Qualification : téléphone valide (format + opérateur ; code SMS si le partenaire ne l'a pas vérifié), statut d'occupation, horizon, éligibilité aux aides → `qualification.score` et `niveau` A / B / C.
5. Création de `demandes/{id}` (`source: 'partenaire'`) puis **le matching standard** démarre (MATCHING.md) : `rgeRequis` filtre les artisans RGE vérifiés ; prix de l'appel d'offres selon le niveau (`grillesTarifaires` : A plein tarif, B −30 %, C −60 %).
6. Délai cible réception → première proposition à un artisan : **< 5 minutes** (supervisé, alerte si > 15 min).
7. Invendue après 24 h → demande offerte (CONVERSION §3 bis) ; après 72 h → archivée, jamais revendue.

### `demandes/{id}/attributions/{artisanId}`
`artisanId` (copie de l'identifiant du document, **obligatoire** pour les requêtes collection group), `demandeId`, `assigneA?`, `statut` (`proposee`, `vue`, `acceptee`, `refusee`, `devis_envoye`, `devis_accepte`, `devis_refuse`, `expiree`), `exclusive`, `rang?`, `proposeeLe`, `expireLe?`, `expireLeSiVue?` (demande partenaire : échéance normale appliquée à l'ouverture, 2 h sinon), `vueLe`, `reponduLe`, `devis: { montantCentimes, storagePath, envoyeLe }?`, `motifRefus`, `coordonneesDebloquees: bool`, `scoreMatching`, `appelOffresId?`, `suivi?: { etape, note?, relanceLe?, majLe, majPar }`.
> `suivi` : suivi façon CRM de « Mes demandes » (`@ph/core/espace-pro`, `ETAPES_SUIVI`), écrit par le serveur (route `POST /api/pro/demandes/suivi` → `majSuiviDemande`, droit `demandes.repondre`) une fois la demande acceptée. `etape` ∈ `a_appeler`, `appele`, `rdv`, `devis_a_faire`, `devis_envoye`, `gagne`, `perdu` (`nouvelle` avant l'acceptation, jamais choisie). Note privée à l'entreprise. Sans effet sur `statut`, la facturation ou les statistiques. **À noter** : `suivi` n'est pas encore déclaré dans le schéma Zod `attribution` (écrit par chemins pointés).
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

**Formule** (`packages/core/src/leads/prix.ts`, testée) :
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
| `reference` | `PTD-XXXXXX` |
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
| `auteurEmail` | string | **privé**, jamais exposé en public |
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

> **Changement fait pendant les lots** : le document `avis/{id}` est lisible publiquement une fois publié ; il ne contient donc **aucune donnée sur l'auteur**. `auteurUid`, `auteurEmail`, `ipHash`, `userAgent` et `cleUnicite` (empreinte email + artisan + mois de chantier) sont dans `avis/{id}/prive/auteur` (lu par la modération avec le droit `pii`, schéma `auteurAvis`). Schéma strict.

Invariants **appliqués par le serveur** : un seul avis publié par (`auteurEmail`, `artisanId`, `finChantier`) ; l'auteur ne peut pas être membre de l'artisan ; à chaque passage en `publie` ou `retire`, recalcul de `noteMoyenne`, `nbAvis`, `notesCriteres` et `tauxRecommandation` sur l'artisan.

### `avis/{id}/signalements/{id}`
`parUid?`, `parRole`, `motif`, `details`, `statut` (`ouvert`, `traite`, `rejete`), `createdAt`.

---

## 8. Facturation (miroir Stripe, écrit par les webhooks uniquement)

### `abonnements/{stripeSubscriptionId}`
`artisanId`, `produit` (`fiche_pro`, `site_pro`, `pack_fiche_site`, `tout_inclus`), `priceId`, `periode` (`mensuel`), `statut` (miroir de Stripe : `trialing`, `active`, `past_due`, `canceled`, `unpaid`, `incomplete`), `debutPeriode`, `finPeriode`, `annulationFinPeriode: bool`, `annuleLe?`, `codePromo?`, `createdAt`, `updatedAt`.

### `factures/{stripeInvoiceId}`
`artisanId`, `numero`, `montantHtCentimes`, `tvaCentimes`, `montantTtcCentimes`, `devise: 'eur'`, `statut`, `pdfUrl`, `hostedUrl`, `periodeDebut`, `periodeFin`, `payeeLe`, `createdAt`.

### `paiements/{paymentIntentId}`
`artisanId`, `montantCentimes`, `statut`, `last4`, `brand`, `echecMotif?`, `createdAt`.

### `codesPromo/{code}`
`stripePromotionCodeId`, `couponId`, `pourcentage` (ex. 30), `duree` (`once`), `produits`, `actif`, `utilisations`, `maxUtilisations`, `expireLe`, `source` (`admin`, `conversion`), `artisanId?` (code personnel), `modele?` (email qui l'a créé), `creePar`.

### `artisans/{id}.droits` (webhook uniquement, PAIEMENTS §5)
`formule`, `ficheMiseEnAvant`, `badgeRecommande`, `photosIllimitees`, `coordonneesVisibles`, `statsDetaillees`, `sitePro`, `iaSite`, `iaMultiplicateur`, `remiseAppelsOffres`, `avanceAppelsOffresH`, `supportPrioritaire`, `statut`, `finPeriode`, `majLe`. Remplace `plan` et `optionVisibilite` (migration : Visibilité → `fiche_pro`, Premium → `tout_inclus`).

### `stripeEvents/{eventId}`
`type`, `traiteLe`, `ok: bool`, `erreur?`. **Idempotence** : tout événement déjà présent est ignoré.

---

## 8 bis. Devis et factures des artisans (gratuit, toutes formules)

### `artisans/{id}/devis/{devisId}` (membres en lecture/écriture selon rôle)
`numero` (`D-{aaaa}-{nnnn}`, compteur transactionnel `artisans/{id}/compteurs/devis`), `statut` (`brouillon`, `envoye`, `accepte`, `refuse`, `expire`, `archive`), `client: { nom, email, tel?, adresse, complement?, codePostal?, ville?, pays? }`, `demandeId?` (créé depuis « Mes demandes »), `modeleId?`, `objet`, `descriptionHtml` (b, i, u, a, ul, ol uniquement, assaini côté serveur), `typeClient` (`particulier`, `pro`), `sirenClient?` (obligatoire si `pro`), `horsEtablissement: bool` (signé au domicile → rétractation 14 j + formulaire annexé), `debutTravauxLe`, `dureeEstimee`, `fraisDeplacement` (texte ou centimes), `devisGratuit: bool`, `mentionsOk: bool` + `mentionsManquantes: string[]` (calculés serveur, bloquent l'envoi), `lignes: [{ type?: 'chiffree'|'texte' (absent = chiffrée ; une ligne de texte est hors totaux), nature?: 'prestation'|'fourniture', designation, quantite, unite, puHtCentimes, tva: 5.5|10|20, coutHtCentimes? }]`, `remisePct`, `acomptePct`, options de l'éditeur A4 (facultatives, aussi sur les factures) : `modeSaisie?: 'rapide'|'complet'`, `adresseChantier?`, `tvaIntraClient?`, `intitule?`, `conditionsAcceptation?`, `champSignature?: bool`, `champLibre?: { titre, texte }`, `totaux: { htCentimes, tva: {taux: centimes}, ttcCentimes }`, `margeHtCentimes` (privé, jamais dans le PDF), `validiteLe`, `notes`, `signatureElectronique: bool`, `tampon: bool`, `envoiLe?`, `signature?: { nom, ip, le, hashPdf }`, `pdfPath`, `factureId?`, `factureBrouillonId?` (brouillon de facture préparé par « Transformer en facture », retiré à l'émission), `createdAt`, `updatedAt`.

### `artisans/{id}/facturesClients/{id}`
`numero` (`F-{aaaa}-{nnnn}`, **sans trou**, compteur transactionnel, jamais réutilisé), `devisId?`, `devisNumero?` (aussi sur un brouillon préparé depuis un devis : à l'émission, devis vérifié, acomptes déduits, `devis.factureId` posé), `type` (`facture`, `acompte`, `avoir`), `statut` (`brouillon`, `emise`, `partiellement_payee`, `payee`, `impayee`), mêmes `client`, `lignes`, `totaux`, `echeanceLe`, `paiements: [{ montantCentimes, moyen: 'virement'|'cheque'|'especes'|'carte', le, ref? }]`, `resteCentimes`, `penalites: { tauxAnnuel, indemnite: 4000 }`, `relances: [{ le, type }]`, `lienPaiement?` (Stripe Connect, ⏳ D61), `pdfPath`, `emiseLe`. Une facture émise n'est **plus modifiable** : correction = avoir. Créée depuis un devis (« Transformer en facture », acompte) ou sans devis (« Nouvelle facture », éditeur A4 : `devisId` absent, émise directement) ; options de présentation reprises (`modeSaisie`, `tvaIntraClient`, `champLibre`), `lieuExecution` = adresse du chantier du devis sinon celle du client.

### `artisans/{id}/modelesDevis/{id}` · `artisans/{id}/prestationsBiblio/{id}` · `artisans/{id}/parametresFacturation` (document unique)
Modèles (`titre`, `lignes`, `usage`) ; bibliothèque = lignes types (`type?` chiffrée ou texte, `nature?`, `designation`, `unite`, `puHtCentimes`, `tva`, `coutHtCentimes`) ; paramètres (`raisonSociale`, `formeJuridique`, `capitalSocial`, `adresseSiege`, `siret`, `rne`, `tvaIntra`, `franchiseTva: bool` (→ « TVA non applicable, art. 293 B du CGI »), `tvaSurDebits: bool`, `assuranceDecennale: { assureur, contrat, zone }` (**obligatoire** sur devis et factures, art. L243-2 C. assurances), `rcPro?`, `mediateur: { nom, adresse, site }` (obligatoire pour les particuliers), `logo: Media`, `tampon: Media?`, `iban` (chiffré), `delaiPaiementJours`, `acompteDefautPct`, `validiteDevisJours`, `tvaDefaut`, `plateformeAgreee?` (facturation électronique, voir §8 ter)).

### 8 ter. Mentions obligatoires et PDF
- **Devis** (BTP) : identité complète de l'entreprise, assurance décennale (assureur, n°, zone), date et validité, client et adresse du chantier, SIREN client si pro, détail (désignation, quantité, PU HT, TVA), totaux HT/TVA/TTC, date de début et durée, frais de déplacement, conditions de paiement et pénalités (+ indemnité 40 € si pro), devis gratuit ou payant, médiateur (particulier), rétractation 14 j + formulaire (signé à domicile), attestation TVA réduite (5,5 % / 10 %), mention « Devis reçu avant l'exécution des travaux » + « Bon pour accord ».
- **Facture** : numéro chronologique sans trou, dates d'émission et de prestation, référence du devis, échéance, « pas d'escompte », pénalités (+ 40 € si pro), assurance décennale, et les **4 mentions de la réforme** : SIREN du client, adresse de livraison/exécution si différente, nature de l'opération (prestation de services), option TVA sur les débits le cas échéant.
- Fonction pure `verifierMentions(doc, parametres)` (`packages/core/src/devis/mentions.ts`, testée) : utilisée par l'écran (liste ✓/!) **et** par la Function d'envoi (refus si incomplet).
- **PDF** : généré **côté serveur** par le site (`@ph/emails/pdf`, **pdfkit**), stocké `Storage artisans/{id}/devis/{num}.pdf` (factures : `artisans/{id}/factures/{num}.pdf`), empreinte SHA-256 enregistrée à l'envoi et à la signature ; le PDF téléchargé est identique, octet pour octet, à celui reçu par le client. Jamais affiché en aperçu dans l'éditeur : bouton **Télécharger le PDF** uniquement. *Abandonné* : la Function `genererPdfDevis` avec Chromium headless prévue au départ (pdfkit est beaucoup plus léger et moins cher, AVANCEMENT lot devis).
- **Facturation électronique** : réception obligatoire pour toutes les entreprises depuis le 1er septembre 2026 ; **émission obligatoire pour les TPE/PME au 1er septembre 2027** (B2B, via une plateforme agréée, format Factur-X/UBL/CII) + e-reporting des opérations B2C. Prévoir l'export **Factur-X** dès le lancement et le raccordement à une plateforme agréée avant septembre 2027 (⏳ D62).

## 8 quater. Dessin : plans 2D / 3D (lot 15, DESSIN.md §4)

> **État au 19/11/2026** : lot 15 fait jusqu'à 15j, recette 15k en cours. **Rien n'est en production** : flags `dessin` (Mes plans, Dessin de l'espace pro, API) et `dessinPublic` (landing `/dessin`, essai sans compte) **éteints par défaut** (`packages/core/src/flags.ts`). Flag `dessin` éteint : l'API `/api/dessin/{operation}` répond « introuvable ».

### `users/{uid}/plans/{planId}` · `artisans/{aid}/plans/{planId}`
Métadonnées (schéma `planDessin`, `packages/core/src/schemas/dessinPlan.ts`) : `titre` (≤ 120), `versionCourante` (révision +1 à chaque enregistrement, contrôle des conflits), `storagePath` (scène courante gzip), `derniereVersionLe`, `courantDansHistorique`, `taille` (≤ 5 Mo), `apercu?` (chemin SVG des murs du rez-de-chaussée dans un carré de 100, ≤ 4 000 caractères, calculé par le serveur à chaque enregistrement : aperçu de « Mes plans », DES-02), `vignettePath?`, `creeLe`, `majLe`, `supprimeLe` (corbeille 30 jours), `demandeId?`, côté entreprise seulement `clientNom?` et `auteurUid`. Lecture : le particulier lui-même ; côté entreprise l'équipe opérationnelle (claims p, g, c), jamais le staff. **Aucune écriture client** : tout passe par `@ph/firebase/dessin` via `POST /api/dessin/{operation}` (scène validée et migrée par `migrerScene`, quota de 5 plans actifs pour un particulier, permission `dessin.gerer` relue en base côté entreprise, débit limité par opération).

### `…/plans/{planId}/historique/{numero}`
Versions gardées (schéma `versionPlan`) : `numero`, `storagePath`, `auteurUid`, `type` (`auto` toutes les 10 minutes d'édition, `manuelle` nommée, `restauration`), `nom?` (≤ 80), `taille`, `creeLe`. Le fichier est partagé avec la scène courante quand elle est gardée (aucune copie). Au-delà de 50 versions, celles de plus de 30 jours sont supprimées. Nommée `historique` et non `versions` : le groupe de collections `versions` sert déjà aux sites. (Le commentaire du schéma parle encore de `…/versions/{id}` : c'est bien `historique`, voir `chemins.versionsPlan`.)

### `partagesPlans/{empreinte}`
Lien de partage en lecture seule (DES-42, page `/plan/[jeton]`). Le jeton (32 caractères base64url, 192 bits) **n'est jamais stocké** : l'identifiant du document est son SHA-256, le lien n'est montré qu'une fois, à sa création ; la liste et la révocation désignent le lien par cette empreinte. Champs : `proprietaire { type: 'particulier' | 'entreprise', id }`, `planId`, `versionId` (toujours `'courante'` aujourd'hui : le schéma accepte une version figée, **pas encore utilisée**), `expireLe` (**toujours** une date de fin, 1 à 365 jours, 30 par défaut ; l'écran propose 7, 30, 90 jours ou 1 an), `revoque`, `creeLe`. Aucune donnée personnelle hors l'identifiant du propriétaire. Lu et écrit par le serveur uniquement (aucune règle : refus par défaut). Supprimé avec le plan (purge de la corbeille, suppression de compte). La scène servie retire Lambert-93, photo aérienne, référence cadastrale, commune et image importée ; les jetons sont retirés des URL envoyées à Sentry.

### Plan joint à une demande (DES-44, D90, D93)
Champs `demandes.planJoint { planId, proprietaireId }` et `demandes.contactSouhaite` (§4). Le plan reste chez le particulier : **aucun jeton ni copie** ; l'artisan qui a accepté la demande le lit par `/pro/demandes/{id}/plan` (`lirePlanJoint`, accès revérifié à chaque lecture) ; plan mis à la corbeille ou supprimé → « Le client a retiré son plan ».

### Storage `dessin/{particulier|entreprise}/{id}/{planId}/…`
Scènes compressées (`r{revision}-….json.gz`), plan importé (`fond-….{jpg|png|webp}`) et galerie photo (`photos/photo-{horodatage}-….jpg`, 30 au plus, JPEG vérifié, lot 15g). Tout le dossier part avec le plan (purge de la corbeille, suppression de compte). Couvert par la règle finale de `storage.rules` (refus total) : lecture et écriture par le serveur uniquement, aucune modification des règles Storage.

### Purge et RGPD
`purgeDessinNuit` (3 h 40) supprime les plans à la corbeille depuis plus de 30 jours, versions et fichiers compris (index de groupe de collections `plans.supprimeLe`). L'export « Mes données » inclut les plans et leurs scènes ; la suppression de compte efface tous les plans personnels, leurs fichiers et leurs liens de partage. **Fermeture d'une entreprise** (décision du 18/11/2026) : ses plans passent à la corbeille et sont supprimés 30 jours plus tard par la même purge.

## 9. Référentiels et contenu

### `referentiel/prestations/items/{id}`
`nom`, `pitch`, `repere`, `icone`, `ordre`, `actif`, `tva` (0,055 ou 0,10), `champs: [{ id, kind, label, aide, min?, max?, pas?, def?, unite?, etape, options?: [{ v, label, desc, coef? }] }]`, `formule` (identifiant de la fonction dans le code, `calcPeinture` par exemple), `parametres` (tous les prix unitaires sous forme de JSON, modifiables dans l'admin), `version`, `updatedAt`.
> La **formule** vit dans le code (`packages/core/src/simulateur/formules-*.ts`) ; les **nombres** vivent dans Firestore. Chaque demande garde la `versionReferentiel` utilisée. Les prix sont séparés des champs : `referentiel/{prestations|diagnostics}/prix/{id}`, lisibles par le serveur seulement (le prix n'est révélé qu'après l'envoi) ; import du référentiel réel : `pnpm referentiel:importer`.

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
- `evenements/{id}` : `type` (`vue_fiche`, `clic_tel`, `clic_devis`, `recherche`), `artisanId?`, `sessionId`, `meta`, `createdAt`. **TTL 13 mois** (politique Firestore).
- `auditLog/{id}` : `acteurUid`, `action`, `cible`, `avant`, `apres`, `motif?`, `ip`, `createdAt`. **Création seule, jamais modifié.** Inclut les consultations de données personnelles (`consultationPII`) et les exports.
- `rgpdDemandes/{id}` : `type` (`acces`, `rectification`, `effacement`), `demandeurUid?`, `email`, `recueLe`, `echeance` (+1 mois), `statut` (`a_traiter`, `traite`), `traitePar`, `preuveStoragePath`.
- `rateLimits/{hashIp_route}` : `compteur`, `fenetreDebut`. TTL 1 h.

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
| `artisansPublic` | `enLigne ==`, `misEnAvant` desc, `scoreClassement` desc |
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

**Ajoutés pendant les lots** (le fichier `firestore.indexes.json` fait foi, une centaine d'index) : attributions (groupe) `artisanId + proposeeLe`, `artisanId + statut`, `statut + expireLe`, `statut + reponduLe`, `exclusive + proposeeLe` ; demandes `particulierUid + createdAt`, `partenaire.cleDoublon + createdAt`, `metierRequis + createdAt`, `statut + createdAt` ; appels d'offres `artisansInvites`, `nbDeblocages`, `ouvertJusquau`, `completLe` ; emails (`modele`, `destinataire`, `uid`, `statut` + `createdAt`) ; auditLog (`acteurUid`, `action`, `cible` + `createdAt`) ; rgpdDemandes ; litiges ; `artisans` `metiers + droits.formule` ; comportement (sessions `page + jour`, `page + aReplay + createdAt` ; agrégats `page + appareil + jour` ; alertes `page + statut + gravite`) ; iaAnalyses (`cleCache`, `demandePar`) ; iaRecommandations `statut + faiteLe` ; blog `articles` (statut + date, catégorie, slug, `anciensSlugs`, groupe `statut + datePublication`) et `reglagesBlog` (groupe `actif + prochaineLe`) ; devis et facturesClients (groupe, échéances) ; `studioPublications` `statut + programmeeLe`.

**Index de champ (`fieldOverrides`)** : `plans.supprimeLe` (dont le groupe de collections, purge de la corbeille Dessin), `articles.supprimeLe`, `attributions.proposeeLe`, `prive.cleUnicite` et `prive.ipHash` (groupe).

**Champs TTL** (tous sur `expireLe`) : `brouillons`, `brouillonsOnboarding`, `evenements`, `recherchesSecteur`, `rateLimits`, `idempotence`, `importsDemandes`, `comportementSessions`, `cycleTraces`, `iaQuotas`, `iaRedactions`, `emails`, `simulations`, `cacheSirene`, `prospects`. `demandes` et `dossiersDiag` n'ont **pas** de TTL : ils sont anonymisés à `expireLe` par `purgesNuit` (§14).

---

## 12. Règles de sécurité Firestore

### Claims utilisés (posés par `syncClaims`, jamais par le client)
```
roles:  ['particulier', 'artisan']          // cumulables
ent:    { [artisanId]: 'p' | 'g' | 'c' | 'x' }   // proprietaire, gerant, collaborateur, comptable (≤ 10)
staff:  { r: 'superadmin' | 'admin' | … | 'custom_xxx', s: ['art','dem','ao','avi','lit','fin','cnv','cmp','ia','std','ref','mat','aud','rgpd','file'], pii: bool }
        // rôle + codes de LECTURE de section + accès aux données personnelles (ADMIN.md). Les écritures relisent admins/{uid}.
imp:    { par, cible } | absent              // impersonation en lecture seule
```
Les permissions fines de l'équipe interne (`admins/{uid}.permissionsEffectives`) sont vérifiées **côté serveur** (actions `actionAdmin()` du site et Functions), pas dans les règles. Les règles ne font que de la lecture par rôle.

Écarts du fichier réel avec la conception d'origine : le staff ne lit plus « tout » (`isStaff()`) mais seulement ses sections (`lit('art')`, `lit('dem')`…), et le profil `users/{uid}` n'est lisible par l'équipe qu'avec le droit `pii` ; le téléphone n'est plus modifiable par le client ; les consentements sont créés par le client avec une liste fermée de champs ; ajouts : `disponibilites`, devis et factures de l'artisan (§8 bis), `plans` et `historique` (§8 quater), `sites/**`, `historiquePrix`, `avis/{id}/prive`, `codesPromo`, `studioProjets`, `referentiel/recherche/*`, `config/comportement`, `config/ia`. `partagesPlans` n'a **aucune** règle (refus par défaut).

```js
// Copie de firestore.rules au 19/11/2026 (le fichier du dépôt fait foi).
rules_version = '2';

// Règles Firestore (docs/DATABASE.md §12, corrections du lot 2 listées dans docs/AVANCEMENT.md §8).
// Principes : tout est refusé par défaut ; les écritures sensibles passent par des Functions ;
// les lectures courantes s'appuient sur les claims, les écritures sur le document `membres`.
service cloud.firestore {
  match /databases/{db}/documents {

    // ---------- outils ----------
    function signedIn()  { return request.auth != null; }
    function tok()       { return request.auth.token; }
    function uid()       { return request.auth.uid; }
    function noImp()     { return !('imp' in tok()); }                  // aucune écriture en impersonation
    function hasRole(r)  { return signedIn() && ('roles' in tok()) && tok().roles.hasAny([r]); }
    function isStaff()   { return signedIn() && ('staff' in tok()); }
    function lit(sec)    { return isStaff() && tok().staff.s.hasAny([sec]); }  // lecture d'une section admin
    function pii()       { return isStaff() && tok().staff.get('pii', false) == true; }
    function isAdmin()   { return isStaff() && tok().staff.r in ['superadmin', 'admin']; }
    function isModo()    { return lit('avi') || lit('file'); }
    function isFinance() { return lit('fin'); }

    // appartenance par les claims (lectures courantes, sans lecture facturée)
    function entRole(aid)       { return signedIn() && ('ent' in tok()) && (aid in tok().ent) ? tok().ent[aid] : null; }
    function isMembre(aid)      { return entRole(aid) != null; }
    function isGestion(aid)     { return entRole(aid) in ['p', 'g']; }
    function isOperationnel(aid){ return entRole(aid) in ['p', 'g', 'c']; }

    // appartenance vérifiée en base (écritures : révocation immédiate)
    function cheminMembre(aid)  { return /databases/$(db)/documents/artisans/$(aid)/membres/$(uid()); }
    function isMembreActif(aid) { return signedIn() && exists(cheminMembre(aid)) && get(cheminMembre(aid)).data.statut == 'actif'; }
    function isGestionActif(aid){ return isMembreActif(aid) && get(cheminMembre(aid)).data.role in ['proprietaire', 'gerant']; }
    function isOperationnelActif(aid) {
      return isMembreActif(aid) && get(cheminMembre(aid)).data.role in ['proprietaire', 'gerant', 'collaborateur'];
    }

    function onlyChanged(keys) { return request.resource.data.diff(resource.data).affectedKeys().hasOnly(keys); }
    function changed(key)      { return request.resource.data.diff(resource.data).affectedKeys().hasAny([key]); }

    // ---------- utilisateurs ----------
    match /users/{u} {
      // Le profil contient des données personnelles : l'équipe interne ne le lit qu'avec le droit `pii`.
      allow read: if signedIn() && (uid() == u || pii());
      allow create, delete: if false;                          // créé par Function (demande, onboarding, invitation)
      // Le téléphone et l'email changent par Function (vérification par code) : pas ici.
      allow update: if signedIn() && uid() == u && noImp()
        && onlyChanged(['prenom', 'nom', 'nomAffiche', 'adresse', 'preferences', 'entrepriseActive', 'updatedAt'])
        && (!changed('entrepriseActive') || isMembre(request.resource.data.entrepriseActive));

      match /consentements/{id} {
        allow read: if signedIn() && (uid() == u || pii());
        allow create: if signedIn() && uid() == u && noImp()
          && request.resource.data.keys().hasAll(['schemaVersion', 'type', 'valeur', 'version', 'source', 'createdAt'])
          && request.resource.data.keys().hasOnly(['schemaVersion', 'type', 'valeur', 'version', 'source', 'createdAt', 'userAgent'])
          && request.resource.data.type in ['cgu', 'cgv', 'confidentialite', 'marketing_email', 'opposition_offres_pro',
                                            'cookies_mesure', 'cookies_pub', 'mise_en_relation']
          && request.resource.data.valeur is bool
          && request.resource.data.createdAt == request.time;
        allow update, delete: if false;                        // journal en ajout seul
      }
      match /notifications/{id} {
        allow read: if signedIn() && uid() == u;
        allow update: if signedIn() && uid() == u && noImp() && onlyChanged(['lu']) && request.resource.data.lu is bool;
        allow create, delete: if false;
      }
      // Plans Dessin (DESSIN.md §4) : métadonnées lues par leur auteur ; scène dans Storage et
      // écritures par le serveur uniquement (validation de la scène, quotas, conflits).
      match /plans/{p} {
        allow read: if signedIn() && uid() == u;
        allow write: if false;
        match /historique/{v} { allow read: if signedIn() && uid() == u; allow write: if false; }
      }
    }

    // ---------- artisans ----------
    match /artisansPublic/{id} { allow read: if true; allow write: if false; }

    match /artisans/{aid} {
      allow read: if isMembre(aid) || lit('art');
      allow update: if noImp() && isGestionActif(aid)
        && onlyChanged(['nomCommercial', 'pitch', 'description', 'tags', 'metiers', 'metierPrincipal', 'telephonePublic',
                        'emailContact', 'siteWeb', 'logoUrl', 'zoneIntervention', 'budgetMin', 'budgetMax', 'delaiDispoJours', 'updatedAt'])
        // Rayon de transmission de 10 à 100 km (CGV Pro §1 bis) ; son acceptation ne se falsifie pas.
        && (!changed('zoneIntervention') || (
              request.resource.data.zoneIntervention.rayonKm is int
              && request.resource.data.zoneIntervention.rayonKm >= 10
              && request.resource.data.zoneIntervention.rayonKm <= 100
              && request.resource.data.zoneIntervention.rayonAccepteLe == resource.data.zoneIntervention.rayonAccepteLe))
        && (!changed('pitch') || request.resource.data.pitch.size() <= 280)
        && (!changed('description') || request.resource.data.description.size() <= 3000);
      allow create, delete: if false;

      match /membres/{m}        { allow read: if isMembre(aid) || lit('art'); allow write: if false; }
      match /etablissements/{s} { allow read: if isMembre(aid) || lit('art'); allow write: if false; }
      match /documents/{d} {
        allow read: if isOperationnel(aid) || isModo() || lit('art');
        allow create: if noImp() && isOperationnelActif(aid)
          && request.resource.data.statut == 'en_attente'
          && request.resource.data.storagePath.matches('artisans/' + aid + '/documents/' + d + '/[^/]+')
          && request.resource.data.tailleOctets <= 10 * 1024 * 1024;
        allow update, delete: if false;                        // validation par Function admin
      }
      match /realisations/{r} {
        // Visible publiquement une fois publiée ; en préparation, seulement par l'équipe.
        allow read: if resource.data.publie == true || isMembre(aid) || lit('art');
        allow create, update: if noImp() && isOperationnelActif(aid)
          && (request.resource.data.publie != true || request.resource.data.autorisationProprietaire == true);
        allow delete: if noImp() && isOperationnelActif(aid);
      }
      match /disponibilites/{m} { allow read: if isMembre(aid) || lit('art'); allow write: if noImp() && isOperationnelActif(aid); }
      match /statsJour/{j}      { allow read: if isOperationnel(aid) || lit('art'); allow write: if false; }
      match /prive/{p}          { allow read: if isGestion(aid) || entRole(aid) == 'x' || isFinance(); allow write: if false; }
      // Devis & factures (DATABASE §8 bis) : totaux, mentions et numéros calculés côté serveur,
      // donc aucune écriture directe ; données des clients de l'artisan, jamais lues par le staff.
      match /devis/{d}                 { allow read: if isOperationnel(aid); allow write: if false; }
      match /facturesClients/{f}       { allow read: if isGestion(aid) || entRole(aid) == 'x'; allow write: if false; }
      match /modelesDevis/{m}          { allow read: if isOperationnel(aid); allow write: if false; }
      match /prestationsBiblio/{b}     { allow read: if isOperationnel(aid); allow write: if false; }
      match /clients/{c}               { allow read: if isOperationnel(aid) || entRole(aid) == 'x'; allow write: if false; }
      match /parametresFacturation/{x} { allow read: if isMembre(aid); allow write: if false; }
      match /compteurs/{c}             { allow read, write: if false; }
      // Plans Dessin de l'entreprise (DESSIN.md §4) : comme les devis, l'équipe opérationnelle lit,
      // le serveur écrit ; données des clients de l'artisan, jamais lues par le staff.
      match /plans/{p} {
        allow read: if isOperationnel(aid);
        allow write: if false;
        match /historique/{v} { allow read: if isOperationnel(aid); allow write: if false; }
      }
    }
    // Sites des artisans (siteId = artisanId) : écrits par le serveur seulement (SITE_INTERNET.md).
    match /sites/{aid} {
      allow read: if isMembre(aid);
      allow write: if false;
      match /{sous=**} { allow read: if isMembre(aid); allow write: if false; }
    }
    match /sitesSlugs/{slug}   { allow read, write: if false; }
    match /sitesDomaines/{h}   { allow read, write: if false; }
    match /artisanScores/{aid} { allow read: if isGestion(aid) || lit('mat'); allow write: if false; }

    // ---------- demandes (création et écritures par Functions) ----------
    match /demandes/{id} {
      allow read: if signedIn() && (resource.data.particulierUid == uid() || lit('dem'));
      allow write: if false;
      match /attributions/{aid} { allow read: if isOperationnel(aid) || lit('dem'); allow write: if false; }
      match /messages/{m} {
        allow read: if signedIn() && (get(/databases/$(db)/documents/demandes/$(id)).data.particulierUid == uid()
                     || isOperationnel(resource.data.artisanId) || lit('dem'));
        allow write: if false;
      }
    }
    // requêtes collection group « mes attributions » (tableau de bord temps réel)
    match /{path=**}/attributions/{aid} { allow read: if isOperationnel(resource.data.artisanId) || lit('dem'); }

    match /dossiersDiag/{id} {
      allow read: if signedIn() && (resource.data.particulierUid == uid() || lit('dem'));
      allow write: if false;
      match /attributions/{aid} { allow read: if isOperationnel(aid) || lit('dem'); allow write: if false; }
    }
    match /matching/{id}         { allow read: if lit('mat'); allow write: if false; }
    match /matchingConfig/{p=**} { allow read: if lit('mat'); allow write: if false; }

    // ---------- appels d'offres, achats, crédits ----------
    match /appelsOffres/{id} {
      allow read: if hasRole('artisan') || lit('ao');       // anonymisés par construction
      allow write: if false;
      match /reponses/{aid}       { allow read: if isOperationnel(aid) || lit('ao'); allow write: if false; }
      match /deblocages/{aid}     { allow read: if isOperationnel(aid) || lit('ao'); allow write: if false; }
      match /historiquePrix/{h}   { allow read: if lit('ao'); allow write: if false; }
    }
    match /achatsLeads/{id}         { allow read: if isMembre(resource.data.artisanId) || lit('ao') || isFinance(); allow write: if false; }
    match /portefeuilles/{aid}      { allow read: if isMembre(aid) || lit('ao') || isFinance(); allow write: if false;
      match /mouvements/{m}         { allow read: if isMembre(aid) || lit('ao') || isFinance(); allow write: if false; } }
    match /packsCredits/{id}        { allow read: if signedIn(); allow write: if false; }
    match /remboursementsLeads/{id} { allow read: if isOperationnel(resource.data.artisanId) || lit('ao'); allow write: if false; }
    match /grillesTarifaires/{id}   { allow read: if lit('ao'); allow write: if false; }

    // ---------- équipes (lecture par jeton via Function) ----------
    match /invitations/{id}    { allow read: if isGestion(resource.data.artisanId) || lit('art'); allow write: if false; }
    match /revendications/{id} { allow read: if (signedIn() && resource.data.demandeurUid == uid()) || isModo() || lit('art'); allow write: if false; }
    match /demandesAcces/{id}  { allow read: if (signedIn() && resource.data.demandeurUid == uid()) || isGestion(resource.data.artisanId) || lit('art'); allow write: if false; }

    // ---------- back-office (toutes les écritures par Functions : assertPermission + audit) ----------
    match /admins/{u}           { allow read: if isAdmin() || (signedIn() && uid() == u); allow write: if false; }
    match /rolesAdmin/{id}      { allow read: if lit('aud') || isAdmin(); allow write: if false; }
    match /filesModeration/{id} { allow read: if lit('file'); allow write: if false; }
    match /sanctions/{id}       { allow read: if lit('art') || isGestion(resource.data.artisanId); allow write: if false; }
    match /notesInternes/{id}   { allow read: if isStaff() && tok().staff.r != 'lecture'; allow write: if false; }
    match /annonces/{id}        { allow read: if true; allow write: if false; }
    match /auditLog/{id}        { allow read: if lit('aud'); allow write: if false; }
    match /rgpdDemandes/{id}    { allow read: if lit('rgpd'); allow write: if false; }
    // conversion
    match /cycleEtat/{aid}      { allow read: if lit('cnv'); allow write: if false; }
    match /cycleTraces/{id}     { allow read: if lit('cnv'); allow write: if false; }
    match /cycleStats/{j}       { allow read: if lit('cnv'); allow write: if false; }
    match /sequences/{p=**}     { allow read: if lit('cnv'); allow write: if false; }
    match /prospects/{id}       { allow read: if lit('cnv') && pii(); allow write: if false; }
    // demandes partenaires
    match /sourcesDemandes/{id}     { allow read: if lit('dem'); allow write: if false; }
    match /importsDemandes/{id}     { allow read: if lit('dem'); allow write: if false; }
    match /preuvesConsentement/{id} { allow read: if lit('rgpd') || (lit('dem') && pii()); allow write: if false; }
    // comportement et IA
    match /pagesSuivies/{id}         { allow read: if lit('cmp'); allow write: if false; }
    match /comportementAgregats/{id} { allow read: if lit('cmp'); allow write: if false; }
    match /comportementAlertes/{id}  { allow read: if lit('cmp'); allow write: if false; }
    match /abTests/{id}              { allow read: if lit('cmp'); allow write: if false; }
    match /iaAnalyses/{id}           { allow read: if lit('ia'); allow write: if false; }
    match /iaRecommandations/{id}    { allow read: if lit('ia'); allow write: if false; }
    // Studio vidéo : projets écrits par les Server Actions uniquement.
    match /studioProjets/{id} {
      allow read: if lit('std');
      allow write: if false;
      match /versions/{n} { allow read: if lit('std'); allow write: if false; }
    }

    // ---------- avis ----------
    match /avis/{id} {
      // Le document publié ne contient aucune donnée sur l'auteur (voir /prive/auteur).
      allow read: if resource.data.statut == 'publie' || isModo() || isMembre(resource.data.artisanId);
      allow write: if false;
      match /prive/{p}        { allow read: if isModo() && pii(); allow write: if false; }
      match /signalements/{s} { allow read: if isModo(); allow write: if false; }
    }

    // ---------- facturation (miroirs Stripe, webhooks uniquement) ----------
    match /abonnements/{id} { allow read: if isGestion(resource.data.artisanId) || isFinance(); allow write: if false; }
    match /factures/{id}    { allow read: if isGestion(resource.data.artisanId) || entRole(resource.data.artisanId) == 'x' || isFinance(); allow write: if false; }
    match /paiements/{id}   { allow read: if isGestion(resource.data.artisanId) || isFinance(); allow write: if false; }
    match /codesPromo/{id}  { allow read: if isFinance() || lit('cnv'); allow write: if false; }

    // ---------- référentiels et contenu (écriture par Functions admin, versionnée et auditée) ----------
    match /referentiel/{type}/items/{id} { allow read: if true; allow write: if false; }  // champs et libellés, sans prix
    match /referentiel/{type}/prix/{id}  { allow read, write: if false; }                 // prix : serveur uniquement
    match /referentiel/recherche/{collection}/{id} {
      allow read: if collection in ['intentions', 'metiers', 'synonymes'];
      allow write: if false;
    }
    match /communes/{id}  { allow read: if true; allow write: if false; }
    match /stats/public   { allow read: if true; allow write: if false; }
    match /config/app     { allow read: if true; allow write: if false; }
    match /config/cycle   { allow read: if lit('cnv'); allow write: if false; }
    match /config/comportement { allow read: if lit('cmp'); allow write: if false; }
    match /config/ia      { allow read: if lit('ia'); allow write: if false; }

    // Tout le reste est réservé à l'Admin SDK (règle par défaut : refus) :
    // brouillons, brouillonsOnboarding, contacts, litiges, emails, suppressions, evenements, stripeEvents,
    // rateLimits, idempotence, sirenIndex, cacheSirene, simulations, migrations, config/flags,
    // comportementSessions, iaContexte, iaQuotas, iaRedactions, recherchesSecteur, studioTendances,
    // studioIdees, studioComptes, studioPublications, studioSeries, studioReglages.
  }
}
```
Les écritures admin passent **toutes** par le serveur (Server Actions `actionAdmin()` : permission relue dans `admins/{uid}`, double authentification, audit ; quelques Functions) : aucune règle n'autorise un admin à écrire directement, ce qui garantit que rien n'échappe au journal d'audit.

> **Fait** (`packages/firebase`, sur émulateur) — **règle d'origine** : tests des règles avec `@firebase/rules-unit-testing`. Pour chaque règle : un cas autorisé et un cas refusé, avec les profils anonyme, particulier, chaque rôle de membre (p, g, c, x), membre **suspendu** (claims encore présents mais document `statut: 'suspendu'`), autre artisan, chaque rôle staff, et session en impersonation.

### Pièges Firebase à connaître
1. **Collection group** : une requête `collectionGroup('attributions')` exige la règle `/{path=**}/attributions/{aid}` ci-dessus **et** un champ `artisanId` dans le document (on ne peut pas filtrer un collection group sur l'identifiant du document).
2. **Claims en retard** : après un changement de membre, le token garde les anciens claims jusqu'à 1 h. Le client appelle `getIdToken(true)` après chaque action d'équipe ; les actions sensibles vérifient le document `membres` (`isMembreActif`) ; un retrait appelle `revokeRefreshTokens`.
3. **Session serveur ET client** : le cookie de session protège les pages rendues côté serveur, mais les écoutes temps réel du SDK client exigent que le client soit aussi connecté à Firebase Auth. Connexion côté client → envoi de l'ID token au serveur → `createSessionCookie`. Déconnexion : les deux.
4. **`get()` / `exists()` coûtent une lecture** (10 maximum par évaluation). D'où les claims pour les lectures courantes et les documents seulement pour les écritures.
5. **Compteurs chauds** (`nbDeblocages`, `nbAttributions`) : toujours en transaction ; un même document ne supporte qu'environ 1 écriture par seconde en continu, ce qui suffit à ce volume.
6. **Triggers** : `onDocumentWritten` peut se déclencher plusieurs fois pour un même événement. Chaque trigger est idempotent (comparer avant / après, ignorer si rien d'utile n'a changé), sinon boucle infinie (ex. un trigger qui réécrit le document qui l'a déclenché).
7. **Région des triggers** : Firestore est en `eur3` (multi-région). Vérifier au lot 1 la région exacte à déclarer pour les triggers Firestore des Functions v2 (Eventarc) et la documenter dans `docs/decisions/`. **État** : toutes les Functions déclarent `europe-west1` (`apps/functions/src/callable.ts`) ; le dossier `docs/decisions/` n'existe pas et la région des triggers n'a pas encore été vérifiée sur un vrai projet (rien n'est déployé).
8. **App Check et Server Actions** : App Check ne s'applique pas tout seul aux Server Actions Next.js. L'enveloppe `action()` vérifie le jeton App Check (en-tête, ou cookie court `ph_appcheck` pour les Server Actions) avec `getAppCheck().verifyToken()` (`packages/firebase/src/admin.ts`).
9. **Émulateurs** : toujours tester les règles et les Functions sur émulateurs ; ne jamais pointer un test sur un vrai projet (garde-fou dans `vitest.setup.ts` qui échoue si `FIRESTORE_EMULATOR_HOST` n'est pas défini).

---

## 13. Storage

Le fichier `storage.rules` fait foi ; chemins dans `fichiers` (`packages/firebase/src/chemins.ts`).

```
artisans/{aid}/logo/{fichier}              public, ≤ 2 Mo, image (jpeg|png|webp|avif) ; écriture : propriétaire ou gérant actif
artisans/{aid}/banniere/{fichier}          public, ≤ 5 Mo, image ; propriétaire ou gérant actif
artisans/{aid}/video/{fichier}             public, ≤ 50 Mo, mp4|webm|ogg ; propriétaire ou gérant actif
artisans/{aid}/tampon/{fichier}            PRIVÉ (lu par le serveur seulement, PDF des devis), ≤ 2 Mo, image
artisans/{aid}/realisations/{id}/{fichier} public, ≤ 8 Mo, image ; équipe opérationnelle active
artisans/{aid}/documents/{docId}/{fichier} PRIVÉ (équipe opérationnelle, modération, section `art`), ≤ 10 Mo, pdf/jpg/png ;
                                           création seulement, jamais remplacé ni supprimé par le client
artisans/{aid}/devis/{numero}.pdf          PRIVÉ, serveur seulement (§8 ter) ; factures : artisans/{aid}/factures/{numero}.pdf
sites/{aid}/medias/{fichier}               médiathèque du site : public, images ≤ 8 Mo ou PDF ≤ 10 Mo ; propriétaire ou gérant actif
avis/{avisId}/photos/{fichier}             public, écrit par le serveur après modération
televersements/{uid}/{fichier}             dépôt en attente (photos d'avis ou de demande), ≤ 8 Mo, lu par son auteur seulement
dessin/{particulier|entreprise}/{id}/{planId}/…   scènes, plan importé, photos des plans : serveur seulement (§8 quater)
studio/{uid}/{prise}/… · studio/{uid}/medias/…    Studio (section `std`) ; studioRendus/** écrit par le robot (§15 quinquies)
replays/{page}/{jour}/{vueId}.json.gz      bucket des replays (`REPLAYS_BUCKET`), jamais lisible par un client
```
- Tout le reste (photos et devis des demandes, dossiers Dessin, replays) : refus total côté client, Admin SDK seulement.
- Les écritures de fichiers d'une entreprise exigent aussi un membre **actif** relu en base (`firestore.get` dans les règles Storage).
- Si l'envoi direct est refusé alors que le membre a le droit, `POST /api/pro/fichiers` vérifie comme les règles puis dépose le fichier côté serveur.
- **Pas encore fait** : suppression des métadonnées EXIF par une Function à l'envoi, antivirus sur les documents, URL signées de 15 min pour les fichiers privés (aujourd'hui, les fichiers privés sont lus par des routes serveur authentifiées ; les fichiers publics ont une URL avec jeton). La Function `onDocumentUpload` prévue n'existe pas.

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
| Analyses IA (`iaAnalyses`, `iaRecommandations`) | 24 mois | Function planifiée (**pas encore faite** : aucune purge de ces collections dans `purgesNuit`) |
| Plans Dessin à la corbeille (fichiers, versions, liens de partage) | 30 jours après la mise à la corbeille | `purgeDessinNuit` (3 h 40) |
| Brouillons de parcours (`brouillons`, `brouillonsOnboarding`) | 30 jours | TTL |
| Emails (`emails`) | 13 mois | TTL |
| Prises du Studio | 30 jours | `prisesExpirentLe` |

---

## 15. Administration et algorithme

Le back-office (rôles, permissions, écrans) est décrit dans **`ADMIN.md`**.
L'algorithme de mise en relation (étapes, formules, champs mis à jour) est décrit dans **`MATCHING.md`**.
Les métiers (`metierPrincipal`, `metiers[]`, `intentions[]` des artisans) sont des **identifiants du référentiel `referentiel/recherche`**, jamais du texte libre : voir COMPTES.md §3.1 bis.
Les comptes, entreprises et équipes multi-utilisateurs (`roles[]`, `membres`, `invitations`, `revendications`, `etablissements`, `sirenIndex`, custom claims) sont décrits dans **`COMPTES.md`**, qui **prime** sur les §2 et §3 de ce document en cas d'écart.

---

## 15 bis. Sites internet des artisans (voir SITE_INTERNET.md)

> Types partagés (Zod, `packages/core/sites/schemas.ts`) :
> - `ParAppareil<T> = { desktop: T, tablet: T, mobile: T }`
> - `Couleur = 'aucun' | 'auto' | 'blanc' | 'clair' | 'primaire' | 'sombre' | 'accent' | string` (chaîne CSS validée : `#rrggbb`, `rgb()`, `hsl()`)
> - `Media = 'lib:{realisationId}/{photoIndex}' | 'up:{mediaId}' | ''`
> - `Action = { type: 'page'|'ancre'|'url'|'tel'|'email'|'sms'|'whatsapp'|'formulaire'|'fichier'|'aucun', page?, ancre?, url?, onglet?, nofollow?, tel?, email?, objet?, message?, formulaire?: 'defiler'|'popup', fichierId? }` ; validée par `validerAction()` (même code côté éditeur et à la publication)
> - `Fond = { fond: Couleur, fondType: 'couleur'|'image', fondImage: Media, voile: Couleur, voileOpacite: 0-95, fondPos: 'top'|'center'|'bottom', texteCouleur: 'auto'|'clair'|'fonce' }`

> **État réel (19/11/2026)** : les sites sont rendus par l'application Next.js sur Vercel (cache court), **pas** par un Worker Cloudflare : R2, KV et Cloudflare for SaaS (D45) ne sont **pas encore faits** (AVANCEMENT, « Hébergement … à confirmer »). Les domaines passent par l'API Vercel (DOMAINES.md). Sous-collections réelles (`chemins.ts`) : `pages`, `reglages/navigation`, `versions`, `medias`, `modeles`, `sectionsEnregistrees`, `statsJour`, `statsMois`, `ia/{AAAA-MM|essai}`, `iaSessions`, `iaCreation/courante`, `journalDomaine`, `articles`, `blogCategories`, `blogTags`, `reglagesBlog/pilote`. Le schéma Zod `siteArtisan` (`packages/core/src/schemas/sites.ts`) porte : `artisanId`, `offre`, `sousDomaine`, `theme`, `versionPubliee`, `derniereVersion?`, `formulaire?` (champs du formulaire Site Pro, au lieu d'un document `sites/{id}/formulaire`), `domaine?` (objet : `nom`, `mode` achat ou connexion, `statut`, `principal` www ou apex, `enregistrements[]` DNS, dates de vérification), `publieLe?`, `brouillonModifieLe`, `createdAt`, `updatedAt`. Les champs ci-dessous qui n'y figurent pas (`hebergement`, `domaineSource`, `ovhCommandeId`, `quotaIA`, `stripeSubscriptionId`, `seoGlobal`, `modeleId`) sont la conception d'origine, à revérifier avec SITE_INTERNET.md et DOMAINES.md.

### `sites/{siteId}` (siteId = artisanId ; membres en lecture, écriture par Function)
`artisanId`, `offre` (`gratuit`, `site_pro`), `sousDomaine`, `domaine?`, `domaineStatut` (`aucun`, `verification`, `actif`, `erreur`), `domaineSource` (`achat_ovh`, `existant`), `ovhCommandeId?`, `theme: { palette: { primaire, accent, clair, sombre }, polices: { titre, texte }, rayonBoutons: 2 | 8 | 999, ton: 'pro'|'chaleureux'|'direct' }`, `modeleId?` (modèle fourni appliqué en dernier), `seoGlobal: { nomSite, activiteSchema, zone, imagePartage }`, `publieLe?`, `versionPubliee`, `etatLigne?` (`maintenance` : page d'attente en 503 ; `retire` : introuvable ; absent : en ligne ; effacé à chaque publication), `brouillonModifieLe`, `stripeSubscriptionId?`, `quotaIA: { generations, reecritures, mois }`, `hebergement: { fournisseur: 'cloudflare', customHostnameId?, sslStatut ('en_attente','actif','erreur'), validationTxt?, verifieLe? }`, `createdAt`, `updatedAt`.

### `sites/{id}/reglages/navigation` (document unique, composant global ; prévu d'abord à `sites/{id}/navigation`)
Brouillon modifiable ; **enregistré séparément** des pages (`enregistreeLe`, `versionEnregistree`).
`logo: { mode ('logo-nom','logo','nom'), image: Media, initiales, fond: Couleur, taille: ParAppareil<px> }`, `nom`, `liens: [{ id, label, action: Action }]`, `align`, `cta: { visible, texte, couleur, couleurTexte, action: Action }`, `tel: { visible, numero }`, `fond: Couleur`, `texte: Couleur`, `padY: ParAppareil`, `fixe`, `ombre`, `transparente`, `masque: ParAppareil<bool>`, `mobile: { sens ('droite','gauche'), burger ('gauche','droite'), traits: Couleur, ctaBarreTablette, telBarreTablette, fond: Couleur, tailleLiens, separateurs, ctaMenu }`.

### `sites/{id}/pages/{pageId}`
`nom`, `court`, `slug` (unique par site), `type` (`accueil`, `prestations`, `realisations`, `avis`, `contact`, `locale`, `libre`, `mentions`), `communeSlug?`, `statut` (`brouillon`, `publiee`), `ordre`, `sansNavigation: bool`, `seo: { title, meta, motCle, score }`, `genereParIA: bool`, `updatedAt`,
`sections: [Section]` où :
- `Section = { id, p: { nom, ancre (= ID HTML, unique sur la page), largeur ('boite','plein'), padY: ParAppareil, masque: ParAppareil<bool>, ...Fond }, rows: [Ligne] }`
- `Ligne = { id, p: { htmlId, gap, valign, fond: Couleur, empile, inverse, masque }, cols: [Colonne] }` (1 à 6 colonnes)
- `Colonne = { id, w (1-12), p: { htmlId, pad, arrondi, ombre, valign, masque, ...Fond }, els: [Element] }`
- `Element = { id, type, p }` ; `p` commun : `htmlId`, `mb`, `masque: ParAppareil<bool>`, `texteMobileOn`, `texteMobile`. Selon `type` :
  - `titre` / `texte` : `texte` (liens au format `[mot](#L1)`), `liens: { L1: Action, … }`, `lienCouleur`, `lienSouligne`, `niveau` (h1-h3, titre), `taille: ParAppareil`, `couleur`, `align`
  - `surtitre` : `texte`, `taille`, `couleur`, `align` · `bouton` : `texte`, `action: Action`, `variante` (`plein`,`contour`), `couleur`, `largeur`, `enLigne`, `align`
  - `image` : `src: Media`, `legende` (texte alternatif, obligatoire à la publication), `ratio`, `ajuste`, `pos`, `arrondi`, `voile`, `voileOpacite`, `action: Action`
  - `liste` : `items[]`, `icone` · `avis` : `nom`, `texte`, `note` ou `avisId` (synchronisé) · `chiffre` : `valeur`, `label`, `taille`
  - `formulaire` : `bouton` (champs dans `sites/{id}/formulaire`) · `video` : `url` · `carte` : `adresse` · `espace` : `hauteur: ParAppareil` · `separateur` : `largeur` · `logo` / `menu` : lisent `navigation`
Limite : 900 Ko par document (contrôlée à l'enregistrement ; au-delà, découper la page).

### `sites/{id}/medias/{mediaId}` (médiathèque du site, Storage `sites/{id}/medias/`)
Fait : `schemaVersion`, `nom`, `storagePath`, `url` (URL publique avec jeton), `mime`, `tailleOctets`, `usage` (`image` ou `fichier`), `createdAt`. Le fichier est d'abord déposé dans Storage par le navigateur (règle : propriétaire ou gérant actif), puis `POST /api/pro/site/medias` (`enregistrerMediaSite`) vérifie type et taille et crée le document ; la clé utilisée dans les pages est `up:{mediaId}`. Limites : images JPEG, PNG, WebP ou AVIF de 8 Mo, fichiers à télécharger **PDF seulement**, 10 Mo. Suppression (`POST /api/pro/site/medias/supprimer`) refusée tant que le brouillon ou la version en ligne cite la clé. L'éditeur lit les 200 plus récents.
**Pas encore fait** (conception d'origine) : `largeur`, `hauteur`, `variantes { webp640, webp1280, webp1920 }`, usages `logo` et `fond`, fichiers Office, images et ZIP de 20 Mo, analyse antivirus.

### `sites/{id}/modeles/{modeleId}` (modèles enregistrés par l'artisan)
Schéma réel `modeleSite` : `nom`, `type` (`avant_ia` : « Avant IA – date », ou `artisan`), `pages`, `navigation`, `theme`, `createdAt` (au lieu de `instantane` et `nbPages`). 10 maximum par site.

### `sites/{id}/sectionsEnregistrees/{id}`
`nom`, `section: Section` (ids régénérés à l'insertion), `createdAt`. 30 maximum.

### `modelesSite/{modeleId}` (fournis par Portail Travaux, admin)
**Pas en base** : les modèles fournis sont des constantes du code (`packages/core/src/sites/modeles.ts`) ; la collection n'existe pas.
Conception d'origine : `nom`, `description`, `paletteId`, `polices`, `rayonBoutons`, `ton`, `variante` (`split`,`photo`,`sombre`,`minimal`), `vignette`, `actif`, `ordre`.

### `sites/{id}/versions/{n}` (ajout seul, 20 dernières gardées)
Instantané publié (schéma `versionSite`) : `n`, `navigation`, `theme`, `pages`, `publiePar`, `publieLe`, `liensVerifies: bool` (faux si des liens, boutons ou textes « [à compléter] » étaient à revoir : la publication n'est jamais bloquée). Retour arrière : `POST /api/pro/site/retablir`. `r2Prefix` et la clé KV ne sont **pas encore faits** (pas de R2).

### Formulaire du site
Champs dans `sites/{id}.formulaire.champs` (≤ 30, Site Pro ; gratuit : 4 champs figés) ; pas de document `sites/{id}/formulaire`. Envoi (`POST /api/sites/demande`) → `demandes/{id}` avec `source: 'site_artisan'`, jeton Turnstile vérifié (D46), attribution directe à l'artisan, **hors matching et jamais facturée**.

### `sites/{id}/statsJour/{yyyy-mm-dd}` et `statsMois/{yyyy-mm}` (écrits par le serveur, sans cookie)
Schéma réel `statsSite` : `vues`, `demandes`, `pages: { slug: n }` (compteurs anonymes, aucune IP ni identifiant de visiteur). **Pas encore fait** : `visiteursUniques`, `sources`, `appareils`, `clicsTel`, et les requêtes Google `sites/{id}/searchConsole/{yyyy-mm}` (Search Console à brancher, A_FOURNIR n° 16).

### `sitesSlugs/{slug}` et `sitesDomaines/{hote}`
Index d'unicité → `siteId` (schéma `indexSite` : `siteId`, `createdAt`). C'est l'application qui résout l'hôte vers le site. Prévu au départ et **pas fait** : `customHostnameId`, `sslStatut`, `apexRedirige` et la copie dans Cloudflare KV.

### `sites/{id}/journalDomaine/{id}`
Journal du domaine (achat, configuration, transfert) pour le support (DOMAINES §6).

---

## 15 ter. IA des sites (voir IA_SITE.md)

> **État réel** : les quotas sont dans `sites/{id}/ia/{AAAA-MM}` (crédits du mois : `creation`, `apercu`, `composants`, `textes`, `blogArticles`) et `sites/{id}/ia/essai` (essais à vie), la création assistée dans `sites/{id}/iaCreation/courante` (`statut` en_cours, apercu, attente_paiement, terminee ; `reponses`, `fiche`, `plan`, `faites`, `avantIa?`) ; le droit IA vient de `artisans/{id}.droits.iaSite`. Les collections `iaQuotasSite` et `iaContexteFiche` décrites ci-dessous **n'existent pas** (absentes de `chemins.ts`). Les sessions `iaSessions` portent aujourd'hui `uid`, `mode`, `portee`, `demande`, `resume`, `question`, `operations`, `avertissements`, `modele`, `versionPrompt`, `coutCentimes`, `createdAt`.

### Champs ajoutés à `sites/{siteId}`
`droits: { ia: 'aucun'|'essai'|'complet', source: 'site_pro'|'premium'|null, majLe }` (écrit **uniquement** par le webhook Stripe), `essaiIA: { apercuFait: bool, textesRestants: 0-3 }`, `iaEnAttente?: sessionId` (session à reprendre après paiement).

### `sites/{id}/iaSessions/{sessionId}` (lecture membres, écriture Function `iaSite` uniquement)
`mode` (`creation`, `textes`, `composant`, `page`, `theme`, `seo`), `portee` (`selection`, `element`, `section`, `page`, `site`), `cibles: NoeudId[]`, `demande` (texte de l'artisan, 600 car. max), `questions: [{ id, texte, type, options?, reponse?, passee: bool }]`, `reponsesCreation?: { travaux[], clients, atouts[], urgence?, montrer[], ton, communes[] }`, `operations: OperationIA[]` (IA_SITE §2.1), `resume`, `avertissements: [{ cible, type: 'a_completer'|'lien'|'longueur', message }]`, `statut` (`question`, `proposee`, `appliquee`, `annulee`, `echec`, `attente_paiement`), `apercu: bool` (essai gratuit, non publiable), `modele`, `promptVersion`, `tokensEntree`, `tokensSortie`, `coutEstime`, `demandePar`, `createdAt`, `appliqueeLe?`. Conservation 12 mois (TTL `expireLe`).

### `iaQuotasSite/{siteId_yyyy-mm}` (Function uniquement)
`creations`, `composants`, `textes`, `reserves` (crédits réservés pendant un appel, rendus si échec), `packsAchetes`. TTL 3 mois.

### `iaContexteFiche/{artisanId}` (Function uniquement)
Faits autorisés pour le garde-fou (IA_SITE §2.2) : `metiers`, `prestations`, `communes`, `annees`, `equipe`, `certifications[]` (vérifiées seulement), `assurance`, `noteAvis`, `nbAvis`, `delais?`, `horaires`, `coordonnees`, `medias: [{ id, alt, tags }]`, `palette?` (extraite du logo), `tokensEstimes`, `updatedAt`. Recalculé à chaque modification de la fiche.

Règles : `iaSessions` `allow read: if isMembre(siteId)`, `allow write: if false` ; `iaQuotasSite` et `iaContexteFiche` : `allow read, write: if false` (lecture du quota restant via la callable `iaSiteEtat`).
Index : `iaSessions` (`statut` ASC, `createdAt` DESC).

---

## 15 quater. Blog des artisans (voir BLOG.md)

| Collection | Champs principaux |
|---|---|
| `sites/{siteId}/articles/{articleId}` | titre, sousTitre, slug, anciensSlugs[], corpsHtml (assaini), image {url, alt}, meta, motCle, motsSecondaires[], categorieId, tags[], auteurId, statut (`brouillon`·`planifie`·`publie`·`archive`), datePublication, genereParIA (bool), origine (`manuel`·`ia`·`autonome`·`pilote`), finAuto? (`relire`·`planifier`·`publier`), validation? {envoyeeLe, valideeLe, par}, postsReseaux {facebook, instagram, linkedin, google, hashtags[]}, seo {score, bloquants[], recommandations[]}, creeLe, modifieLe, supprimeLe? |
| `sites/{siteId}/blogCategories/{id}` | nom, slug, ordre |
| `sites/{siteId}/blogTags/{id}` | nom, slug |
| `sites/{siteId}/blogAbonnes/{id}` | **pas encore fait** — email, consentement {texte, date, ip hachée}, desinscritLe? |
| `sites/{siteId}/blogStats/{articleId_jour}` | **pas encore fait** — vues, uniques, rebonds, tempsTotal, sources {google, social, direct, referent}, demandes |
| ~~`usageIA/{entrepriseId}_{AAAAMM}`~~ | remplacé par le champ `blogArticles` du compteur `sites/{siteId}/ia/{AAAA-MM}` (§15 ter) |
| `motsClesCache/{dept}_{motCle}` | **pas encore fait** (DataForSEO, D68, à brancher) — volume, difficulte, tendance[12], associes[], majLe (TTL 30 j) |
| `serpCache/{dept}_{motCle}` | **pas encore fait** — 10 premiers résultats {url, titre, h2[], mots}, majLe (TTL 14 j) |
| `sites/{siteId}/reglagesBlog/pilote` (au lieu de `sites/{siteId}.blogPilote`) | schéma réel `piloteBlog` : actif, rythme (`2_mois`·`1_semaine`·`2_semaine`), validation (`avant` seulement, D70), uid, sujets[] (≤ 3) {titre, motCle}, prochaineLe, derniereLe?, majLe |

- Pas de mentions légales stockées sur l'article : rendu à partir des paramètres de devis et factures, `artisans/{id}/parametresFacturation/actuels` (§8 bis ; et non `entreprises/{id}.parametresDocuments`).
- Affichage : élément `blog` du catalogue §15 bis, p = { affichage: 'grille'|'liste'|'une', nb: 3|6|9, cat: 'toutes'|categorieId, extrait: bool }.
- Règles : les articles sont dans `sites/**` (lecture par les membres, écriture par le serveur ; les visiteurs lisent les articles publiés par le rendu serveur du site) ; Function `publierArticlesBlog` toutes les 5 min pour passer `planifie` → `publie`, `viderCorbeilleBlogNuit` (3 h 20), `piloteBlog` (toutes les heures).
- Index réels : (statut, datePublication desc), (statut, categorieId, datePublication desc), (statut, slug), (statut, anciensSlugs array-contains), groupe (statut, datePublication). L'index (tags array-contains, statut) prévu n'existe pas.

---

## 15 quinquies. Studio vidéo (voir STUDIO.md)

- `studioProjets/{id}` : `auteurUid`, `titre`, `statut` (sujet → enregistrement → transcription → montage → captures → rendu → pret | erreur), `format`, `camera`, `theme`, `sujets[]`, `sujet`, `prise { id, fichiers { voix, ecran?, camera? }, dureeMs }`, `mots[]` (Whisper), `plan` (`planMontage`), `version`, `captures { "id:scene": chemin }`, `rendu { video, srt, miniature, dureeMs, le }`, `erreur`, `coutCentimes`, `prisesExpirentLe` (30 jours). Sous-collection `versions/{n}` (plan, auteur, date). Lecture : section `std` ; écriture : serveur uniquement.
- `studioTendances/{recherche}` : vidéos YouTube d'une recherche, gardées 24 h (`expireLe` à 7 jours). Admin SDK uniquement.
- `studioIdees/{id}` : idées de vidéos gardées (`sujet`, `theme`, `liens` des vidéos d'inspiration, `auteurUid`, `gardeeLe`, `utilisations`). `id` = empreinte du titre (une idée n'est gardée qu'une fois). Écrites et lues par les Server Actions du Studio, Admin SDK uniquement.
- `studioComptes/{reseau}` : compte YouTube, Instagram ou TikTok connecté (`compteId`, `nom`, `acces` et `rafraichissement` **chiffrés**, `expireLe`, `connectePar`, `connecteLe`). Admin SDK uniquement, jamais lu par le navigateur.
- `studioPublications/{id}` : une vidéo sur un réseau (`projetId`, `reseau`, `video`, `variante`, `titre`, `legende`, `programmeeLe`, `statut` programmee|en_cours|publiee|echec|annulee, `idExterne`, `lien`, `prive`, `erreur`, `publieeLe`, `stats`, `statsLe`). Index : `statut` + `programmeeLe`. Admin SDK uniquement.
- `studioSeries/{id}` : série d'épisodes (`nom`, `promesse`, `episodes`). Les projets portent `serie {id, nom, numero}`. Admin SDK uniquement.
- `studioReglages/{uid}` : réglages du Studio par auteur (`themes [{theme, nombre}]` de la session de tournage, `voix` façon de parler, `exemples` 5 derniers scripts réécrits). Admin SDK uniquement.
- Projets Studio, session tournée d'une traite : `session` (ids des vidéos de la prise, sur la première), `priseDe` (sur les suivantes), `plage {debut, fin}` (passage de la prise propre à la vidéo).
- `studioProjets` gagne `serie`, `reels` (Reels analysés, sans auteur) et `rendu.variantes` (vidéos des variantes d'accroche).
- `studioProjets` gagne `preparation { artisan (artisanFictif), scenes[] (6 au plus), ignoree? }` : artisan d'exemple et écrans filmés avant le montage (STUDIO.md §4). Écriture : serveur uniquement (règles inchangées).
- `studioProjets` gagne `libre` (montage sans génération) et `frise` (`frise` de `packages/core/src/studio/frise.ts` : pistes, clips, médias importés). Médias dans Storage `studio/{uid}/medias/{id}.{ext}` (vidéo 1 Go, son 200 Mo, image 20 Mo ; création par l'auteur seulement, section `std`), supprimés avec le projet (STUDIO.md §5 bis). `friseVersion` : version du plan sur laquelle la frise a été montée. La frise porte aussi transitions et effets vidéo des clips, effets des pistes, `motsEdites` (sous-titres corrigés), `decalageSousTitres`, `miniature`. Écriture du document : serveur uniquement.
- Storage : `studio/{uid}/{prise}/…` (prises, 100 Mo max, création par l'auteur de la section Studio, jamais écrasées, supprimées à 30 jours) ; `studioRendus/{projet}/…` (captures et vidéos, écrites par le robot).

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
| Facturation | `abonnements`, `factures`, `paiements`, `codesPromo`, `stripeEvents` (+ `artisans.droits`) |
| Devis et factures artisans | `artisans/{id}/devis`, `facturesClients`, `modelesDevis`, `prestationsBiblio`, `parametresFacturation`, `compteurs` |
| Interface artisan | `users/{uid}.encartsMasques: { [encartId]: masqueJusquau }` (offres contextuelles, PAIEMENTS §4) |
| Sites (IA) | `sites/{id}/iaSessions`, `iaQuotasSite`, `iaContexteFiche` |
| Référentiels | `referentiel/*`, `communes`, `stats/public`, `config/app`, `annonces` |
| Support et journaux | `contacts`, `litiges`, `emails`, `suppressions`, `evenements`, `auditLog`, `rateLimits`, `rgpdDemandes`, `filesModeration` |
| Conversion | `prospects`, `cycleEtat`, `cycleTraces`, `cycleStats`, `sequences` (+ `versions`), `config/cycle` |
| Comportement | `pagesSuivies`, `comportementSessions`, `comportementAgregats`, `comportementAlertes`, `abTests`, `config/comportement` |
| IA | `iaContexte`, `iaAnalyses`, `iaRecommandations`, `iaQuotas`, `iaRedactions`, `config/ia` |
| Parcours | brouillons de parcours (REPRISE_PARCOURS.md), `brouillonsOnboarding` (inscription des artisans en 3 étapes : `etape`, `donnees` dont `acquisition`, `emailHash?`, `jetonHash?` du lien de reprise, identifiant en cookie httpOnly, TTL 30 jours, COMPTES §3.2), `simulations` (bac à sable admin, TTL 7 jours) |
| Sites artisans | `sites` (+ `reglages/navigation`, `pages`, `medias`, `modeles`, `sectionsEnregistrees`, `versions`, `statsJour`, `statsMois`, `ia`, `iaSessions`, `iaCreation`, `journalDomaine`, `articles`, `blogCategories`, `blogTags`, `reglagesBlog`), `sitesSlugs`, `sitesDomaines` ; prévus et pas faits : `formulaire` (champ du site), `searchConsole`, `modelesSite` (dans le code), Cloudflare R2 et KV |
| Dessin (lot 15) | `users/{uid}/plans` (+ `historique`), `artisans/{id}/plans` (+ `historique`), `partagesPlans` ; Storage `dessin/…` |
| Studio vidéo | `studioProjets` (+ `versions`), `studioTendances`, `studioIdees`, `studioComptes`, `studioPublications`, `studioSeries`, `studioReglages` |
| Technique | `idempotence`, `migrations`, `cacheSirene`, `recherchesSecteur`, `config/flags`, `capturesEmulateur` (émulateur seulement) |

> Contrôle au 19/11/2026 : le registre des schémas (`packages/core/src/schemas/index.ts`) ne déclare pas encore les plans Dessin, `partagesPlans`, `sites/{id}/medias` ni les collections du Studio, alors que leurs schémas existent (ou, pour les médias, que le serveur écrit des champs fixes).


### Acquisition (landings)
| Champ | Contenu |
|---|---|
| `artisans/{id}.acquisition` | source (`trouver-chantier`·`site-internet-artisan`·`logiciel-devis-facture`·`pro`), utm_source, utm_medium, utm_campaign, landingAt — écrit à la création, jamais modifié (LANDINGS.md §1) |
| `config/preuveSociale` | nbInscrits, nbSites, note, nbAvis, temoignages[] {nom, metier, ville, photo, texte, accordLe} — vide = section masquée |
