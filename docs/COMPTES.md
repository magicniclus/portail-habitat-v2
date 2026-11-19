# Comptes, entreprises, multi-utilisateur et simulation

Ce document décrit **toute la logique d'identité** : création des comptes (particulier, artisan, admin), ajout et revendication d'entreprise, équipes multi-utilisateurs, bascule entre entreprises, sortie d'un membre, suppression. Il couvre aussi la **simulation** : le simulateur de devis (calcul client et recalcul serveur), le mode « voir en tant que », et l'environnement de test (émulateurs, jeux de données, Stripe test).

Principe de base : **une personne = un `users/{uid}`**, **une entreprise = un `artisans/{artisanId}`**. Le lien entre les deux est `artisans/{id}/membres/{uid}`. Une personne peut être à la fois particulier et membre d'une ou plusieurs entreprises.

---

## 1. Modèle d'identité

```
users/{uid}                    personne (Firebase Auth)
  roles: ['particulier', 'artisan']      ← cumulables
  entreprises: [artisanId…]              ← miroir dénormalisé (≤ 10)
  entrepriseActive: artisanId?           ← dernière entreprise utilisée

artisans/{artisanId}           entreprise (1 SIREN = 1 entreprise, 1 fiche publique par établissement)
  ├─ membres/{uid}             rôle dans l'entreprise
  └─ etablissements/{siret}    optionnel : agences / établissements secondaires

invitations/{id}               invitation d'un collaborateur (lien signé, 7 j)
revendications/{id}            demande de rattachement à une entreprise existante
admins/{uid}                   équipe interne (voir ADMIN.md)
```

### Modifications à apporter à `DATABASE.md`

| Collection | Changement |
|---|---|
| `users/{uid}` | `role` devient **`roles: string[]`** (`particulier`, `artisan`). Ajout de `entreprises: string[]`, `entrepriseActive?`, `fournisseurs: ('password'\|'lien'\|'google'\|'telephone')[]`, `origine` (`inscription`, `demande`, `onboarding_pro`, `invitation`, `admin`). `artisanId` est **déprécié** au profit de `entreprises` |
| `artisans/{id}/membres/{uid}` | `role: 'proprietaire' \| 'gerant' \| 'collaborateur' \| 'comptable'`, `permissions?: string[]` (surcharge), `statut: 'actif' \| 'suspendu'`, `notifs: { demandes, avis, factures }`, `metiers?: string[]` (routage des demandes), `ajouteLe`, `ajoutePar`, `invitationId?`, `derniereActivite` |
| `artisans/{id}` | Ajout de `nbMembres`, `siegesMax` (selon la formule, écrit par le webhook Stripe), `proprietaireUid`, `origine` (`onboarding`, `admin`, `import`), `revendiquee: bool` |
| Custom claims | `{ roles, ent: { [artisanId]: 'p'\|'g'\|'c'\|'x' }, staff?, imp? }` (≤ 10 entreprises, ≤ 1 000 octets). Rafraîchis par `syncClaims` à chaque changement de `membres` ou de `admins` ; le client force `getIdToken(true)`. Règles complètes : DATABASE.md §12 |
| `demandesAcces/{id}` | nouvelle collection : `artisanId`, `demandeurUid`, `message`, `statut` (`ouverte`, `acceptee`, `refusee`, `expiree`), `traitePar?`, `expireLe` (+14 j), `createdAt` |

> Les règles de sécurité lisent **les claims** pour les accès courants (rapide, sans lecture facturée) et **le document `membres`** pour les actions sensibles (facturation, membres), afin qu'une révocation soit immédiate même si le token n'a pas encore expiré.

---

## 2. Création de compte particulier

Trois portes d'entrée, un seul compte à la fin.

| Porte | Déclencheur | Méthode | `origine` |
|---|---|---|---|
| Envoi d'une demande (simulateur, fiche, hero, diagnostic) | l'email n'existe pas | **Compte créé côté serveur**, lien magique envoyé dans l'email de confirmation | `demande` |
| « Mon espace » | inscription volontaire | lien magique (par défaut), mot de passe ou Google | `inscription` |
| Avis | l'auteur n'a pas de compte | pas de compte obligatoire ; email vérifié par lien ; compte proposé ensuite | — |

### Flux « demande sans compte » (`creerDemande`, Server Action)
1. Validation Zod + rate limit (`rateLimits`, 5 demandes / h / IP) + App Check
2. `getUserByEmail(email)` :
   - **n'existe pas** → `createUser({ email, emailVerified: false })`, `users/{uid}` avec `roles: ['particulier']`, `origine: 'demande'`
   - **existe** → on rattache la demande à cet uid **sans connecter la personne** (sinon, n'importe qui pourrait accéder au compte avec un email). Le lien de l'email mène à la connexion
3. Écriture de `demandes/{id}` (`particulierUid`) et du consentement, en transaction
4. Email « Votre demande PT-XXXXXX » avec un lien magique (valable 24 h) vers `/mon-espace/demandes/{id}`
5. Au premier clic : `emailVerifie = true`, acceptation des CGU enregistrée si ce n'est pas déjà fait

### Liaison de méthodes
Un même email connecté par Google puis par lien magique doit donner **le même uid** : activer « One account per email address » dans Firebase Auth et gérer l'erreur `auth/account-exists-with-different-credential` en proposant de lier (`linkWithCredential`).

### Changement d'email
Nouvelle adresse vérifiée par lien (`verifyBeforeUpdateEmail`), alerte envoyée à l'ancienne adresse avec un lien « Ce n'était pas moi » qui annule et bloque le compte 24 h. La copie `demandes.contact.email` des demandes ouvertes est mise à jour par trigger.

---

## 3. Création de compte artisan et ajout d'entreprise

Maquettes : `Acquisition Artisans v2` → `Onboarding Etape 2` (zone) → `Onboarding Etape 3` (compte) → `Espace Artisan Dashboard on boarding`.

### 3.1 Étape SIREN (formulaire de la page d'acquisition)
**Premier formulaire (décision du 17/11/2026, formulaire court)** : métier principal, code postal, email ; chantiers du métier tous acceptés (repliés derrière « Modifier mes chantiers »). Ni nom, ni téléphone, ni case : la phrase « En continuant, vous acceptez… » vaut acceptation, et le serveur enregistre la version des conditions (`cgv: {version, le}`) dans le brouillon. Le nom vient du compte Google, ou d'un champ « Nom et prénom » à l'étape compte (email et mot de passe seulement). Le téléphone est demandé dans l'espace pro, dans la fenêtre « Votre numéro », avant la première demande acceptée s'il manque (ONB-01d) ; il est écrit sur la fiche comme depuis Ma fiche. Anciens brouillons : nom et téléphone de l'étape 1 encore lus s'ils existent.

La recherche de l'entreprise se fait à l'**étape compte** (§3.3), pas sur la page d'acquisition. Function `rechercherEntreprise(q)` (nom ou SIREN) : appel à l'**API Recherche d'entreprises** (`recherche-entreprises.api.gouv.fr`, sans clé), d'abord dans le département du code postal de l'étape 1, puis dans toute la France. Résultat mis en cache 24 h (`cacheSirene/{siren}`). L'appel à l'API Sirene INSEE prévu au départ **n'est pas fait** : il n'apportait rien de plus pour ces contrôles (AVANCEMENT §10).

| Cas | Comportement |
|---|---|
| SIREN inconnu | lien « Je ne trouve pas mon entreprise » : SIRET, nom et adresse du siège saisis à la main. Si le SIREN est finalement au répertoire, il est reconnu ; sinon `verification.statut = 'a_faire'`, fiche hors ligne, tâche de modération prioritaire, en ligne dès la vérification (15/11/2026) |
| Entreprise **fermée** (`etatAdministratif = 'C'`) | refus, message clair |
| Code NAF hors bâtiment (hors section F et 71.20B pour les diagnostiqueurs) | accepté mais marqué `fraude_suspectee` dans `filesModeration` |
| Entreprise < 3 mois | acceptée, label « Nouvelle entreprise » ; décennale demandée, « Assurance non vérifiée » affiché d'ici là (15/11/2026) |
| SIREN **déjà inscrit et revendiqué** | pas de doublon : écran « Cette entreprise a déjà un compte » avec 2 choix → **demander à rejoindre** (§4.4) ou **signaler une usurpation** (contact support) |
| SIREN présent mais **non revendiqué** (fiche créée par l'admin ou importée) | flux de **revendication** (§3.4) |

### 3.1 bis Métiers : un référentiel unique
Particuliers, artisans, simulateur, annuaire et matching utilisent **le même référentiel** `referentiel/recherche` (`data/recherche-intentions.json`) :
- **60 métiers** (`metiers/{id}` : nom, alias, famille, prestation par défaut) ;
- **137 intentions** de projet, chacune rattachée à **un métier** et à **une prestation estimable**.

Tout se fait dans le **premier formulaire** (maquette `Acquisition Artisans v2`), **par listes déroulantes, sans recherche par mot-clé** :
1. **Métier principal** : `<select>` obligatoire, les 60 métiers regroupés par famille (`<optgroup>`), triés par ordre alphabétique
2. **Autres métiers** : **retirés du premier formulaire** (décision du propriétaire du 25/10/2026). Ils s'ajoutent ensuite dans Ma fiche (≤ 5 métiers au total)
3. **Chantiers acceptés** : toutes les intentions du métier principal, **acceptées d'office et repliées** derrière « Modifier mes chantiers » (17/11/2026 : le formulaire ne s'allonge plus) ; l'artisan peut décocher ce qu'il ne fait pas (ex. un couvreur qui ne pose pas de Velux)
4. Les choix sont transmis aux étapes suivantes (`metiers`, `intentions`) ; l'étape 2 (`Onboarding Etape 2`) ne gère que la zone et le rayon, et utilise les métiers pour le nombre de demandes récentes affiché (STATS_DEMANDES)
5. Enregistré dans `artisans/{id}` : `metierPrincipal` (id), `metiers[]` (ids, ≤ 5), `intentions[]` (ids acceptés). Aucun libellé libre
6. Métier absent de la liste : lien « Mon métier n'est pas dans la liste » → `contacts` (type `metier_manquant`) ; l'admin l'ajoute au référentiel (écran Recherche, ADMIN)

**Correspondance** : une demande porte `intention` + `prestation` (issues de la recherche ou du simulateur). Le matching retient les artisans dont `intentions` contient l'intention de la demande (à défaut, dont `metiers` contient son métier). L'annuaire filtre sur `metiers`, la fiche publique affiche les libellés des intentions acceptées.

### 3.2 Étape Zone (`Onboarding Etape 2`)
**Fait (15/11/2026)** : ville proposée d'office d'après le code postal de l'étape 1 (`/api/lieux`, attente de 5 s au plus ; ville proposée sans attendre plus de 1,5 s), **curseur de 10 à 100 km** (pas de 5 km, 30 km par défaut, `RAYON_ZONE`), plus d'estimation chiffrée : une phrase « Au moins N demandes de travaux déposées ces dernières 48 h autour de {ville}, dans un rayon de {rayon} km », N suivant le rayon et jamais sous 3 (`demandesRecentes`, `DEMANDES_RECENTES_MIN`, 17/11/2026). La liste de communes, le budget minimum et l'adresse du siège préremplie prévus au départ ne sont **pas** demandés à cette étape (l'adresse vient de l'entreprise choisie à l'étape 3). Les données restent dans un **brouillon** `brouillonsOnboarding/{brouillonId}` (TTL 30 j, identifiant en cookie httpOnly) : l'artisan peut quitter et reprendre sur un autre appareil via le lien envoyé par email.

### 3.3 Étape Compte (`Onboarding Etape 3`) → Function `finaliserOnboarding`
En **une transaction** :
1. Crée ou récupère l'utilisateur (email + mot de passe, ou Google), ajoute `artisan` à `roles`
2. Vérifie à nouveau l'unicité du SIREN (`sirenIndex/{siren}` créé dans la transaction : **garde-fou contre les doubles clics et les inscriptions concurrentes**)
3. Crée `artisans/{id}` (`statut: 'actif'`, `enLigne: true` et `sirenReconnu: { par: 'repertoire' }` si l'entreprise a été trouvée au répertoire, sinon `enLigne: false` et `verification.statut: 'a_faire'` ; `verification.statut: 'en_cours'` dans le premier cas, `droits: droitsInitiaux('gratuit')` (le champ `plan` n'existe plus, PAIEMENTS §5), `siegesMax: 1`, `proprietaireUid`, `onboarding.etape: 3`, `acquisition` (source de la landing), `emailContact` si différent de l'email du compte)
4. Crée `membres/{uid}` avec `role: 'proprietaire'`
5. Crée `portefeuilles/{id}` (solde 0). `prive/facturation` n'est **pas** créé ici : il exige un client Stripe et est créé au premier paiement (AVANCEMENT §10)
6. Met à jour `users/{uid}.entreprises` et `entrepriseActive` (et le prénom / nom s'il n'y en a pas), enregistre le consentement aux CGV, puis les custom claims
7. Supprime le brouillon, envoie l'email `bienvenue-pro` (fiche en ligne, ou vérification en cours) et place une tâche `artisan_nouveau` dans `filesModeration` (priorité 1 si le SIREN a été saisi à la main)

**Téléphone** : il n'est plus demandé à l'inscription (17/11/2026). Avant la première demande acceptée, s'il manque sur la fiche, la fenêtre « Votre numéro » le demande (ONB-01d) ; il est enregistré comme depuis Ma fiche. **Pas encore fait** : la vérification par SMS prévue au départ (Firebase Phone Auth) ; les SMS Identity Platform sont prêts mais coupés par le flag `deuxFacteursSms`.

**Mise en ligne dans l'annuaire** (`enLigne = true`, décision du propriétaire du 15/11/2026, règle `ficheDoitEtreEnLigne` du core) : la fiche est en ligne **dès que le SIREN est reconnu** (`sirenReconnu`) :
- trouvé au répertoire à l'inscription (`par: 'repertoire'`), ou vérifié par un modérateur (`adminVerifierArtisan`, `par: 'moderateur'`) ;
- jamais si le SIREN n'est pas contrôlé (« Je ne trouve pas mon entreprise » : SIRET, nom et adresse saisis à la main, fiche hors ligne et tâche de modération prioritaire), refusé ou expiré (`verification.statut`), si l'entreprise est suspendue, ou si l'artisan l'a mise hors ligne lui-même (`horsLigneVolontaire`) ;
- ni la vérification du téléphone par SMS, ni l'attestation décennale, ni la complétude ne sont exigées. Tant que l'assurance n'est pas vérifiée, la fiche publique, l'annuaire et le tableau de bord affichent « Assurance non vérifiée » (lien pour envoyer l'attestation).
- L'interrupteur « Fiche en ligne » de Ma fiche se rallume dès que le SIREN est reconnu, fiche complète ou non ; une levée de suspension remet la fiche en ligne selon la même règle.
- Fiches créées avant cette règle : migration `002-siren-reconnu` (`pnpm migrer 002-siren-reconnu --dry-run`, puis `--executer` avec le « go » du propriétaire).

**Étape 3 (15/11/2026)** : « Créez votre compte » ; « Continuer avec Google » (l'email Google devient l'identifiant, celui de l'étape 1 devient l'email de contact de la fiche s'il est différent) ou email + mot de passe (10 caractères au moins, confirmé) ; pas de lien magique ; conditions générales acceptées une seule fois, à l'étape 1. Recherche d'entreprise par nom : département du code postal de l'étape 1 d'abord, puis toute la France ; un seul résultat possible → sélectionné d'office ; sinon « Je ne trouve pas mon entreprise » (§3.1). Prénom et nom : depuis le 17/11/2026 ils ne sont plus à l'étape 1 ; ils viennent du compte Google, ou d'un champ « Nom et prénom » à cette étape (email et mot de passe seulement), et sont écrits dans le profil.

**Premier écran** (15/11/2026) : espace neuf (ni présentation, ni demande, ni avis) → « Bienvenue {prénom}, votre espace est prêt » et un seul bouton « Rédiger ma fiche avec l'IA ».

### 3.4 Revendication d'une fiche existante (`revendications/{id}`)
Pour les fiches créées par l'admin (prospection) ou importées.

> **État (19/11/2026)** : seule la revendication **par invitation de l'admin** est faite (§3.5, `invitations` avec rôle `proprietaire`, lot 13). Les preuves automatiques ci-dessous (`demanderRevendication`, `validerRevendication`, email sur le domaine, robot vocal, courrier) **ne sont pas encore faites** ; la collection `revendications` n'existe que dans le jeu de test. Une demande de revendication passe par le support.
`artisanId`, `demandeurUid`, `siren`, `preuve` (`email_domaine`, `kbis`, `courrier_code`, `telephone_siege`), `statut` (`ouverte`, `acceptee`, `refusee`), `traitePar`, `createdAt`.

| Preuve | Validation |
|---|---|
| Email sur le domaine du site de l'entreprise | automatique après clic sur le lien |
| Appel au numéro du siège (code à 6 chiffres lu par un robot vocal) | automatique |
| Kbis de moins de 3 mois au nom du demandeur (dirigeant) | manuelle, file de modération |
| Courrier avec code envoyé à l'adresse du siège | automatique à la saisie du code (J+3 à J+5) |

À l'acceptation : le demandeur devient `proprietaire`, `revendiquee = true`, les avis et statistiques déjà présents sont conservés.

### 3.5 Entreprise créée par l'admin
`adminCreerEntreprise` (permission `artisans.creer`) : SIREN obligatoire, `origine: 'admin'`, `revendiquee: false`, **aucun membre**, `enLigne: false` tant qu'elle n'est pas revendiquée (pas de fiche publique d'une entreprise qui n'a rien demandé). L'admin peut envoyer une **invitation de revendication** à l'email du dirigeant (§4.2, rôle `proprietaire`).

### 3.6 Plusieurs établissements
Une entreprise avec plusieurs agences (SIRET différents, même SIREN) : sous-collection `etablissements/{siret}` avec adresse, zone et téléphone propres. **Une fiche publique par établissement** dans `artisansPublic` (`{artisanId}_{siret}`), les avis restent au niveau de l'établissement. Une formule payante couvre **un** établissement ; chaque établissement supplémentaire est un add-on Stripe (quantité sur l'abonnement).

> **Pas encore fait** : seuls le schéma et le chemin `etablissements` existent ; aucune fiche par établissement ni add-on Stripe.

### 3.7 Une personne, plusieurs entreprises
Autorisé (un gérant peut avoir deux sociétés). Limite : 10 entreprises par personne (taille des claims). Les demandes, crédits, factures et statistiques sont **toujours cloisonnés par entreprise**.

---

## 4. Multi-utilisateur (équipe d'une entreprise)

### 4.1 Rôles et permissions
| Permission | `proprietaire` | `gerant` | `collaborateur` | `comptable` |
|---|:-:|:-:|:-:|:-:|
| Voir et répondre aux demandes, envoyer un devis | ✓ | ✓ | ✓ (ses métiers ou celles qui lui sont assignées) | — |
| Débloquer un appel d'offres (dépense) | ✓ | ✓ | si `leads.debloquer` accordé, plafond mensuel | — |
| Modifier la fiche publique, réalisations | ✓ | ✓ | réalisations seulement | — |
| Répondre aux avis | ✓ | ✓ | — | — |
| Téléverser des documents | ✓ | ✓ | ✓ | — |
| Voir les statistiques | ✓ | ✓ | ✓ | — |
| Abonnement, moyen de paiement, packs de crédits | ✓ | ✓ | — | — |
| Factures et exports | ✓ | ✓ | — | ✓ |
| Devis et factures clients : faire des devis (`devis.gerer`) | ✓ | ✓ | ✓ | — |
| Émettre les factures clients (`factures.emettre`) | ✓ | ✓ | — | — |
| Site internet : éditer, publier, domaine (`site.gerer`) | ✓ | ✓ | — | — |
| Plans (`dessin.gerer`) | ✓ | ✓ | ✓ | — |
| Inviter, modifier ou retirer des membres | ✓ | ✓ (sauf propriétaire et gérants) | — | — |
| Transférer la propriété, fermer l'entreprise | ✓ | — | — | — |

Constantes dans `packages/core/src/equipe/permissions.ts` : `PERMISSIONS_PAR_ROLE` + surcharge par `membres.permissions`. Une seule fonction `peut(membre, action)` utilisée par l'UI **et** par chaque Server Action / Function.

### 4.2 Invitation (`invitations/{id}`)
`artisanId`, `email` (minuscules), `role`, `permissions?`, `metiers?`, `invitePar`, `jetonHash` (SHA-256 du jeton envoyé par email ; le jeton n'est jamais stocké en clair), `statut` (`envoyee`, `acceptee`, `revoquee`, `expiree`), `expireLe` (+7 j), `acceptePar?`, `createdAt`.

Flux :
1. `inviterMembre({ email, role })` : vérifie la permission, les **sièges disponibles** (`nbMembres + invitations en cours < siegesMax`), l'absence de doublon (déjà membre ou invitation active), et 20 invitations max par jour
2. Email « X vous invite à rejoindre Y sur Portail Travaux Pro » → `/pro/invitation?t=<jeton>`
3. La page affiche l'entreprise et le rôle ; connexion ou création de compte **avec le même email** (sinon, refus explicite : « Cette invitation est destinée à c•••@… »)
4. `accepterInvitation(jeton)` en transaction : création de `membres/{uid}`, `nbMembres + 1`, `users.entreprises` mis à jour, claims rafraîchis, notification à l'invitant
5. Renvoyer (nouveau jeton, l'ancien est invalidé), révoquer, expiration automatique par tâche planifiée

### 4.3 Sièges selon la formule
Premium n'existe plus (D54) : ses sièges sont passés à **Tout inclus** (`siegesInclus`, `packages/core/src/paiements/droits.ts`).

| Formule | Sièges inclus | Supplément |
|---|---|---|
| Gratuit, Fiche Pro, Site Pro, Fiche + Site | 1 (propriétaire seul) | — |
| Tout inclus | 3 | +9 € HT/mois par siège (prix Stripe `ph_siege`, Tout inclus seulement) |

- Retour d'une formule à 3 sièges vers une formule à 1 siège alors qu'il y a plus d'un membre : les membres **ne sont pas supprimés** ; ils passent en `statut: 'suspendu'` (sauf le propriétaire). Le propriétaire choisit qui garder si des sièges sont rachetés
- À signaler : D26 est ✅ dans DECISIONS (« 3 inclus, 9 € par siège » pour Premium), mais le code la qualifie encore de ⏳ (« 3 sièges Premium passent à Tout inclus », choix du lot 11 à valider, AVANCEMENT §24)
- `siegesMax` est écrit **uniquement par le webhook Stripe**

### 4.4 Demande pour rejoindre une entreprise
Depuis l'écran « Cette entreprise a déjà un compte » : `demanderAcces(artisanId, message)` → notification et email au propriétaire et aux gérants, qui acceptent (choix du rôle) ou refusent. Sans réponse sous 14 j : expiration. Le demandeur ne voit **jamais** l'email du propriétaire.

### 4.5 Bascule entre entreprises
- Sélecteur dans l'**en-tête** de l'espace pro (retiré de la barre latérale, D63, 16/10/2026), visible uniquement si `entreprises.length > 1` ; changement d'entreprise avec chargeur plein écran
- L'entreprise active est portée par l'URL (`/pro/[artisanId]/…`) **ou** par un cookie `ph_ent` signé ; toutes les requêtes serveur vérifient l'appartenance avant de lire
- Notifications et compteurs de badges calculés **par entreprise** ; le sélecteur affiche un point quand une autre entreprise a des demandes non lues

### 4.6 Assignation et routage des demandes
- Nouvelle attribution : notifiée aux membres dont `notifs.demandes = true` et, s'il est renseigné, dont `metiers` contient le métier de la demande
- `attributions/{artisanId}.assigneA?: uid` : un membre prend la demande (« Je m'en occupe ») ; les autres voient qui la traite. Réassignable par propriétaire et gérant
- Les délais de réponse (`tempsReponseMoyenMin`) restent calculés **au niveau de l'entreprise**
- Messages : chaque message porte `auteurUid` ; côté particulier, l'affichage reste « Prénom — Nom commercial »

### 4.7 Crédits et dépenses partagés
Le portefeuille est **celui de l'entreprise**. Chaque `mouvements/{id}` porte `par: uid`. Plafond optionnel par collaborateur (`membres.plafondCreditsMois`), vérifié dans la transaction de déblocage. Historique filtrable par membre.

### 4.8 Départ et retrait d'un membre
| Action | Règle |
|---|---|
| Un membre quitte l'entreprise | toujours possible, sauf le **dernier propriétaire** |
| Retrait par un propriétaire ou un gérant | `membres/{uid}` supprimé, claims révoqués (`revokeRefreshTokens`), demandes assignées remises à « non assignées », messages conservés avec son nom |
| Transfert de propriété | `transfererPropriete(uid)` : le destinataire doit être membre actif avec 2FA ; confirmation par mot de passe ; l'ancien propriétaire devient `gerant` |
| Propriétaire injoignable (décès, départ) | procédure support : Kbis à jour au nom du nouveau dirigeant, traitée par un admin (`adminTransfererPropriete`, audit) |

### 4.9 Suppression
- **Suppression du compte personnel** : bloquée si la personne est le dernier propriétaire d'une entreprise active (« Transférez la propriété ou fermez l'entreprise »). Sinon : retrait de toutes les équipes, anonymisation de `users/{uid}`, suppression Auth
- **Fermeture de l'entreprise** (propriétaire, mot de passe + 2FA) : abonnement Stripe annulé en fin de période, crédits non remboursés sauf packs de moins de 14 jours non entamés (droit de rétractation B2B non applicable : geste commercial), `statut: 'supprime'`, fiche retirée de l'annuaire, avis archivés, factures conservées 10 ans, membres retirés et notifiés

---

## 5. Connexion et sessions

- Particuliers : lien magique par défaut, mot de passe facultatif, Google
- Artisans : email + mot de passe (ou Google), **2FA par application (TOTP) proposée** à tous ; SMS prêt mais coupé (flag `deuxFacteursSms`). Exigée avant l'accès à la facturation pour le propriétaire et le gérant d'une entreprise **Tout inclus** (ex-Premium, CON-02, `facturationBloquee`)
- Session : cookie de session Firebase (`createSessionCookie`, 14 j pour les particuliers, 7 j pour les pros), rotation à chaque changement de rôle
- Blocage progressif après 5 échecs (délai exponentiel), alerte email à chaque nouvel appareil
- Un utilisateur `suspendu` est déconnecté (`revokeRefreshTokens`) et voit une page explicative ; la suspension d'une **entreprise** n'empêche pas l'accès particulier de ses membres

---

## 6. Simulation

### 6.1 Simulateur de devis (`/simulateur`, `lib/simulateur/`)
La logique vit dans `Simulateur de Devis.dc.html` (`PRESTATIONS`, `calculer`, `coefRegion`). À extraire telle quelle.

**Pipeline** :
1. Au chargement, lecture de `referentiel/prestations/items` (cache ISR 1 h) : champs, paramètres de prix, `version`
2. **Aucun prix affiché pendant le parcours** (voir ci-dessous « Révélation du prix »). Le calcul n'a lieu **qu'à l'envoi**, côté serveur
3. Reprise d'un parcours interrompu (local, compte ou lien par email), avec le choix entre reprendre et recommencer : voir **REPRISE_PARCOURS.md**
4. À l'envoi, la Server Action `creerDemande` calcule l'estimation avec `packages/core/simulateur` et **la renvoie dans sa réponse** ; c'est cette valeur que l'écran de résultat affiche. Le navigateur n'envoie aucun montant
5. L'estimation est **figée** dans `demandes.estimation` avec `versionReferentiel`

**Catalogue estimable** : 112 prestations en 15 familles — 9 détaillées (maquette du simulateur) + 103 déclaratives (`data/prestations-catalogue.json` : quantité × prix unitaire × coefficients des choix + forfait de base + options + évacuation). **Chaque intention de recherche et chaque métier pointe vers une prestation estimable** (vérifié par `scripts/verifier-referentiel.ts`). L'étape 1 du simulateur propose une recherche et des onglets par famille ; `?prestation=` démarre directement à l'étape 2.

**Révélation du prix (simulateur et diagnostic)**
- Le prix n'apparaît **qu'après l'envoi des coordonnées**, sur l'écran de résultat. Pendant le parcours, l'encadré latéral indique seulement la progression (« Plus que 2 étapes ») ; la dernière étape annonce « Votre estimation est prête » et liste ce qu'elle contiendra, sans montant
- Le parcours diagnostic affiche **la liste des diagnostics obligatoires** avant l'envoi (c'est l'information utile et gratuite), mais **aucun prix** ; budget total et prix par diagnostic apparaissent après l'envoi
- Les **paramètres de prix ne sont pas publics** : `referentiel/prestations/items` ne contient que les champs et libellés (lecture publique) ; les prix unitaires et coefficients sont dans `referentiel/prestations/prix/{id}` (lecture refusée au client, Admin SDK uniquement). Sinon le prix serait calculable dans le navigateur
- L'encart de reprise (REPRISE_PARCOURS.md) n'affiche **pas** de montant
- La case « mise en relation avec 3 artisans » reste facultative : on peut obtenir l'estimation seule par email (consentement libre, RGPD)

**Tests** : table de cas (`__tests__/simulateur.cases.json`) : une trentaine de combinaisons par prestation avec le résultat attendu, partagée entre les tests unitaires et le recalcul serveur. Toute modification des paramètres dans l'admin rejoue ces cas et affiche l'écart avant publication (voir ADMIN.md §2.9).

### 6.2 Mode « voir en tant que »
| Qui | Quoi | Garde-fous |
|---|---|---|
| Artisan | « Aperçu de ma fiche publique » : rend `/artisans/[slug]` avec les données **non encore publiées** | `?apercu=1` + vérification d'appartenance ; bandeau « Aperçu : non visible du public » ; `noindex` |
| Artisan | « Aperçu côté particulier » dans Ma fiche : le formulaire de demande tel que le voit le particulier (numéro masqué sans Fiche Pro). L'aperçu « Gratuit / Premium » de la carte d'annuaire prévu au départ **n'est pas fait** | purement visuel, aucune écriture |
| Admin | **Impersonation en lecture seule** (`adminImpersonerLecture`) : ouvre l'espace pro ou particulier tel que la personne le voit | token personnalisé avec claim `imp: { par, cible, lectureSeule: true }`, durée 15 min ; **toute écriture refusée** côté règles (`request.auth.token.imp == null`) et côté Functions ; bandeau rouge permanent ; entrée `auditLog` au début et à la fin ; la cible est notifiée si elle l'a demandé dans ses préférences |

### 6.3 Simulateur de l'algorithme et des prix (admin)
Voir ADMIN.md §2.5 (barèmes : effet sur les 50 derniers leads) et §2.10 (bac à sable du matching : rejouer une demande passée). Ces simulations **n'écrivent jamais** dans les collections de production : résultats en mémoire, ou dans `simulations/{id}` (TTL 7 j) pour partager un résultat.

### 6.4 Environnements et données de simulation
| Environnement | Projet Firebase | Stripe | Emails |
|---|---|---|---|
| Local | Emulator Suite (Auth, Firestore, Functions, Storage) | mode test + `stripe listen` | capturés (Mailpit) |
| Préproduction | `portail-travaux-staging` | mode test, **Test Clocks** pour simuler renouvellements, échecs de paiement et fins d'abonnement | envoi limité à une liste blanche |
| Production | `portail-travaux-prod` | live | réel |

**Jeu de données** (`scripts/seed.ts`, déterministe avec une graine) :
- 60 artisans répartis sur 11 communes de Gironde, tous plans et statuts de vérification, dont 5 entreprises multi-membres (propriétaire, gérant, collaborateur, comptable) et 1 personne membre de 2 entreprises
- 200 demandes à tous les statuts, 40 appels d'offres (auto, manuel, gratuit, promo), 300 avis dont certains en attente ou signalés
- 1 fiche non revendiquée, 1 invitation expirée, 1 revendication en cours, 1 SIREN en doublon
- Comptes de test fixes : `particulier@test.local`, `proprio@test.local`, `collab@test.local`, `compta@test.local`, `admin@test.local` (mot de passe commun en variable d'environnement, **jamais en production** : le script refuse de tourner si `NODE_ENV=production` ou si le projet ne se termine pas par `-staging` ou `-local`)

---

## 7. Functions et Server Actions

| Nom | Type | Rôle |
|---|---|---|
| `rechercherEntreprise` | callable | Recherche SIREN, cache |
| `sauverBrouillonOnboarding` | Server Action | Brouillon étapes 1–2 |
| `finaliserOnboarding` | callable | Création entreprise + propriétaire (§3.3) |
| `demanderRevendication`, `validerRevendication` | callable | §3.4 — **pas encore fait** |
| `inviterMembre`, `renvoyerInvitation`, `revoquerInvitation`, `accepterInvitation` | callable | §4.2 |
| `demanderAcces`, `repondreDemandeAcces` | callable | §4.4 |
| `modifierMembre`, `retirerMembre`, `quitterEntreprise`, `transfererPropriete` | callable | §4.8 |
| `assignerDemande` | callable | §4.6 |
| `fermerEntreprise`, `supprimerMonCompte` | callable | §4.9 |
| `syncClaims` | trigger `membres/{uid}` écrit | Recalcule `users.entreprises` et les custom claims |
| `expirerInvitations` | planifiée, chaque heure | Statut `expiree` |
| `adminCreerEntreprise`, `adminTransfererPropriete`, `adminImpersonerLecture` | callable admin | Voir ADMIN.md |

Chaque Function : App Check, Zod, `peut()`, transaction, `auditLog` pour toute action sur les membres ou la propriété, clé d'idempotence pour les actions déclenchées par un clic.

## 8. Emails
Tous les emails liés aux comptes, à l'onboarding et aux équipes sont dans **`EMAILS.md`** §4.1 à §4.3, avec les parcours d'envoi en §5.

## 9. Écrans (maquettés : `Equipe`, `Invitation`, `Mon Compte`, `Mon Espace Particulier`)
- `/pro/equipe` : liste des membres (nom, rôle, dernière activité, 2FA), invitations en cours, sièges utilisés / disponibles, bouton « Inviter » (modale : email, rôle, métiers, plafond de crédits)
- `/pro/invitation` : acceptation d'une invitation
- `/pro/rejoindre` : demande d'accès ou revendication
- Sélecteur d'entreprise dans l'en-tête ; « Mon compte » épinglé en bas de la barre latérale (onglets Profil et sécurité · Équipe · Abonnement · Aide & contact, D63)
- `/mon-espace/compte` et `/pro/compte` : email, méthodes de connexion, 2FA, appareils (appareil actuel seulement et « Tout déconnecter » : la liste des appareils n'existe pas), suppression

## 10. Cas limites à couvrir par les tests
- Deux personnes finalisent l'onboarding du même SIREN à la même seconde → une seule réussit (`sirenIndex`)
- Invitation acceptée avec un autre email → refusée
- Invitation acceptée alors que les sièges sont pleins (un autre membre a été ajouté entre-temps) → refusée, message clair
- Le dernier propriétaire tente de quitter ou de supprimer son compte → bloqué
- Retrait d'un membre pendant sa session → ses écritures suivantes échouent immédiatement (vérification du document `membres`)
- Tout inclus résilié avec 4 membres → 3 suspendus, aucune donnée perdue, réactivation intacte
- Demande envoyée avec l'email d'un compte existant → rattachée, aucun accès donné par le lien sans connexion
- Admin en impersonation tente une écriture → refusée par les règles et par la Function
- Modification des prix du simulateur → les brouillons de l'ancienne version sont ignorés, les demandes déjà envoyées gardent leur estimation figée
