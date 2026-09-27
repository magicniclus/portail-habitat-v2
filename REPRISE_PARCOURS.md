# Reprise d'un parcours interrompu (simulateur de devis et autres parcours)

Objectif : quelqu'un qui quitte le simulateur en cours de route retrouve, à son retour, **le choix entre reprendre où il en était et recommencer**, sur le même appareil **et**, s'il le souhaite, sur un autre.

Le même mécanisme sert à tous les parcours en plusieurs étapes : simulateur, parcours diagnostic, dépôt d'avis, onboarding artisan. Il est implémenté une seule fois dans le hook `useParcours` (ARCHITECTURE.md §8).

---

## 1. Stratégie : trois niveaux, du plus simple au plus complet

| Niveau | Quand | Stockage | Portée |
|---|---|---|---|
| **1. Local** | toujours, dès la première réponse | `localStorage` | même navigateur, même appareil |
| **2. Compte** | la personne est connectée | Firestore `brouillons/{uid}_{parcours}` | tous ses appareils |
| **3. Lien de reprise** | la personne a donné son email **et** coché « M'envoyer un lien pour reprendre plus tard » | Firestore `brouillons/{id}` + lien signé par email | n'importe quel appareil, sans compte |

Pourquoi pas seulement `localStorage` : il est perdu en navigation privée, en changeant de téléphone à ordinateur, ou quand Safari l'efface après 7 jours sans visite. Le niveau 1 couvre la majorité des cas sans friction ; les niveaux 2 et 3 prennent le relais quand c'est possible, **sans jamais être obligatoires**.

---

## 2. Ce qui est enregistré

```ts
// packages/core/parcours/brouillon.ts
type Brouillon = {
  v: 1;                         // version du format du brouillon
  parcours: 'simulateur' | 'diagnostic' | 'avis' | 'onboarding';
  versionReferentiel: string;   // version des prestations au moment de la saisie
  prestationId?: string;
  etape: number;                // dernière étape atteinte
  reponses: Record<string, number | string | string[]>;  // uniquement les champs du projet
  chantier?: { codePostal?: string; acces?: string; delai?: string };
  majLe: number;                // timestamp
  creeLe: number;
  id: string;                   // identifiant aléatoire, pour les onglets et la synchro serveur
};
```
- Clé `localStorage` : `ph:parcours:simulateur` (un seul brouillon par parcours : le plus récent l'emporte)
- Validé par un schéma Zod à la lecture : un brouillon illisible ou d'un format inconnu est **supprimé sans erreur visible**
- **Jamais de coordonnées dans `localStorage`** : ni nom, ni email, ni téléphone, ni adresse précise (seulement le code postal). Ces champs restent en mémoire et sont redemandés au retour. C'est ce qui permet de se passer du consentement cookies : la CNIL exempte le stockage strictement nécessaire à un service demandé par l'utilisateur, et ce stockage ne contient pas de données personnelles
- Écriture **à chaque changement de réponse**, regroupée (délai de 400 ms) pour ne pas écrire à chaque cran d'un slider
- Durée de vie : **30 jours** après la dernière modification, puis suppression à la lecture suivante

---

## 3. Ce que voit l'utilisateur au retour

### Déclencheur
À l'ouverture de `/simulateur` : s'il existe un brouillon valide, **non envoyé**, avec au moins une réponse au-delà du choix de la prestation.

### Présentation
Un **encart en haut du simulateur**, pas une fenêtre modale bloquante (elle gênerait celui qui veut simplement recommencer) :

```
┌────────────────────────────────────────────────────────────────────┐
│  Reprendre votre estimation ?                                      │
│  Salle de bain · 6 m² · douche à l'italienne                       │
│  Étape 3 sur 5 · commencée il y a 2 jours                          │
│                                                                    │
│  [ Reprendre à l'étape 3 ]    Recommencer                          │
└────────────────────────────────────────────────────────────────────┘
```
- Titre, résumé en une ligne (prestation + 2 réponses clés), étape, ancienneté en langage courant. **Aucun montant** : le prix n'est révélé qu'après l'envoi des coordonnées (COMPTES.md §6.1)
- Bouton principal **« Reprendre à l'étape N »**, lien secondaire **« Recommencer »**
- Pendant ce temps, l'étape 1 reste utilisable en dessous : choisir une autre prestation **vaut « Recommencer »** (après confirmation si le brouillon dépasse l'étape 2 : « Votre estimation salle de bain sera effacée »)
- « Recommencer » propose **« Annuler »** pendant 8 secondes (toast), puis efface
- Accessibilité : l'encart est annoncé (`role="region"`, `aria-live="polite"`), le focus reste sur le contenu principal ; les deux actions sont atteignables au clavier

### Reprendre
1. Les réponses sont restaurées
2. On se place à **la première étape incomplète** qui est inférieure ou égale à l'étape enregistrée. Exemple : étape 4 enregistrée, mais un champ obligatoire de l'étape 3 a disparu → reprise à l'étape 3
3. L'URL passe à `?etape=N`

### Recommencer
Suppression du brouillon local **et** du brouillon serveur éventuel, retour à l'étape 1, événement `parcours_recommence`.

---

## 4. Cas particuliers

| Cas | Comportement |
|---|---|
| Le référentiel a changé de version | On garde les réponses dont le champ existe encore et reste valide (bornes, options). Les autres sont retirées. Si la prestation n'existe plus ou est désactivée : pas d'encart, brouillon supprimé |
| Arrivée avec des paramètres (`?prestation=peinture&cp=33000`, depuis l'accueil ou une fiche) | **Les paramètres gagnent.** Si le brouillon porte sur la même prestation, l'encart propose de reprendre en fusionnant (les paramètres écrasent les champs correspondants). Si la prestation est différente, l'encart dit « Vous aviez aussi commencé une estimation salle de bain » avec un lien pour y revenir |
| Deux onglets ouverts | Événement `storage` : l'autre onglet affiche « Estimation modifiée dans un autre onglet » avec « Recharger ». Pas de fusion automatique |
| Demande envoyée | Brouillon supprimé immédiatement, local et serveur. Revenir en arrière dans l'historique après l'envoi mène à la confirmation, pas au formulaire |
| Brouillon de plus de 30 jours | Supprimé, pas d'encart |
| Navigation privée ou `localStorage` indisponible (quota plein, bloqué) | Le simulateur fonctionne normalement sans reprise ; aucune erreur affichée |
| Brouillon corrompu ou modifié à la main | Rejeté par Zod, supprimé, pas d'encart |
| Personne connectée avec un brouillon local **et** un brouillon serveur | On garde le plus récent (`majLe`) ; l'autre est écrasé |
| Retour depuis le lien reçu par email sur un autre appareil | Le brouillon serveur est chargé, recopié en local, et on arrive **directement** à l'étape enregistrée avec un bandeau « Estimation reprise » (pas d'encart : le choix a déjà été fait en cliquant) |
| Lien de reprise déjà utilisé ou expiré | Page simulateur normale avec le message « Ce lien a expiré, votre estimation n'a pas pu être retrouvée » |

---

## 5. Synchronisation serveur (niveaux 2 et 3)

### Collection `brouillons/{id}`
`parcours`, `uid?`, `emailHash?`, `donnees` (le même objet `Brouillon`, sans coordonnées), `jetonHash?` (lien de reprise), `majLe`, `expireLe` (**TTL 30 jours**), `createdAt`.
Règles : lecture et écriture **refusées** côté client ; tout passe par la Server Action `sauverBrouillon` (rate limit : 30 écritures / 10 min / session).

### Personne connectée
- Écriture serveur à chaque **changement d'étape** (pas à chaque réponse), ou à la fermeture de la page (`visibilitychange` → `navigator.sendBeacon`)
- Identifiant du document : `{uid}_simulateur`, donc un seul brouillon par parcours et par personne
- Au chargement : lecture du brouillon serveur en même temps que du local, puis le plus récent l'emporte

### Lien de reprise par email (sans compte)
- À l'étape Chantier ou Contact, case **non cochée par défaut** : « M'envoyer un lien pour reprendre plus tard ». C'est un **consentement explicite** : sans cette case, aucun email de relance n'est envoyé, même si l'email a été saisi
- Case cochée : création de `brouillons/{id}` et envoi immédiat de l'email `reprise-simulateur` (EMAILS.md), avec un lien `/simulateur?reprise=<jeton>` valable **30 jours**, à usage unique. Seule l'empreinte SHA-256 du jeton est stockée
- Si la personne revient d'elle-même et envoie sa demande, le brouillon est supprimé et aucun autre email n'est envoyé
- **Une seule relance** facultative à J+3, seulement si la case a été cochée et que la demande n'a pas été envoyée entre-temps (`encoreValable()`)

---

## 6. Implémentation (factorisée pour tous les parcours)

```ts
// apps/web/features/parcours/useParcours.ts
const p = useParcours({
  parcours: 'simulateur',
  schema: schemas.simulateurReponses,        // Zod, par étape
  etapes: ETAPES_SIMULATEUR,                  // [{ id, champs, estComplete(reponses) }]
  versionReferentiel,
  migrer: migrerReponsesSimulateur,           // (reponses, ancienneVersion, referentiel) => reponses valides
  resume: resumeSimulateur,                   // (brouillon) => { titre, detail, estimation }
});
// p.brouillonTrouve, p.reprendre(), p.recommencer(), p.annulerRecommencer(),
// p.etape, p.allerA(n), p.reponses, p.maj(champ, valeur), p.envoye()
```
- Stockage abstrait derrière une interface `StockageBrouillon` avec 2 implémentations (`local`, `serveur`) et un orchestrateur qui choisit le plus récent : testable sans navigateur
- `migrer` et `resume` sont des **fonctions pures** dans `packages/core/simulateur`, testées
- Composant d'interface unique `<RepriseParcours />` dans `packages/ui/patterns`, réutilisé par le simulateur, le diagnostic, l'avis et l'onboarding

### Mesure
Événements (sans données personnelles) : `parcours_brouillon_trouve`, `parcours_repris` (avec l'étape), `parcours_recommence`, `parcours_lien_reprise_demande`, `parcours_lien_reprise_utilise`, `parcours_envoye`. Indicateur à suivre dans l'admin : **taux de reprise** et **taux d'envoi après reprise**.

---

## 7. Critères d'acceptation (remplacent SIM-06 dans ACCEPTANCE.md)
- **SIM-06a** : j'arrive à l'étape 3, je ferme l'onglet, je reviens : l'encart propose « Reprendre à l'étape 3 » avec le bon résumé
- **SIM-06b** : « Reprendre » restaure toutes les réponses et m'amène à l'étape 3 ; l'estimation est identique si le référentiel n'a pas changé
- **SIM-06c** : « Recommencer » vide tout ; « Annuler » dans les 8 secondes restaure le brouillon
- **SIM-06d** : aucune donnée de contact n'est présente dans `localStorage` (test qui lit le stockage)
- **SIM-06e** : un brouillon d'une ancienne version du référentiel avec un champ supprimé reprend à l'étape de ce champ
- **SIM-06f** : après l'envoi de la demande, revenir sur `/simulateur` n'affiche pas d'encart
- **SIM-06g** : avec la case « M'envoyer un lien » cochée, l'email arrive dans Mailpit ; le lien ouvert dans un autre navigateur reprend à la bonne étape ; un second clic sur le même lien affiche « lien expiré »
- **SIM-06h** : sans la case cochée, aucun email de reprise n'est envoyé, même avec un email saisi
- **SIM-06i** : en navigation privée avec `localStorage` bloqué, le simulateur fonctionne sans erreur
- **SIM-06j** : arriver avec `?prestation=peinture` alors qu'un brouillon salle de bain existe ouvre la peinture et propose un lien vers l'estimation salle de bain
