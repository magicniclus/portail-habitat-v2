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
| `artisans/{id}` | Ajout de `nbMembres`, `siegesMax` (selon le plan), `proprietaireUid`, `origine` (`onboarding`, `admin`, `import`), `revendiquee: bool` |
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
4. Email « Votre demande PH-XXXXXX » avec un lien magique (valable 24 h) vers `/mon-espace/demandes/{id}`
5. Au premier clic : `emailVerifie = true`, acceptation des CGU enregistrée si ce n'est pas déjà fait

### Liaison de méthodes
Un même email connecté par Google puis par lien magique doit donner **le même uid** : activer « One account per email address » dans Firebase Auth et gérer l'erreur `auth/account-exists-with-different-credential` en proposant de lier (`linkWithCredential`).

### Changement d'email
Nouvelle adresse vérifiée par lien (`verifyBeforeUpdateEmail`), alerte envoyée à l'ancienne adresse avec un lien « Ce n'était pas moi » qui annule et bloque le compte 24 h. La copie `demandes.contact.email` des demandes ouvertes est mise à jour par trigger.

---

## 3. Création de compte artisan et ajout d'entreprise

Maquettes : `Acquisition Artisans v2` → `Onboarding Etape 2` (zone) → `Onboarding Etape 3` (compte) → `Espace Artisan Dashboard on boarding`.

### 3.1 Étape SIREN (formulaire de la page d'acquisition)
Function `rechercherEntreprise(q)` (nom ou SIREN) : appel à l'**API Recherche d'entreprises** (`recherche-entreprises.api.gouv.fr`, sans clé) puis à l'**API Sirene INSEE** pour le détail. Résultat mis en cache 24 h (`cacheSirene/{siren}`).

| Cas | Comportement |
|---|---|
| SIREN inconnu | message « Nous ne trouvons pas ce SIREN », saisie manuelle possible → `verification.statut = 'a_faire'`, contrôle manuel du Kbis |
| Entreprise **fermée** (`etatAdministratif = 'C'`) | refus, message clair |
| Code NAF hors bâtiment (hors section F et 71.20B pour les diagnostiqueurs) | accepté mais marqué `fraude_suspectee` dans `filesModeration` |
| Entreprise < 3 mois | acceptée, label « Nouvelle entreprise », décennale exigée avant la mise en ligne |
| SIREN **déjà inscrit et revendiqué** | pas de doublon : écran « Cette entreprise a déjà un compte » avec 2 choix → **demander à rejoindre** (§4.4) ou **signaler une usurpation** (contact support) |
| SIREN présent mais **non revendiqué** (fiche créée par l'admin ou importée) | flux de **revendication** (§3.4) |

### 3.1 bis Métiers : un référentiel unique
Particuliers, artisans, simulateur, annuaire et matching utilisent **le même référentiel** `referentiel/recherche` (`data/recherche-intentions.json`) :
- **60 métiers** (`metiers/{id}` : nom, alias, famille, prestation par défaut) ;
- **137 intentions** de projet, chacune rattachée à **un métier** et à **une prestation estimable**.

Tout se fait dans le **premier formulaire** (maquette `Acquisition Artisans v2`), **par listes déroulantes, sans recherche par mot-clé** :
1. **Métier principal** : `<select>` obligatoire, les 60 métiers regroupés par famille (`<optgroup>`), triés par ordre alphabétique
2. **Autres métiers** (facultatif, jusqu'à 4) : second `<select>` « Ajouter un métier… » qui exclut les métiers déjà choisis ; chaque ajout apparaît en pastille retirable
3. **Chantiers acceptés** : dès le métier principal choisi, toutes les intentions des métiers sélectionnés s'affichent, cochées par défaut ; l'artisan décoche ce qu'il ne fait pas (ex. un couvreur qui ne pose pas de Velux)
4. Les choix sont transmis aux étapes suivantes (`metiers`, `intentions`) ; l'étape 2 (`Onboarding Etape 2`) ne gère que la zone et le rayon, et utilise les métiers pour l'estimation du nombre de demandes
5. Enregistré dans `artisans/{id}` : `metierPrincipal` (id), `metiers[]` (ids, ≤ 5), `intentions[]` (ids acceptés). Aucun libellé libre
6. Métier absent de la liste : lien « Mon métier n'est pas dans la liste » → `contacts` (type `metier_manquant`) ; l'admin l'ajoute au référentiel (écran Recherche, ADMIN)

**Correspondance** : une demande porte `intention` + `prestation` (issues de la recherche ou du simulateur). Le matching retient les artisans dont `intentions` contient l'intention de la demande (à défaut, dont `metiers` contient son métier). L'annuaire filtre sur `metiers`, la fiche publique affiche les libellés des intentions acceptées.

### 3.2 Étape Zone (`Onboarding Etape 2`)
Métiers et chantiers acceptés (§3.1 bis), adresse du siège préremplie depuis Sirene, rayon ou liste de communes, budget minimum. Les données restent dans un **brouillon** `brouillonsOnboarding/{brouillonId}` (TTL 30 j, identifiant en cookie httpOnly) : l'artisan peut quitter et reprendre sur un autre appareil via le lien envoyé par email.

### 3.3 Étape Compte (`Onboarding Etape 3`) → Function `finaliserOnboarding`
En **une transaction** :
1. Crée ou récupère l'utilisateur (email + mot de passe, ou Google), ajoute `artisan` à `roles`
2. Vérifie à nouveau l'unicité du SIREN (`sirenIndex/{siren}` créé dans la transaction : **garde-fou contre les doubles clics et les inscriptions concurrentes**)
3. Crée `artisans/{id}` (`statut: 'actif'`, `enLigne: false`, `verification.statut: 'en_cours'`, `plan: 'gratuit'`, `siegesMax: 1`, `proprietaireUid`, `onboarding.etape: 3`)
4. Crée `membres/{uid}` avec `role: 'proprietaire'`
5. Crée `portefeuilles/{id}` (solde 0), `prive/facturation` vide
6. Met à jour `users/{uid}.entreprises` et `entrepriseActive`, puis les custom claims
7. Supprime le brouillon, envoie l'email de bienvenue et place une tâche `artisan_nouveau` dans `filesModeration`

Le téléphone est vérifié par SMS (Firebase Phone Auth) **avant** la première réponse à une demande, pas à l'inscription (réduction de la friction).

**Mise en ligne dans l'annuaire** (`enLigne = true`) : **automatique dès la première connexion** si le Kbis (ou SIREN vérifié) et l'attestation décennale ont été **envoyés**. La vérification par un modérateur a lieu **ensuite**, sous 48 h ouvrées ; un document refusé retire la fiche (email `document-refuse`) jusqu'au nouvel envoi. Le téléphone est vérifié avant la première réponse à une demande.

### 3.4 Revendication d'une fiche existante (`revendications/{id}`)
Pour les fiches créées par l'admin (prospection) ou importées.
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
Une entreprise avec plusieurs agences (SIRET différents, même SIREN) : sous-collection `etablissements/{siret}` avec adresse, zone et téléphone propres. **Une fiche publique par établissement** dans `artisansPublic` (`{artisanId}_{siret}`), les avis restent au niveau de l'établissement. Le plan Premium couvre **un** établissement ; chaque établissement supplémentaire est un add-on Stripe (quantité sur l'abonnement).

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
| Inviter, modifier ou retirer des membres | ✓ | ✓ (sauf propriétaire et gérants) | — | — |
| Transférer la propriété, fermer l'entreprise | ✓ | — | — | — |

Constantes dans `packages/core/equipe/permissions.ts` : `PERMISSIONS_PAR_ROLE` + surcharge par `membres.permissions`. Une seule fonction `peut(membre, action)` utilisée par l'UI **et** par chaque Server Action / Function.

### 4.2 Invitation (`invitations/{id}`)
`artisanId`, `email` (minuscules), `role`, `permissions?`, `metiers?`, `invitePar`, `jetonHash` (SHA-256 du jeton envoyé par email ; le jeton n'est jamais stocké en clair), `statut` (`envoyee`, `acceptee`, `revoquee`, `expiree`), `expireLe` (+7 j), `acceptePar?`, `createdAt`.

Flux :
1. `inviterMembre({ email, role })` : vérifie la permission, les **sièges disponibles** (`nbMembres + invitations en cours < siegesMax`), l'absence de doublon (déjà membre ou invitation active), et 20 invitations max par jour
2. Email « X vous invite à rejoindre Y sur Portail Habitat Pro » → `/pro/invitation?t=<jeton>`
3. La page affiche l'entreprise et le rôle ; connexion ou création de compte **avec le même email** (sinon, refus explicite : « Cette invitation est destinée à c•••@… »)
4. `accepterInvitation(jeton)` en transaction : création de `membres/{uid}`, `nbMembres + 1`, `users.entreprises` mis à jour, claims rafraîchis, notification à l'invitant
5. Renvoyer (nouveau jeton, l'ancien est invalidé), révoquer, expiration automatique par tâche planifiée

### 4.3 Sièges selon le plan
| Plan | Sièges inclus | Supplément |
|---|---|---|
| Gratuit | 1 (propriétaire seul) | — |
| Premium | 3 | +9 € HT/mois par siège (quantité Stripe `seat`) |

- Passage de Premium à gratuit alors qu'il y a plus d'un membre : les membres **ne sont pas supprimés** ; ils passent en `statut: 'suspendu'` (sauf le propriétaire) avec un bandeau « Réactivez Premium pour rendre l'accès à votre équipe ». Le propriétaire choisit qui garder si des sièges sont rachetés
- `siegesMax` est écrit **uniquement par le webhook Stripe**

### 4.4 Demande pour rejoindre une entreprise
Depuis l'écran « Cette entreprise a déjà un compte » : `demanderAcces(artisanId, message)` → notification et email au propriétaire et aux gérants, qui acceptent (choix du rôle) ou refusent. Sans réponse sous 14 j : expiration. Le demandeur ne voit **jamais** l'email du propriétaire.

### 4.5 Bascule entre entreprises
- Sélecteur en haut de la sidebar de l'espace pro (nom commercial + logo), visible uniquement si `entreprises.length > 1`
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
- Artisans : email + mot de passe (ou Google), **2FA par SMS ou TOTP proposée** à tous, **obligatoire** pour propriétaire et gérant d'une entreprise Premium
- Session : cookie de session Firebase (`createSessionCookie`, 14 j pour les particuliers, 7 j pour les pros), rotation à chaque changement de rôle
- Blocage progressif après 5 échecs (délai exponentiel), alerte email à chaque nouvel appareil
- Un utilisateur `suspendu` est déconnecté (`revokeRefreshTokens`) et voit une page explicative ; la suspension d'une **entreprise** n'empêche pas l'accès particulier de ses membres

---

## 6. Simulation

### 6.1 Simulateur de devis (`/simulateur`, `packages/core/simulateur/`)
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
| Artisan (Premium) | « Aperçu en tant que Gratuit / Premium » : compare le rendu de la carte dans l'annuaire | purement visuel, aucune écriture |
| Admin | **Impersonation en lecture seule** (`adminImpersonerLecture`) : ouvre l'espace pro ou particulier tel que la personne le voit | token personnalisé avec claim `imp: { par, cible, lectureSeule: true }`, durée 15 min ; **toute écriture refusée** côté règles (`request.auth.token.imp == null`) et côté Functions ; bandeau rouge permanent ; entrée `auditLog` au début et à la fin ; la cible est notifiée si elle l'a demandé dans ses préférences |

### 6.3 Simulateur de l'algorithme et des prix (admin)
Voir ADMIN.md §2.5 (barèmes : effet sur les 50 derniers leads) et §2.10 (bac à sable du matching : rejouer une demande passée). Ces simulations **n'écrivent jamais** dans les collections de production : résultats en mémoire, ou dans `simulations/{id}` (TTL 7 j) pour partager un résultat.

### 6.4 Environnements et données de simulation
| Environnement | Projet Firebase | Stripe | Emails |
|---|---|---|---|
| Local | Emulator Suite (Auth, Firestore, Functions, Storage) | mode test + `stripe listen` | capturés (Mailpit) |
| Préproduction | `portail-habitat-staging` | mode test, **Test Clocks** pour simuler renouvellements, échecs de paiement et fins d'abonnement | envoi limité à une liste blanche |
| Production | `portail-habitat-prod` | live | réel |

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
| `demanderRevendication`, `validerRevendication` | callable | §3.4 |
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
- Sélecteur d'entreprise dans la sidebar
- `/mon-espace/compte` et `/pro/compte` : email, méthodes de connexion, 2FA, appareils, suppression

## 10. Cas limites à couvrir par les tests
- Deux personnes finalisent l'onboarding du même SIREN à la même seconde → une seule réussit (`sirenIndex`)
- Invitation acceptée avec un autre email → refusée
- Invitation acceptée alors que les sièges sont pleins (un autre membre a été ajouté entre-temps) → refusée, message clair
- Le dernier propriétaire tente de quitter ou de supprimer son compte → bloqué
- Retrait d'un membre pendant sa session → ses écritures suivantes échouent immédiatement (vérification du document `membres`)
- Premium résilié avec 4 membres → 3 suspendus, aucune donnée perdue, réactivation intacte
- Demande envoyée avec l'email d'un compte existant → rattachée, aucun accès donné par le lien sans connexion
- Admin en impersonation tente une écriture → refusée par les règles et par la Function
- Modification des prix du simulateur → les brouillons de l'ancienne version sont ignorés, les demandes déjà envoyées gardent leur estimation figée
