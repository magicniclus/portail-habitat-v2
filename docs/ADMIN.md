# Back-office administrateur (`/admin`)

Espace interne pour piloter la plateforme : vérification des artisans, prix des appels d'offres, modération, litiges, finances, référentiels, réglages de l'algorithme.
**Maquette : `designs/Admin Portail Travaux.dc.html`** (coque + menu à icônes filtré par permissions, repliable à gauche avec animation (72 px, icônes seules, pastille sur les sections qui ont des éléments en attente, état mémorisé), sélecteur « Aperçu en tant que » pour tester chaque rôle), une maquette par section : `Admin Tableau de bord`, `Admin File`, `Admin Artisans`, `Admin Demandes`, `Admin Appels d offres`, `Admin Avis`, `Admin Litiges`, `Admin Finances`, `Admin Conversion`, `Admin Comportement`, `Admin IA`, `Admin Referentiels`, `Admin Algorithme`, `Admin Contenus`, `Admin Equipe`, `Admin RGPD`. Thème neutre ardoise pour ne jamais le confondre avec un espace public.

---

## 1. Rôles et permissions

Le rôle est porté par le custom claim `staff` (distinct de `roles`, qui concerne particuliers et artisans : DATABASE.md §12) ; les permissions fines sont dans `admins/{uid}.permissionsEffectives` et sont **vérifiées côté serveur** dans chaque action admin : enveloppe `actionAdmin({ nom, permission })` (`apps/web/server/actionAdmin.ts`), qui relit la permission, exige la double authentification, écrit l'audit et refuse pendant une impersonation. Catalogue et rôles : `packages/core/src/admin/permissions.ts`.

| Rôle | Pour qui | Permissions par défaut |
|---|---|---|
| `superadmin` | Fondateur | Tout, y compris la gestion de l'équipe et les réglages de l'algo |
| `admin` | Responsable des opérations | Tout sauf l'équipe et la suppression définitive |
| `moderateur` | Support et qualité | Artisans (lecture, vérification), documents, avis (lire, modérer, supprimer), contestations d'appels d'offres, litiges, contacts, demandes (lecture) |
| `commercial` | Vente | Lecture des artisans et des appels d'offres, codes promo, gestes commerciaux (crédits ≤ 5), prix manuel ≤ plafond, conversion (lire, piloter) |
| `finance` | Comptabilité | Lecture des finances et exports, lecture des appels d'offres et des artisans |
| `lecture` | Stagiaire, associé | Lecture seule, **sans données personnelles** (masquées) |

### `admins/{uid}`
`nom`, `email`, `role`, `permissionsPlus[]`, `permissionsMoins[]`, `permissionsEffectives[]` (calculé), `mfaObligatoire: true`, `ipAutorisees?: string[]`, `actif`, `dernierAcces`, `createdAt` (DATABASE §10).

### Catalogue des permissions
```
artisans.lire  artisans.creer  artisans.modifier  artisans.verifier  artisans.suspendre  artisans.supprimer
documents.valider
avis.moderer  avis.supprimer
demandes.lire  demandes.reattribuer  demandes.annuler
leads.publier  leads.prix  leads.prix_illimite  leads.offrir  leads.rembourser
credits.crediter  credits.crediter_illimite
finances.lire  finances.exporter  finances.rembourser_carte
referentiels.modifier  communes.modifier
matching.config  matching.forcer
litiges.traiter  contacts.traiter
promos.gerer  annonces.gerer
equipe.gerer  audit.lire  rgpd.traiter
avis.lire  leads.lire  litiges.lire  referentiels.lire  matching.lire      (lecture de section)
conversion.lire  conversion.piloter  conversion.configurer
comportement.lire  comportement.replays  comportement.configurer
ia.utiliser  ia.configurer
studio.utiliser                                                          (Studio vidéo, section `std`)
```

### Règles d'affichage (reflet de la vérification serveur)
- **Menu** : une section n'apparaît que si le membre a au moins une de ses permissions de lecture
- **Boutons** : visibles mais désactivés, avec l'infobulle « Permission requise : x.y », quand la permission manque (le serveur refuse de toute façon)
- **Plafonds** : `commercial` limité à 5 crédits par geste (`credits.crediter_illimite` au-delà) et à 30 € HT de prix manuel (`leads.prix_illimite` au-delà)
- **Surcharges individuelles** : `admins/{uid}.permissionsPlus[]` / `permissionsMoins[]` en plus du rôle ; permissions effectives = rôle + plus − moins, calculées par `syncClaims` et stockées dans `admins/{uid}.permissionsEffectives` ; le claim ne porte que le rôle et les **codes de lecture de section** (`staff: { r, s: ['art','cnv',…] }`), car la liste complète dépasserait la limite de 1 000 octets des claims. Toute écriture relit `admins/{uid}` côté serveur
- **Rôles personnalisés** : `rolesAdmin/{id}` (`nom`, `permissions[]`) ; les 6 rôles système sont en lecture seule ; un rôle utilisé ne peut pas être supprimé
- **Garde-fous** : personne ne modifie ses propres droits ni ne se désactive ; il reste toujours au moins un superadmin actif ; invitations limitées au domaine @portailtravaux.fr
- **Rôle `lecture`** : données personnelles masquées partout, aucune action d'écriture
- **« Aperçu en tant que »** (maquette) : en production, réservé au superadmin, en lecture seule, et journalisé

### Sécurité de l'admin
- MFA **obligatoire** (page `/admin/securite` à la première connexion ; `ADMIN_MFA=desactive` réservé aux tests de bout en bout), session de 8 h maximum, déconnexion après 30 min d'inactivité
- Toute action d'écriture passe par une action serveur `actionAdmin()` nommée `admin*` qui : vérifie la permission, valide avec Zod, exécute l'action dans une transaction et écrit `auditLog` (avant et après). Choix du lot 13 : actions serveur du site plutôt que Functions appelables
- Les données personnelles sont masquées par défaut (`c•••@gmail.com`) ; le bouton « Afficher » journalise la consultation
- Les actions destructrices demandent une **double confirmation** et un **motif obligatoire**

---

## 2. Écrans

### 2.1 Tableau de bord `/admin`
Indicateurs du jour et des 30 derniers jours : demandes reçues, taux de mise en relation, délai moyen de première réponse, appels d'offres ouverts ou sans preneur, **chiffre d'affaires** (abonnements + leads + packs), MRR, churn, artisans en attente de vérification, avis en attente, litiges ouverts. Alertes : décennales expirant sous 7 j, leads non débloqués depuis plus de 24 h, taux de remboursement des leads supérieur à 10 %.

### 2.2 File de travail `/admin/file`
Liste unifiée `filesModeration`, triée par priorité puis ancienneté, avec assignation et SLA (couleur selon le délai).

`filesModeration/{id}` : `type` (`document`, `avis`, `signalement`, `remboursement_lead`, `litige`, `contact`, `artisan_nouveau`, `lead_sans_preneur`, `fraude_suspectee`), `refPath`, `priorite` (1–5), `slaLe`, `assigneA`, `statut` (`a_traiter`, `en_cours`, `fait`), `resolution`, `createdAt`.

### 2.3 Artisans `/admin/artisans` et `/admin/artisans/[id]`
- Liste avec filtres : statut, plan, vérification, métier, zone, note, taux de réponse, date d'expiration de la décennale
- Fiche 360° en onglets : **Identité** (SIREN, vérification INSEE, Kbis), **Documents** (aperçu, valider ou refuser avec motif, dates de validité), **Fiche publique** (édition, masquer un contenu), **Abonnement** (Stripe, lien vers le Dashboard), **Crédits** (solde, mouvements, bouton « Créditer » avec motif), **Leads** (achats, remboursements), **Avis**, **Scores** (issus de `artisanScores` : qualité, réactivité, capacité), **Sanctions** (avertir, suspendre, déréférencer), **Notes internes**, **Audit**
- Onglet **Équipe** : membres, rôles, invitations en cours, sièges ; transfert de propriété assisté (`adminTransfererPropriete`) ; revendications en attente. Voir `COMPTES.md`
- Actions : créer une entreprise non revendiquée (`adminCreerEntreprise`), se connecter en tant que l'artisan (**impersonation en lecture seule**, journalisée), renvoyer l'email de vérification, forcer le recalcul de la fiche publique

### 2.4 Demandes et dossiers diagnostic `/admin/demandes`
- Liste et détail : réponses, estimation, **trace de l'algorithme** (`matching/{demandeId}` : candidats, scores, raisons d'exclusion)
- Actions : **réattribuer** (ajouter ou retirer un artisan manuellement), relancer l'algorithme, convertir en appel d'offres, marquer comme spam, annuler

### 2.5 Appels d'offres et prix `/admin/appels-d-offres` (prévu `/admin/leads`)
- Liste : prix courant, mode (`auto`, `manuel`, `gratuit`), nombre de déblocages sur le maximum, temps écoulé depuis l'ouverture, qualité du lead
- **Éditeur de prix** sur chaque appel d'offres :
  - affichage du détail du calcul automatique (base × coefficients)
  - passage en **prix manuel** (HT, prix Premium, crédits), dans les bornes plancher et plafond ; au-delà, permission `leads.prix_illimite` requise
  - **promo** (pourcentage et date de fin), **gratuit**, modification du nombre maximal de déblocages, changement de l'accès (tous, Premium seul, Premium prioritaire)
  - motif obligatoire, historique affiché
- **Barèmes** `/admin/appels-d-offres/baremes` : édition de `grillesTarifaires` (prix de base par métier, coefficients, remise Premium, valeur du crédit), **simulateur** qui montre l'effet d'une modification sur les 50 derniers leads avant publication, versionnement
- **Packs de crédits** `/admin/leads/packs` : **pas encore fait** (les packs sont dans le catalogue Stripe du code, `CATALOGUE_STRIPE`)
- **Publication Facebook** `/admin/appels-d-offres/facebook` : texte d'un appel d'offres à publier dans le groupe (`adminPublicationFacebook`), ajouté pendant le lot 13
- **Remboursements** `/admin/appels-d-offres/contestations` : file des contestations ; accepter (en crédits ou sur la carte) ou refuser avec motif. Au-delà de 3 contestations acceptées sur un même particulier, le lead est automatiquement marqué comme douteux

### 2.6 Avis `/admin/avis`
File `en_attente`, avec un score de risque (même IP, compte récent, texte dupliqué, auteur lié à l'artisan). Actions : publier, refuser (motif prédéfini, envoyé à l'auteur), demander une preuve, suspendre. Signalements. Aucune modification du texte n'est possible (politique d'avis), seulement un masquage partiel de données personnelles, journalisé.

### 2.7 Litiges et médiation `/admin/litiges`
Fil d'échanges particulier, artisan et médiateur ; pièces jointes ; statuts ; conséquences possibles (sanction, remboursement de lead, avis suspendu).

### 2.8 Finances `/admin/finances`
Abonnements actifs, MRR, factures, achats de leads, packs vendus, remboursements, codes promo. **Exports CSV** mensuels pour la comptabilité : date, n° de pièce, client, HT, TVA, TTC, moyen de paiement. Les remboursements par carte passent par la Function `adminRembourserStripe`.

### 2.8b Conversion `/admin/conversion`
Maquette : `designs/Admin Portail Travaux.dc.html`. Onglets :
- **Vue d'ensemble** : indicateurs, entonnoir, meilleurs emails par revenu attribué, gain par rapport au groupe témoin
- **Séquences** : statut, performances par étape, tests A/B, modifier et tester l'envoi
- **Journal** : `cycleTraces` en temps réel, filtres (envois, non-envois avec leur raison, signaux, conversions, admin), export CSV
- **Fiche cycle** : étape, score détaillé, signaux, historique ; pause, forcer une étape, exclure
- **Tâches** : appels commerciaux, réponses, risques de résiliation, activation
- **Réglages** : interrupteur général, pression, remises, seuils du score, groupe témoin

Détail technique : CONVERSION.md §9.

### 2.8c Comportement `/admin/comportement`
Cartes de chaleur (clics, trajets, attention, défilement, frictions, sorties) sur la page réelle, alertes détectées, replays. Détail : COMPORTEMENT.md. Maquette : `designs/Admin Comportement.dc.html`.

### 2.8d Assistant IA `/admin/ia`
« Audit IA conversion », objectif unique : augmenter la conversion. Choix des données (toutes ou une combinaison) et du mode (points d'amélioration ou audit complet noté par étape de l'entonnoir), recommandations avec étape visée, gain estimé, preuves et actions (test A/B, tâche, texte), questions de suivi, historique. Accès : 2e entrée du menu, bouton flottant sur toutes les sections, bandeau du dernier audit sur le tableau de bord. Détail : IA_ADMIN.md. Maquette : `designs/Admin IA.dc.html`.

### 2.9 Référentiels `/admin/referentiels`
Prestations du simulateur (paramètres de prix), communes (textes SEO, `adminTexteCommune`), **pages de secteur** (onglet « Pages de secteur (SEO) » : état d'indexation et du texte IA de chaque page métier × commune ; bloquer, débloquer, faire réécrire le texte, `adminPageSecteur`, motif obligatoire), **feature flags** (`config/flags`, `adminChangerFlag`, dont `maintenance`, `dessin`, `dessinPublic`). Chaque modification de prix crée une nouvelle `version`. **Pas faits** (choix du lot 13) : édition des métiers et labels (identifiants utilisés partout, changement par le dépôt), diagnostics, `config/app`, écran « Recherche » (RECHERCHE §5).

### 2.10 Algorithme `/admin/matching`
Édition de `matchingConfig/actif` (poids, seuils, quotas, fenêtres). Mode **« bac à sable »** : rejouer une demande passée avec la nouvelle configuration et comparer les classements. Indicateurs : taux d'acceptation par rang, délai de réponse, taux de conversion en devis signé, équité (répartition entre gratuits et Premium).

### 2.11 Contenus `/admin/contenus`
Annonces in-app (`annonces` : cible, texte, période), statistiques publiques forcées, pages légales (version et date de mise à jour).

### 2.12 Équipe et audit `/admin/equipe`, `/admin/equipe/audit`
Invitation d'un membre (email, rôle, permissions ; email `invitation-equipe-admin`), modification, désactivation. Journal d'audit filtrable par acteur, cible et action, en lecture seule, exportable. **Pas encore fait** : écran des rôles personnalisés (`rolesAdmin`, lus par le calcul des permissions mais sans écran de création) et contrôle de `admins.ipAutorisees`.

### 2.14 Studio vidéo `/admin/studio` (ajouté)
Outil interne de création de vidéos (sujets, tournage, montage multipiste, captures, publication et résultats sur YouTube, Instagram, TikTok, calendrier, idées). Permission `studio.utiliser` (section `std`). Détail : STUDIO.md ; données : DATABASE §15 quinquies.

### 2.15 Double authentification `/admin/securite`
Première connexion : activation obligatoire du second facteur avant d'entrer dans l'admin.

### 2.13 RGPD `/admin/rgpd`
Demandes d'accès, de rectification et d'effacement : délai légal d'un mois, génération de l'export, exécution de l'anonymisation, preuve de traitement.

---

## 3. Actions admin (permission vérifiée et audit)
**Fait autrement que prévu** : ce ne sont pas des Functions appelables mais des actions serveur du site, `actionAdmin({ nom, permission })`, rangées dans `apps/web/features/admin*/actions*.ts` et `features/studio/` ; la logique est dans `@ph/firebase/admin-serveur` et les autres paquets serveur. Noms réels (audit) : `adminValiderDocument`, `adminVerifierArtisan`, `adminSanctionner`, `adminModererAvis`, `adminSupprimerAvis`, `adminFixerPrixLead`, `adminPromoLead`, `adminParametresLead`, `adminPublicationFacebook`, `adminCrediter`, `adminTraiterRemboursementLead`, `adminReattribuer`, `adminRelancerMatching`, `adminRejouerDemande`, `adminRejeterDemande`, `adminMajBareme`, `adminSimulerBareme`, `adminMajMatchingConfig`, `adminMajReferentiel`, `adminTexteCommune`, `adminChangerFlag`, `adminImpersonerLecture`, `adminAfficherDonnee`, `adminNoteInterne`, `adminCreerEntreprise`, `adminSupprimerEntreprise`, `adminInviterRevendication`, `adminTransfererPropriete`, `adminRecalculerFiche`, `adminDeciderLitige`, `adminMessageLitige`, `adminTraiterRgpd`, `adminEnregistrerRgpd`, `adminInviterEquipe`, `adminModifierEquipe`, `adminActiverSource`, `adminPublierAnnonce`, `adminArreterAnnonce`, `adminTache`, conversion (`adminCycleAction`, `adminReglagesCycle`, `adminSequence*`), comportement (`adminLectureReplay`, `adminStatutAlerteComportement`), IA (`adminAnalyseIa`, `adminQuestionSuiviIa`, `adminRecommandationIa`, `adminReglagesIa`), Studio (`adminStudio*`).
`adminExportFinances` : export mensuel des pièces (`piecesDuMois`), journalisé. « Offrir » un appel d'offres passe par `adminFixerPrixLead` (mode `gratuit`). Prévues et **pas faites** sous ces noms : `adminPublierLead`, `adminOffrirLead`, `adminRembourserStripe` (remboursement par carte depuis l'admin, non trouvé dans le code).

## 4. Autres collections

- `sanctions/{id}` : `artisanId`, `type` (`rappel`, `avertissement`, `suspension`, `dereferencement`), `motif`, `refs` (avis, litige), `debut`, `fin?`, `parUid`, `levéeLe?`, `createdAt`. Une suspension active force `artisans.enLigne = false`.
- `notesInternes/{id}` : `cible` (`artisans/xxx`, `demandes/xxx`, `users/xxx`), `texte`, `parUid`, `epingle`, `createdAt`.
