# Dessin — éditeur de plans 2D / 3D de Portail Travaux

> **Règle absolue : Dessin s'ajoute à côté de l'existant, sans modifier aucun fichier de code existant.** Le code existant se lit et s'importe, il ne se réécrit pas. Les branchements nécessaires sont listés au §11 et attendent l'accord explicite du propriétaire.
>
> Spécification complète et prompts de développement du **lot 15**. Ce document fait foi pour Dessin ; en cas de conflit, `CLAUDE.md`, `ARCHITECTURE.md`, `DATABASE.md`, `MOBILE.md`, `PAIEMENTS.md` et `COUTS.md` priment, et le conflit est signalé.
> Maquette de référence : `docs/designs/Dessin.dc.html` (interactive : barre d'application, bibliothèque à onglets, palette d'outils verticale, inspecteur à droite, guide « Bien démarrer », zoom en colonne).

---

## 0. Objectif et règle de non-copie

Dessin permet à un **particulier** (avec compte) et à un **artisan** (dans son espace pro) de dessiner un logement en 2D, de le voir en 3D, de le visiter, de l'aménager et de le décorer, puis d'en tirer **un métré et une demande de devis** (particulier) ou **un devis prérempli** (artisan). C'est le pont entre « j'imagine mon projet » et « je trouve un artisan » : c'est ce qui le distingue des outils grand public.

**Référence fonctionnelle : Kozikaza** (éditeur de Leroy Merlin). On vise la **parité de fonctions** (et au-delà), jamais la ressemblance :
- ne rien reprendre de Kozikaza : ni nom, ni textes, ni icônes, ni pictogrammes, ni disposition d'écran, ni couleurs, ni modèles 3D, ni textures, ni catalogue produit, ni code ;
- l'interface suit **notre maquette** et nos tokens (`packages/ui`) ;
- les modèles 3D et textures viennent de sources dont la licence autorise l'usage commercial (CC0 : Poly Haven, ambientCG, Kenney…) ou sont créés pour nous (voir D88). La licence de chaque fichier est notée dans `docs/data/dessin-licences.json`.

---

## 1. Publics, accès et routes

| Public | Accès | Routes |
|---|---|---|
| Visiteur | Page de présentation publique + **essai sans compte** (brouillon local, rien sur le serveur) | `/dessin` (landing SEO, gabarit `LANDINGS.md`), `/dessin/essai` |
| Particulier | Compte requis pour **enregistrer**. Au premier « Enregistrer » d'un essai : création de compte puis reprise du brouillon (mécanique de `REPRISE_PARCOURS.md`) | `/mon-espace/plans` (liste, onglet « Mes plans »), `/mes-plans/[planId]` (éditeur plein écran, hors de l'en-tête de l'espace) |
| Artisan | Entrée **« Plans »** dans `SidebarPro` (outil, pas dans « Mon compte ») ; plans de l'**entreprise**, visibles par les membres selon leur rôle (`peut()`) | `/pro/plans` (liste), `/pro/plans/editeur/[planId]` (éditeur plein écran, hors du cadre de l'espace, comme l'éditeur du site) |
| Lien partagé | Lecture seule (2D, 3D, visite, métré), sans compte, jeton révocable | `/plan/[jeton]` (`noindex`) |

- L'éditeur est plein écran (pas de pied de page), dans le **thème de l'espace** (`data-theme`) : vert côté particulier, thème pro côté artisan. Aucun hex en dur.
- **Dessin est gratuit** pour les particuliers et les artisans (D84 ✅). Les quotas du §8 sont des garde-fous techniques, pas une offre payante.
- Flag : `FLAGS.dessin` (désactivé en production tant que le lot n'est pas recetté), `FLAGS.dessinPublic` pour la landing et l'essai.

---

## 2. Unités, coordonnées, conventions

- **Longueurs en millimètres entiers** (comme les centimes pour l'argent) : aucun `float` stocké. Affichage en cm ou m selon le réglage (`formatLongueur()`, `formatSurface()` dans `@ph/core/format`). Surfaces calculées en mm² (`bigint` si nécessaire) puis affichées en m² à 1 décimale.
- Angles en **dixièmes de degré** entiers.
- Repère : x vers l'est, y vers le sud (comme l'écran), z vers le haut ; origine = coin haut gauche du premier mur. Le nord du projet est un angle stocké (`orientationNord`).
- Identifiants d'éléments : `nanoid` court préfixé (`m_`, `o_`, `p_`, `obj_`…), stables dans le temps (l'historique et le partage s'appuient dessus).

---

## 3. Modèle de scène (schémas Zod dans `packages/core/src/dessin/schemas`)

Un plan = **métadonnées Firestore** + **scène JSON versionnée** dans Storage (un document Firestore est limité à 1 Mio).

```
Scene {
  version: number                  // version du schéma, migrations dans core/dessin/migrations
  unites: { affichage: 'cm' | 'm' }
  orientationNord: angle
  verrouille?: boolean             // plan verrouillé (DES-29) : plus modifiable avant déverrouillage
  terrain?: Terrain
  niveaux: Niveau[]                // ordonnés, altitude croissante
  calques: { cotes, surfaces, mobilier, electricite, plomberie, annotations, fondImage }: boolean  // tous affichés par défaut
  fondImage?: { storagePath, echelle (mm/px), position, rotation, opacite, niveauId }
}

Niveau { id, nom, type: 'sous_sol'|'rdc'|'etage'|'combles', altitude, hauteurSousPlafond, epaisseurPlancher,
         murs: Mur[], ouvertures: Ouverture[], pieces: Piece[], objets: Objet[], escaliers: Escalier[],
         tremies: Polygone[], cotes: Cote[], textes: Texte[], zonesDeco: ZoneDeco[], toiture?: Toiture,
         exterieur: { terrasses: Terrasse[], piscines: Piscine[], allees: Polygone[], clotures: Cloture[], vegetation: Vegetal[] } }

Mur { id, a: Point, b: Point, epaisseur, hauteur, hauteurB?, type: 'mur'|'cloison'|'demi_mur'|'muret'|'separation'|'poteau'|'poutre',
      porteur: boolean, alignement: 'axe'|'gauche'|'droite', faceA: Revetement, faceB: Revetement, plinthe?: Plinthe, verrouille }
Ouverture { id, murId, position (distance depuis a), largeur, hauteur, allege, type, modeleId,
            sens: 'gauche'|'droite', cote: 'interieur'|'exterieur', volet?: 'roulant'|'battant'|null, finition }
Piece { id, contour: Point[] (déduit des murs ou dessiné), nom, type (référentiel), sol: Revetement, plafond: Revetement,
        hauteurSousPlafond?, carrez: boolean }
Objet { id, catalogueId, position, rotation, dimensions {l, p, h}, variante, materiaux: Record<slot, MateriauId>, accrocheMurId?, altitude, verrouille? }
Escalier { id, type: 'droit'|'quart_bas'|'quart_haut'|'deux_quarts'|'helicoidal'|'meunier', position, rotation,
           largeur, hauteurAMonter, nbMarches, giron, sens, garde-corps, materiau }
Toiture { type: 'deux_pans'|'quatre_pans'|'monopente'|'plate'|'mansarde'|'croupe', pentes: angle[], debords, faitageAngle,
          couverture: MateriauId, lucarnes: Lucarne[], fenetresToit: Ouverture[], cheminees: Cheminee[], gouttieres }
Terrasse { id, contour, materiau, pose, hauteur, plots, gardeCorps?, escalierId?, pergola? }
Piscine { id, forme: 'rectangle'|'ronde'|'ovale'|'haricot'|'L'|'couloir'|'hors_sol', dimensions, profondeurs {min, max},
          escalier: 'roman'|'droit'|'angle'|null, margelle: MateriauId, plage: Polygone + MateriauId, liner: MateriauId,
          debordement: boolean, abri?: …, localTechnique?: … }
Terrain { parcelle: Polygone, referenceCadastrale?, codeInsee?, altitude, implantation: { x, y, rotation } }
Revetement { materiauId, couleur?, orientation?, decalage?, joint?: { largeur, couleur }, finition?: 'mat'|'satin'|'brillant' }
ZoneDeco { id, support: { murId, face } | { pieceId, surface: 'sol'|'plafond' }, contour, revetement }
```

Référentiels (lecture publique, écriture admin) :
- `referentiel/dessinCatalogue/items/{id}` : objets 3D (catégorie, sous-catégorie, dimensions par défaut, plages réglables, slots de matériaux, fichier `glb` + vignette, licence, mots-clés de recherche, lien éventuel vers une prestation du catalogue).
- `referentiel/materiaux/items/{id}` : couleurs, papiers peints, carrelages, parquets, parements, façades, couvertures, sols extérieurs (type, textures `ktx2` albedo/normal/roughness, taille réelle de la texture en mm, poses possibles, licence).

---

## 4. Données Firestore et Storage (à ajouter à `DATABASE.md` et testées)

| Chemin | Contenu | Lecture | Écriture |
|---|---|---|---|
| `users/{uid}/plans/{planId}` | métadonnées : titre, `apercu` (chemin SVG des murs, remplace la vignette image : rien à générer ni à stocker), `versionCourante`, `taille`, `majLe`, `creeLe`, `supprimeLe?`, `demandeId?` | propriétaire | propriétaire via `action()` (jamais le contenu de scène) |
| `artisans/{id}/plans/{planId}` | idem + `clientNom?`, `devisIds[]`, `auteurUid` | membres (`peut('dessin.lire')`) | membres (`peut('dessin.ecrire')`) via `action()` |
| `…/plans/{planId}/versions/{versionId}` | `numero`, `storagePath`, `auteurUid`, `type: 'auto'|'manuelle'|'restauration'`, `nom?`, `taille`, `creeLe` (ajout seul) | comme le plan | serveur uniquement |
| `partagesPlans/{jeton}` | `proprietaire {type, id}`, `planId`, `versionId` figée ou `courante`, `expireLe`, `revoque` | serveur uniquement (la page `/plan/[jeton]` lit côté serveur) | serveur |
| Storage `dessin/{type}/{proprietaireId}/{planId}/v{n}.json.gz` | scène compressée | règles Storage alignées sur Firestore, **taille max 5 Mo** | serveur (URL signée d'envoi) |
| Storage `dessin/…/{planId}/vignette.webp`, `photos/{id}.webp`, `fonds/{id}` | vignette, photos de rendu, plan importé | idem | idem, 10 Mo max, types image uniquement |

- **Enregistrement** : le client envoie la scène (Zod `Scene` validée côté client **et** serveur, `migrerScene()` appliquée), le serveur l'écrit dans Storage, crée la version et met à jour `versionCourante` **en transaction avec contrôle de version** (`siVersion`) pour détecter un autre onglet ou un autre membre : en cas de conflit, proposer « garder la mienne / prendre la leur / dupliquer ».
- **Versions** : automatique toutes les 10 minutes d'édition active, manuelle nommée à la demande, conservées 30 jours (les 50 dernières au-delà), une Function de nuit purge. Restaurer = nouvelle version de type `restauration` (rien n'est écrasé).
- **Corbeille** : suppression douce 30 jours, puis purge (Firestore + Storage). Export RGPD (`telechargerDonnees.ts`) et suppression de compte incluent les plans.
- Index composites et règles : **un test par règle**, refus par défaut. Aucun nom de collection hors `packages/firebase` (`chemins.ts`).

---

## 5. Architecture du code

```
packages/core/src/dessin/            PUR, testé d'abord (Vitest), aucune dépendance runtime hors zod
  schemas/        Scene, Niveau, Mur… + types (z.infer)
  migrations/     migrerScene(v → v+1), tests par version
  geometrie/      vecteurs, segments, intersections, polygones (aire, périmètre, point dans polygone),
                  offset de murs, jonctions en L/T/X, détection des pièces (graphe planaire, faces minimales),
                  surfaces Carrez (< 1,80 m exclu), surfaces murales nettes (déduction des ouvertures)
  aimantation/    grille, extrémités, milieux, prolongements, perpendiculaires, angles par pas de 15°, objets contre mur
  commandes/      Commande { appliquer(scene) → { scene, inverse } } : ajouterMur, deplacerExtremite, scinderMur,
                  poserOuverture, deplacerObjet, appliquerRevetement… ; regroupement des gestes ; historique borné
  validations/    ouverture dans le mur, chevauchements, escalier (Blondel 60–64 cm, hauteur d'échappée 1,90 m),
                  garde-corps obligatoire > 1 m de chute, piscine (indications de recul à la limite, non juridiques)
  toiture/        génération des pans depuis le contour (squelette droit pour 4 pans / croupe), surfaces de couverture
  cuisine/        plan de travail continu, fileurs, alignement des modules, triangle d'activité (indicatif)
  metre/          quantités par poste : sols, murs, plafonds, plinthes, cloisons, ouvertures, couverture, terrasse,
                  piscine (volume d'eau) → lignes rattachées aux prestations de docs/data/prestations-catalogue.json
  export/         cotes automatiques, cartouche, échelle d'impression
packages/firebase/src/…/dessin       chemins, convertisseurs, repositories (plans, versions, partages)
packages/ui                          seulement des primitives génériques réutilisables (ex. ColorSwatch, Slider, Toolbar,
                                     SegmentedControl) — rien de spécifique à Dessin
apps/web/features/dessin/
  Editeur.tsx (assemblage), BarreApplication, Bibliotheque (onglets, recherche, listes), PaletteOutils, Inspecteur,
  GuideDemarrage, CommandesZoom, Calques, FeuilleMobile…
  etat/           store de l'éditeur (scène, sélection, outil, vue, historique) — sélecteurs fins, aucune logique métier
  rendu2d/        SVG React (net à toute échelle, accessible, exportable) ; poignées, cotes, symboles d'ouvertures
  rendu3d/        three + @react-three/fiber + @react-three/drei, chargé en import dynamique au premier passage en 3D
  visite/         contrôles première personne (clavier, souris verrouillée, joystick tactile), collisions murs
  photo/          capture haute définition côté client (post-traitement ombres, occlusion ambiante, ambiance jour/soir)
  workers/        détection des pièces et métré dans un Web Worker (comlink) au-delà de 200 murs
apps/functions/src/dessin            enregistrer, restaurer, partager, purger, vignette (si non générée côté client)
```

**Nouvelles dépendances à signaler dans le plan (CLAUDE.md)** : `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing` (3D, chargés à la demande uniquement), `zustand` + `immer` (store et patchs d'historique) ou équivalent justifié, `comlink` (worker), `idb-keyval` (brouillon hors ligne), `polygon-clipping` ou `clipper2` (opérations booléennes). Budget JS (EXPLOITATION §1, seuil CI provisoire de 160 Ko sur les pages publiques) : l'éditeur 2D ≤ 250 ko gzip hors 3D ; la 3D n'est jamais dans le bundle initial.

## 5 bis. Pile technique (D86)

| Besoin | Choix | Pourquoi | Alternative écartée |
|---|---|---|---|
| Application | **Next.js 16 + React 19 + TypeScript** (déjà en place) | une seule application, mêmes comptes, mêmes thèmes | application séparée |
| Plan 2D | **SVG rendu par React** | net à tout zoom, accessible (focus, `aria`), export PDF direct, suffisant jusqu'à ~2 000 éléments | Canvas/Konva (à garder en réserve si un plan dépasse ce volume) |
| 3D, visite, photo | **three.js + @react-three/fiber + @react-three/drei** (+ `@react-three/postprocessing` pour la vue photo) | standard du web 3D, écosystème React, chargé **seulement** au passage en 3D | Babylon.js (plus lourd, moins « React ») |
| État de l'éditeur, annuler / rétablir | **zustand + immer** (patchs inverses = historique) ; *15d : `useReducer` + instantanés immuables du cœur suffisent, aucune dépendance ajoutée* | léger (~3 ko), sélecteurs fins, historique sans copier la scène | Redux (lourd), état React seul (re-rendus) |
| Géométrie | **code maison dans `packages/core/dessin`** + `clipper2-ts` (opérations booléennes, offsets) ; triangulation `earcut` (déjà dans three) | logique pure testée, millimètres entiers | — |
| Calculs lourds | **Web Worker + comlink** (détection des pièces, métré) | l'interface ne gèle jamais | — |
| Hors ligne | **IndexedDB via idb-keyval** | brouillon et essai sans compte | localStorage (5 Mo, synchrone) |
| Modèles 3D | **glTF/GLB** optimisés par `@gltf-transform` (Meshopt, textures **KTX2**) | fichiers 5 à 10 fois plus légers, chargement rapide sur mobile | OBJ/FBX |
| Implantation | **MapLibre GL** + tuiles IGN Géoplateforme + API Carto cadastre + API Adresse | gratuit, sans clé (D87) | Google Maps, Mapbox (payants) |
| Export PDF | **pdfkit** (déjà utilisé pour les devis), plan dessiné depuis la scène côté serveur | aucune nouvelle dépendance, même rendu que les devis | génération dans le navigateur |
| Données | **Firestore** (métadonnées, versions) + **Storage** (scène gzip, vignettes, photos) + **Functions v2** | 1 Mio max par document Firestore | scène entière dans Firestore |
| Tests | **Vitest** (géométrie, commandes, métré), **Playwright** (DES-xx, iPhone/Pixel), captures pour la 3D | déjà dans le dépôt | — |

Poids visé : éditeur 2D ≤ 250 ko gzip ; 3D ≈ 200 ko gzip supplémentaires, chargés à la demande.

---

## 6. Fonctions (exhaustif ; chaque ligne = un identifiant `DES-xx` dans `ACCEPTANCE.md`)

### 6.1 Projets et fichiers
- DES-01 Créer un plan : **depuis une forme** (rectangle, L, U, T, saisie des cotes), **pièce par pièce**, **mur par mur**, **depuis un modèle** (studio, T2, T3, maison plain-pied, maison à étage), **depuis un plan importé** (image ou PDF en calque, mise à l'échelle en cliquant deux points et en saisissant leur distance, opacité réglable).
- DES-02 Mes plans : vignettes, titre modifiable, date, filtre et recherche, dupliquer, renommer, déplacer vers la corbeille, restaurer. Côté artisan : filtre par client, par membre, rattachement à une demande ou un devis.
- DES-03 Essai sans compte : brouillon dans IndexedDB, bandeau « Créez votre compte pour enregistrer », reprise intacte après inscription.

### 6.2 Niveaux
- DES-04 Ajouter, renommer, supprimer, réordonner ; types sous-sol / RDC / étage / combles ; altitude et hauteur sous plafond.
- DES-05 « Copier les murs extérieurs du niveau inférieur » ; niveau inférieur affiché en transparence ; trémie créée automatiquement par l'escalier.

### 6.3 Murs, cloisons et structure
- DES-06 Tracé point par point (clic ou toucher), double-clic / « Terminer » pour finir, Échap pour annuler le segment ; **saisie de la longueur et de l'angle au clavier** pendant le tracé ; Maj = orthogonal.
- DES-07 Types : mur (20 cm), cloison (7 cm), demi-mur, muret, séparation invisible (délimite une pièce sans mur), poteau, poutre ; épaisseur, hauteur, hauteur différente aux deux extrémités (mur rampant), mur porteur (indication visuelle et alerte avant suppression).
- DES-08 Aimantation (grille, extrémités, milieux, prolongements, perpendiculaires, angles) activable ; guides d'alignement affichés.
- DES-09 Jonctions automatiques en L, T et X ; scinder un mur ; fusionner deux murs alignés ; déplacer une extrémité ; déplacer un mur parallèlement (les murs reliés suivent, les ouvertures restent sur le mur).
- DES-10 **Modifier une dimension en cliquant sur sa cote** (intérieure ou extérieure) : la saisie déplace le mur concerné.

### 6.4 Pièces
- DES-11 Détection automatique des pièces fermées ; nom et type (séjour, cuisine, chambre, salle d'eau…) ; surface, périmètre, surface murale nette ; surface **Carrez** sous combles ; sol, plafond, plinthes.
- DES-12 Dessiner une pièce rectangulaire ou polygonale d'un geste (crée ses murs).

### 6.5 Ouvertures
- DES-13 Portes : battante simple et double, coulissante, à galandage, pivot, porte d'entrée, porte de garage (sectionnelle, basculante) ; fenêtres 1 et 2 vantaux, oscillo-battante, fixe, œil-de-bœuf ; porte-fenêtre ; baie coulissante ; fenêtre de toit ; ouverture libre et arche.
- DES-14 Glisser sur un mur (aimantée au mur, cotes jusqu'aux angles affichées), largeur, hauteur, allège, sens et côté d'ouverture inversables, volets, couleur de menuiserie ; refus si elle dépasse du mur.

### 6.6 Escaliers
- DES-15 Droit, quart tournant bas / haut, deux quarts, hélicoïdal, échelle de meunier ; calcul automatique du nombre de marches et du giron ; alerte Blondel et hauteur d'échappée ; trémie au niveau supérieur ; garde-corps.

### 6.7 Mode toiture et combles
- DES-16 Générer la toiture depuis le contour des murs : deux pans, quatre pans, croupe, monopente, toit plat, mansarde ; pente par pan, débords, orientation du faîtage, pignons.
- DES-17 Lucarnes (jacobine, capucine, chien-assis), fenêtres de toit, cheminées, gouttières ; matériaux de couverture (tuiles, ardoise, zinc, bac acier, toiture végétalisée) ; surface de couverture au métré ; combles aménageables avec surface Carrez.

### 6.8 Mode extérieur : terrasse, terrain, piscine
- DES-18 Terrasse : contour libre, bois / composite / dalles / carrelage / béton, sens de pose, surélevée sur plots avec marches, garde-corps, pergola.
- DES-19 Terrain : parcelle dessinée ou importée (§6.12), orientation nord, allées, gazon, clôtures, portails, haies, arbres (taille adulte).
- DES-20 Piscine : rectangle, ronde, ovale, haricot, en L, couloir de nage, hors-sol, à débordement ; profondeurs (fond plat ou pente), escalier roman / droit / d'angle, margelles, plage, liner, abri, local technique ; **volume d'eau** calculé ; distance aux limites affichée (indicatif, pas un avis juridique).

### 6.9 Aménager
- DES-21 Bibliothèque par univers : cuisine, salle de bain, chambre, dressing, chambre d'enfant, bureau, séjour, mobilier, luminaires et déco, électricité (prises, interrupteurs, points lumineux), plomberie et chauffage (radiateurs, chaudière, ballon), extérieur ; recherche plein texte et filtres de dimensions.
- DES-22 Poser par glisser-déposer, rotation (poignée et pas de 15° / 90°), dimensions réglables dans les plages du modèle, variantes et matériaux par slot, plaquer contre un mur, hauteur de pose pour les éléments muraux, collisions signalées.
- DES-23 **Mode cuisine** : modules bas, hauts, colonnes, angles, îlot ; plan de travail continu et crédence générés, fileurs ; électroménager (évier, plaque, four, hotte, réfrigérateur, lave-vaisselle) ; façades et poignées ; liste des modules ; triangle d'activité indicatif.
- DES-24 Salle de bain : douche à l'italienne avec paroi, baignoire, vasque simple / double, WC suspendu ou posé, sèche-serviettes ; zones de sécurité électrique affichées en option (indicatif).

### 6.10 Décorer
- DES-25 Peinture : nuancier, saisie libre, finitions mat / satin / brillant ; par face de mur, plafond, menuiserie.
- DES-26 Papier peint (motif, sens, raccord), carrelage (format, joint largeur et couleur, pose droite / décalée / diagonale / chevron / point de Hongrie), parquet et stratifié (essence, largeur de lame, pose à l'anglaise / bâton rompu / point de Hongrie / chevron), parement, façade (enduit, bardage), sols extérieurs, couvertures.
- DES-27 **Zones décoratives** : polygone sur une face de mur ou un sol (soubassement, crédence, tapis de carrelage) avec son propre revêtement.
- DES-28 Pipette de style (copier les revêtements d'un élément vers un autre) ; appliquer à toute la pièce / tous les murs de la pièce.

### 6.11 Outils transverses
- DES-29 Sélection simple, multiple (rectangle, Maj), copier / coller / dupliquer, supprimer, grouper, aligner et répartir, verrouiller un élément, **verrouiller le plan**.
- DES-30 Calques affichables : cotes, surfaces, mobilier, électricité, plomberie, annotations, plan importé.
- DES-31 Cote libre, outil mesure, texte, flèche, rose des vents, cartouche.

### 6.12 Vues
- DES-32 **Plan 2D** : style couleur ou noir et blanc imprimable, symboles normalisés (portes avec arc d'ouverture), cotes automatiques intérieures et extérieures.
- DES-33 **3D** : orbite, zoom, panoramique ; vue maison entière, niveau isolé, coupe « maison de poupée » (murs avant abaissés), toit masquable ; ombres selon l'heure et l'orientation.
- DES-34 **Visite** : première personne à 1,60 m, collisions avec les murs, franchissement des portes, escaliers praticables ; clavier (flèches / ZQSD), souris, **joystick tactile** sur mobile ; mini-plan avec position.
- DES-35 **Vue d'implantation** (plan de masse) : maison posée sur la parcelle, orientation, distances aux limites, fond cadastral et photo aérienne (sources publiques IGN / cadastre Etalab, D87) ; recherche de la parcelle par adresse.
- DES-36 **Façades et coupes** : élévations nord / sud / est / ouest générées, coupe verticale sur une ligne tracée.
- DES-37 **Vue photo** : cadrage (paysage, carré, portrait), ambiance (jour, soirée), rendu amélioré côté client et export PNG/JPEG haute définition ; galerie « Mes photos » du plan. Pas de rendu serveur (D85 ✅, coût nul) : tout le rendu se fait dans le navigateur.

### 6.13 Historique et sauvegarde
- DES-38 Annuler / rétablir **300 étapes dans la session** (décision du 18/11/2026 : des heures de travail, sans risque pour la mémoire d'un téléphone) (Ctrl/Cmd+Z, Ctrl/Cmd+Maj+Z, boutons, menu mobile) ; un glisser = une seule étape ; l'historique couvre aussi les revêtements et les réglages de vue utiles (pas le zoom).
- DES-39 Enregistrement automatique 2 s après la dernière modification + indicateur (« Enregistré », « Enregistrement… », « Hors ligne, enregistré sur cet appareil ») ; hors ligne : IndexedDB puis renvoi au retour du réseau.
- DES-40 Historique des versions (automatiques et nommées), aperçu, restauration ; conflit entre onglets ou membres détecté et résolu (§4).

### 6.14 Export, partage, lien avec Portail Travaux
- DES-41 Export **PDF à l'échelle** (1/50, 1/100, A4 / A3, cartouche, légende, métré en annexe), PNG du plan, photos.
- DES-42 Lien de partage en lecture seule (2D, 3D, visite), révocable, expiration ; partage à un membre de l'équipe (artisan).
- DES-43 **Métré** (onglet « Chiffrer ») : quantités par poste, cases à cocher, téléchargement PDF / CSV.
- DES-44 Particulier : **« Demander des devis »** crée une demande par le parcours existant (simulateur / `demandes`). Le client **choisit** de joindre son plan (lecture seule pour les artisans qui reçoivent la demande) et peut cocher **« Recevoir des devis par écrit, sans être appelé »** (`demandes.contactSouhaite = 'ecrit_uniquement'`, champ nouveau à ajouter au schéma, à la Function de création et à l'affichage côté artisan : téléphone masqué, réponse par messagerie ou devis — détail D90) ; estimation affichée seulement si elle sort du simulateur (prix **recalculés serveur**, centimes, jamais inventés).
- DES-45 *(retiré le 18/11/2026 à la demande du propriétaire, voir AVANCEMENT §31)* Artisan : **« Créer un devis depuis ce plan »** préremplit les lignes d'un devis (`DATABASE.md` §8 bis) depuis le métré et la bibliothèque de prestations ; partage du plan au client (lien) ; plan attaché à la fiche de la demande.

### 6.15 Mobile, accessibilité, performance
- DES-46 `MOBILE.md` : conçu à 390 px. Téléphone : bibliothèque et inspecteur en **feuilles du bas**, palette d'outils en barre basse, pincer pour zoomer, appui long = menu contextuel, cibles 44 px, saisie des cotes avec clavier numérique. Tablette : édition complète. 3D et visite au doigt.
- DES-47 Accessibilité : tous les boutons avec libellé, focus visible, **raccourcis listés** (touche « ? »), élément sélectionné annoncé (`aria-live`, mesures lues), déplacement d'un élément sélectionné aux flèches (pas de 1 cm, Maj = 10 cm), contraste AA, `prefers-reduced-motion` (pas d'animation de caméra).
- DES-48 Performance : 60 i/s en 2D jusqu'à 500 murs et 1 000 objets sur un portable moyen ; 3D en instanciation, niveaux de détail, textures `ktx2`, modèles `glb` compressés (Draco / Meshopt) ; ouverture d'un plan < 2 s (hors 3D).

---

## 7. Interface (décidée avec le propriétaire le 18/11/2026 ; la maquette reste la référence des couleurs et des composants)

- **Pleine page**, sans le cadre de l'espace (comme l'éditeur du site et les devis).
- **Barre d'une ligne** : « ← Mes plans », nom du projet modifiable, pastille d'enregistrement, annuler / rétablir, vues Plan · 3D · Visite, Enregistrer.
- **Rail vertical à gauche** (icône + libellé) : Structure, Équiper, Finitions, Chiffrer, Rendu, et Aide en bas. Un clic ouvre le **panneau repliable** du menu, un second clic (ou « « ») le replie.
- **Rail vertical à droite** (icônes) : sélectionner, tracer un mur, dessiner une pièce · magnétisme, cotes, surfaces · zoom avant, pourcentage, zoom arrière, ajuster à l'écran · Propriétés en bas, qui ouvre ou replie l'**inspecteur**.
- **Aucun bouton horizontal posé sur le plan** : le plan occupe tout l'espace entre les panneaux, centré sur un papier pointillé et recadré à chaque ouverture ou fermeture de panneau. Seuls les messages (erreur, conflit) s'affichent au-dessus.
- **Téléphone** : mêmes rails, panneaux par-dessus le plan, repliés au départ.
- Écrans vides, erreurs, chargement (squelettes), hors ligne : tous dessinés.

---

## 8. Sécurité, coûts, RGPD

- Toutes les écritures via `action()` / `callable()` : schéma, `peut()`, limite de débit (ex. 60 enregistrements / min / plan), idempotence.
- Le contenu des plans est privé ; les liens partagés ne révèlent ni nom ni adresse du propriétaire ; aucune donnée personnelle dans les chemins Storage lisibles publiquement ni dans les URL (le jeton est opaque).
- `COUTS.md` : pas de rendu serveur ni d'appel payant sans décision ; vignettes générées côté client ; versions purgées ; textures servies depuis le CDN avec cache long.
- Quotas proposés (D84) : particulier 5 plans actifs, artisan illimité selon formule ; taille de scène 5 Mo.

---

## 9. Décisions à trancher (reportées dans `DECISIONS.md`)

Tranchées le 18/11/2026 : D84 gratuit · D85 aucun rendu serveur · D87 données publiques IGN / cadastre · D88 CC0 puis catalogue maison · D90 plan joint et « devis par écrit sans appel » au choix du client.
Puis : D86 pile technique (§5 bis) · D89 pas de temps réel en v1 · D90 téléphone jamais montré aux artisans si « par écrit » · D91 import image et PDF en v1. **Plus aucune ligne ⏳ pour Dessin.**

---

## 10. Prompts Claude Code (un lot par session, plan d'abord)

> **Avant chaque sous-lot : aucun fichier de code existant n'est modifié ; seuls de nouveaux fichiers sont créés. Si un branchement du §11 est nécessaire, demander d'abord.**
> Branche : `lot-15-dessin`, ou `lot-15x-…` pour chaque sous-lot fusionné dans `lot-15-dessin`. Commits atomiques en français (`feat(dessin): …`). À la fin de chaque sous-lot : `pnpm typecheck && pnpm lint && pnpm test`, puis mise à jour de `docs/AVANCEMENT.md` et `docs/PROGRESSION.md`.

### Lot 15a — Cadrage
```
Lot 15a : cadrage de Dessin. Lis CLAUDE.md, docs/DESSIN.md en entier, docs/designs/Dessin.dc.html, docs/ARCHITECTURE.md §1-5,
docs/DATABASE.md §2, §3, §12, docs/MOBILE.md, docs/PAIEMENTS.md, docs/COUTS.md, docs/REPRISE_PARCOURS.md et
apps/web/features/editeurSite (lecture seule, pour s'en inspirer : ne rien y modifier).
Ne code rien. Produis dans docs/AVANCEMENT.md une section « Lot 15 — Dessin » avec : le découpage 15b à 15k ci-dessous
(cases à cocher), les dépendances à ajouter et leur poids, les incohérences entre DESSIN.md et les autres documents
(avec ta proposition), les décisions D84 à D91 qui bloquent les premiers sous-lots, et la liste des DES-xx à ajouter à
docs/ACCEPTANCE.md. Puis attends mes réponses.
```

### Lot 15b — Cœur pur : schémas, géométrie, commandes
```
Lot 15b. Lis docs/DESSIN.md §2, §3, §5 et §6.3-6.4. Tests d'abord (Vitest), puis implémentation dans packages/core/src/dessin :
schémas Zod de la scène (z depuis @ph/core/zod), migrations versionnées, géométrie (intersections, polygones, offsets de murs,
jonctions L/T/X, détection des pièces par faces minimales, surfaces nettes et Carrez), aimantation, commandes réversibles avec
regroupement des gestes et historique borné, validations (ouvertures, escaliers Blondel, garde-corps), métré par poste rattaché
aux prestations de docs/data/prestations-catalogue.json, formats de longueur et de surface dans @ph/core/format.
Millimètres entiers partout. Aucune dépendance à React, Firebase ou Next. Couverture ≥ 90 % sur dessin/.
```

### Lot 15c — Données, règles, Functions
```
Lot 15c. Lis docs/DESSIN.md §4 et §8, docs/DATABASE.md §12. Mets à jour DATABASE.md (plans, versions, partagesPlans,
référentiels dessinCatalogue et materiaux), firestore.rules, storage.rules, firestore.indexes.json, chemins et repositories
dans packages/firebase, actions et callables (enregistrer avec contrôle de version, restaurer, dupliquer, corbeille, partager,
révoquer, purge de nuit, export RGPD et suppression de compte). Un test par règle sur émulateur. Seed : 2 plans de particulier,
2 plans d'entreprise, catalogue et matériaux de démonstration (licences CC0 notées dans docs/data/dessin-licences.json).
```

### Lot 15d — Coque de l'éditeur et 2D
```
Lot 15d. Lis docs/DESSIN.md §1, §6.1-6.4, §6.11, §6.13, §7 et docs/designs/Dessin.dc.html. Routes /mon-espace/plans,
/mon-espace/plans/[planId], /pro/dessin, /pro/dessin/[planId] derrière FLAGS.dessin, entrée « Dessin » dans SidebarPro et
« Mes plans » dans l'espace particulier. Assemble features/dessin : barre d'application, bibliothèque, palette, inspecteur,
guide, zoom, calques ; store (sélecteurs fins) ; rendu 2D SVG ; outils sélection, mur, pièce, cote, texte ; édition des cotes
au clic ; création depuis une forme ou un modèle ; annuler/rétablir ; enregistrement automatique, hors ligne, versions,
conflits. Fidélité à la maquette (/maquette), thèmes via tokens, aucun hex. Tests Playwright DES-01 à DES-12, DES-29 à DES-32,
DES-38 à DES-40.
```

### Lot 15e — Ouvertures, escaliers, niveaux, plan importé
```
Lot 15e. docs/DESSIN.md §6.2, §6.5, §6.6 et DES-01 (plan importé). Ouvertures aimantées aux murs avec symboles normalisés,
escaliers avec calculs et trémies, niveaux complets (copie des murs, transparence du niveau inférieur), import d'image ou PDF
en calque et mise à l'échelle par deux points. Tests unitaires et Playwright DES-04, DES-05, DES-13 à DES-15.
```

### Lot 15f — Aménager et décorer
```
Lot 15f. docs/DESSIN.md §6.9, §6.10. Bibliothèque d'objets (recherche, filtres, glisser-déposer, rotation, dimensions,
variantes, slots de matériaux, collisions, contre mur), mode cuisine (modules, plan de travail continu, électroménager),
salle de bain, électricité et plomberie ; décoration par face, par pièce et par zone décorative, poses de carrelage et de
parquet, papier peint, pipette de style. Symboles 2D de chaque objet. Tests DES-21 à DES-28.
```

### Lot 15g — 3D, visite, photo
```
Lot 15g. docs/DESSIN.md §5 (rendu3d, visite, photo), §6.12 DES-33, DES-34, DES-37, §6.15 DES-48. Ajoute three,
@react-three/fiber, @react-three/drei, @react-three/postprocessing en import dynamique uniquement (vérifie le budget d'EXPLOITATION §1).
Génère la géométrie 3D depuis la scène (murs avec découpes d'ouvertures, sols, plafonds, escaliers, objets glb instanciés,
textures ktx2 à l'échelle réelle), vue maison de poupée, niveau isolé, ombres selon l'heure et le nord ; visite avec collisions,
clavier, souris et joystick tactile ; vue photo (cadrage, ambiance, export HD, galerie). Tests de rendu par capture et
Playwright DES-33, DES-34, DES-37.
```

### Lot 15h — Toiture, extérieur, piscine, implantation, façades
```
Lot 15h. docs/DESSIN.md §6.7, §6.8, DES-35, DES-36. Mode toiture (génération depuis le contour, types, pentes, débords,
lucarnes, fenêtres de toit, cheminées, couvertures, combles Carrez), mode extérieur (terrasse, terrain, clôtures, végétation),
piscine (formes, profondeurs, escaliers, margelles, plage, volume d'eau), vue d'implantation sur parcelle (source selon D87,
recherche par adresse via la géolocalisation existante), façades et coupes générées. Tests DES-16 à DES-20, DES-35, DES-36.
```

### Lot 15i — Export, partage, lien avec les demandes et les devis
```
Lot 15i. docs/DESSIN.md §6.14. PDF à l'échelle avec cartouche et métré, PNG, lien de partage /plan/[jeton] (noindex, lecture
seule 2D/3D/visite), partage dans l'équipe, onglet Chiffrer (métré, cases, PDF/CSV), « Demander des devis » via le parcours
existant avec plan joint (prix recalculés serveur, centimes), « Créer un devis depuis ce plan » côté artisan (lignes préremplies,
verifierMentions inchangé). Tests DES-41 à DES-45.
```

### Lot 15j — Public, mobile, accessibilité, performance
```
Lot 15j. docs/DESSIN.md §1 (landing /dessin et essai sans compte), §6.15, docs/LANDINGS.md, docs/MOBILE.md. Landing SEO
derrière FLAGS.dessinPublic, essai en brouillon local avec reprise après inscription, éditeur mobile (feuilles du bas, barre
d'outils basse, gestes), raccourcis clavier et aide « ? », annonces aria-live, déplacement aux flèches, mesures de performance
(Lighthouse sur la landing, profil 2D à 500 murs). Tests sur iPhone et Pixel (Playwright), DES-03, DES-46 à DES-48.
```

### Lot 15k — Recette et fin
```
Lot 15k. /relecture puis /duplication sur la branche lot-15-dessin. Vérifie chaque DES-xx d'ACCEPTANCE.md, la fidélité à la
maquette, les règles et leurs tests, les coûts (COUTS.md), l'export RGPD. Mets à jour AVANCEMENT.md, PROGRESSION.md et les
décisions. Ne déploie pas sans mon « go ».
```

### Reprise
```
Reprise du lot 15. Lis CLAUDE.md, la section « Lot 15 — Dessin » de docs/AVANCEMENT.md et docs/PROGRESSION.md, puis
`git log --oneline -20`. Dis-moi où on en est, ce qui reste dans le sous-lot en cours, et propose la suite. N'écris rien
avant ma validation.
```

---

## 11. Branchements sur l'existant (chacun soumis à l'accord du propriétaire)

Tout le reste de Dessin vit dans de nouveaux fichiers (`packages/core/src/dessin/`, `packages/firebase/src/…/dessin`, `apps/web/features/dessin/`, `apps/web/app/…/dessin`, `apps/functions/src/dessin`). Les seuls points qui toucheraient un fichier existant :

| Branchement | Fichier existant concerné | Sous-lot |
|---|---|---|
| Export du sous-chemin `@ph/core/dessin` | `packages/core/package.json` | 15b |
| Collections et chemins Storage des plans | `firestore.rules`, `storage.rules`, `firestore.indexes.json`, `packages/firebase/src/chemins.ts` | 15c |
| Permission d'équipe pour Dessin | `packages/core/src/equipe/permissions.ts` | 15c |
| Flags `dessin` et `dessinPublic` | `packages/core/src/flags.ts` | 15d |
| Lien « Dessin » dans la barre latérale pro | `packages/core/src/espacePro`, `apps/web/features/espacePro/adresses.ts` | 15d |
| Onglet « Mes plans » de l'espace particulier | `apps/web/features/espace/Onglets.tsx` | 15d |
| Nouvelles dépendances | `apps/web/package.json` | 15d, 15g, 15h |
| Plan joint et « devis par écrit sans appel » | schéma et création des demandes, affichage côté artisan | 15i |
| Export RGPD et suppression de compte incluant les plans | fonctions RGPD existantes | 15c |

Proposition par défaut : ne rien brancher tant que le propriétaire n'a pas dit oui pour la ligne concernée ; Dessin reste alors accessible par son adresse directe derrière une vérification de session dans ses propres fichiers.
