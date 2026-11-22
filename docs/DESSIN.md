# Dessin — éditeur de plans 2D / 3D de Portail Travaux

> **État au 19/11/2026** : lots 15a à 15j faits, 15k (recette) en cours ; rien en production (flags `dessin` et `dessinPublic` éteints). Ce document décrit **ce qui est fait dans le code**. Ce qui était prévu mais n'est pas fait est marqué **« pas encore fait »** ; ce qui a été abandonné est marqué **« abandonné »**. Journal détaillé : `AVANCEMENT.md` §31 ; décisions : `DECISIONS.md` D84 à D94.
>
> **Nom** : l'outil s'appelle **« Plans »** dans l'interface (menu pro « Plans », page « Mes plans ») ; « Dessin » reste le nom interne (flag `dessin`, dossiers `dessin`).
>
> **Règle du lot : Dessin s'ajoute à côté de l'existant.** Le code existant se lit et s'importe, il ne se réécrit pas. Les branchements sur l'existant (§11) ont tous été faits avec l'accord explicite du propriétaire, un par un.
>
> Ce document fait foi pour Dessin ; en cas de conflit, `CLAUDE.md`, `ARCHITECTURE.md`, `DATABASE.md`, `MOBILE.md`, `PAIEMENTS.md` et `COUTS.md` priment, et le conflit est signalé.
> Maquette de référence : `docs/designs/Dessin.dc.html` (couleurs et composants). La disposition de l'écran a été changée avec le propriétaire (§7) : rails verticaux à gauche et à droite au lieu de la bibliothèque à onglets et de la palette posée sur le plan.

---

## 0. Objectif et règle de non-copie

Dessin permet à un **particulier** (avec compte) et à un **artisan** (dans son espace pro) de dessiner un logement en 2D, de le voir en 3D, de le visiter, de l'aménager et de le décorer, puis d'en tirer **un métré et une demande de devis** (particulier). Côté artisan, le « devis prérempli depuis le plan » a été **abandonné** (DES-45, choix du propriétaire) : l'artisan a le métré, l'export et le plan joint par le client. C'est le pont entre « j'imagine mon projet » et « je trouve un artisan » : c'est ce qui le distingue des outils grand public.

**Référence fonctionnelle : Kozikaza** (éditeur de Leroy Merlin). On vise la **parité de fonctions** (et au-delà), jamais la ressemblance :
- ne rien reprendre de Kozikaza : ni nom, ni textes, ni icônes, ni pictogrammes, ni disposition d'écran, ni couleurs, ni modèles 3D, ni textures, ni catalogue produit, ni code ;
- l'interface suit **notre maquette** et nos tokens (`packages/ui`) ;
- les modèles 3D et textures viennent de sources dont la licence autorise l'usage commercial (CC0 : Poly Haven, ambientCG, Kenney…) ou sont créés pour nous (voir D88). La licence de chaque fichier est notée dans `docs/data/dessin-licences.json`.
- **Fait** : 40 meubles 3D et 11 textures photo, tous CC0 de Poly Haven (§5 bis). **Pas encore fait** : le catalogue maison (deuxième étape de D88).

---

## 1. Publics, accès et routes

| Public | Accès | Routes |
|---|---|---|
| Visiteur | Page de présentation publique + **essai sans compte** (brouillon local, rien sur le serveur) | `/dessin` (landing SEO, gabarit `LANDINGS.md`), `/dessin/essai` |
| Particulier | Compte requis pour **enregistrer**. Au premier « Enregistrer » d'un essai : création de compte puis reprise du brouillon (mécanique de `REPRISE_PARCOURS.md`) | `/mon-espace/plans` (liste, onglet « Mes plans »), `/mes-plans/[planId]` (éditeur plein écran, hors de l'en-tête de l'espace) |
| Artisan | Entrée **« Plans »** dans `SidebarPro` (outil, pas dans « Mon compte ») ; plans de l'**entreprise**, visibles par les membres selon leur rôle (`peut()`) | `/pro/plans` (liste), `/pro/plans/editeur/[planId]` (éditeur plein écran, hors du cadre de l'espace, comme l'éditeur du site) |
| Lien partagé | Lecture seule (plan, 3D, visite, façades), sans compte, jeton révocable ; sans localisation (§8) | `/plan/[jeton]` (`noindex, nofollow`) |
| Artisan qui a accepté une demande avec plan joint | Lecture seule, page authentifiée, **sans jeton** (D93) | `/pro/demandes/[demandeId]/plan` |

- L'éditeur est plein écran (pas de pied de page), dans le **thème de l'espace** (`data-theme`) : vert côté particulier, thème pro côté artisan. Aucun hex en dur dans l'interface ; les couleurs du plan lui-même sont des tokens fixes (`@ph/ui/tokens`, `MATERIAUX_DESSIN`, `COULEURS_OBJETS`), non reliés aux thèmes, pour rester lisibles sur papier et dans le PDF (choix de la recette 15k).
- **Dessin est gratuit** pour les particuliers et les artisans (D84 ✅). Les quotas du §8 sont des garde-fous techniques, pas une offre payante.
- Flags (`packages/core/src/flags.ts`, `false` par défaut) : `dessin` (Mes plans et Plans pro), `dessinPublic` (landing et essai). Tous deux éteints en production tant que le lot n'est pas recetté.
- Côté artisan, la permission est `dessin.gerer` (propriétaire, gérant, collaborateur) ; le comptable n'a pas accès aux plans (testé).

---

## 2. Unités, coordonnées, conventions

- **Longueurs en millimètres entiers** (comme les centimes pour l'argent) : aucun `float` stocké ; limite ± 1 km (`LIMITE_MM`). Affichage en cm ou m selon le réglage (`formatLongueur()`, `formatSurface()`, `formatAngle()`, `formatVolume()`, `lireMesure()` dans `packages/core/src/dessin/format.ts`, exportés par `@ph/core/dessin`). Surfaces calculées en mm² puis affichées en m² à 1 décimale.
- Angles en **dixièmes de degré** entiers (de −360° à 360°).
- Repère : x vers l'est, y vers le sud (comme l'écran), z vers le haut. Le nord du projet est un angle stocké (`orientationNord`) ; il tourne avec la parcelle à l'implantation.
- Identifiants d'éléments : préfixe + 10 caractères aléatoires (`crypto.randomUUID()` tronqué, pas `nanoid`), par exemple `m_`, `o_`, `p_`, `obj_`, `esc_`, `n_` ; vérifiés par le schéma ; stables dans le temps (l'historique et la sélection s'appuient dessus).

---

## 3. Modèle de scène (schémas Zod dans `packages/core/src/schemas/dessinScene.ts` et `dessinPlan.ts`)

Un plan = **métadonnées Firestore** + **scène JSON** compressée (gzip) dans Storage (un document Firestore est limité à 1 Mio). Les schémas sont exportés par `@ph/core/dessin` et validés côté client **et** serveur (`migrerScene()`).

Résumé du schéma tel qu'il est dans le code (champs facultatifs suivis de `?`) :

```
Scene {
  version: 1                       // SCENE_VERSION ; migrations dans core/dessin/migrations.ts
  unites: { affichage: 'cm' | 'm' } // 'm' par défaut
  orientationNord: angle
  verrouille?: boolean             // plan verrouillé (DES-29) : consultable, plus modifiable avant déverrouillage
  terrain: Terrain | null
  niveaux: Niveau[]                // 1 à 10
  calques: { cotes, surfaces, mobilier, electricite, plomberie, annotations, fondImage }: boolean
                                   // tous affichés par défaut, électricité et plomberie comprises ; enregistrés avec la scène (DES-30)
  fondImage: { storagePath, mmPour1000Px, position, rotation, opacite (0-100), niveauId } | null
}

Niveau { id, nom, type: 'sous_sol'|'rdc'|'etage'|'combles', altitude, hauteurSousPlafond, epaisseurPlancher,
         murs, ouvertures, pieces, objets, escaliers, tremies: Polygone[], cotes, textes, zonesDeco,
         toiture: Toiture | null,
         exterieur: { terrasses, piscines, allees: Polygone[], clotures, vegetation } }

Mur { id, a, b, epaisseur, hauteur, hauteurB?, type: 'mur'|'cloison'|'demi_mur'|'muret'|'separation'|'poteau'|'poutre',
      porteur, alignement: 'axe'|'gauche'|'droite', faceA: Revetement, faceB: Revetement, verrouille }
Ouverture { id, murId, position (distance depuis a), largeur, hauteur, allege, type (17 types, dont porte_galandage_double),
            modeleId?, sens: 'gauche'|'droite', cote: 'interieur'|'exterieur', volet: 'roulant'|'battant'|null,
            remplissage?: 'plein'|'vitre'|'semi_vitre'|'cassettes', petitsBois?: { colonnes, rangees },
            materiau?: 'pvc'|'bois'|'alu', couleur?: '#rrggbb', imposte?: 'fixe'|'ouvrante' }
Piece { id, contour, nom, type (15 types), sol: Revetement, plafond: Revetement, hauteurSousPlafond?,
        zonesBasses: Polygone[] (sous 1,80 m, exclues de la surface Carrez) }
Objet { id, catalogueId, position, rotation, dimensions { l, p, h }, variante?, materiaux: Record<slot, id>,
        accrocheMurId?, altitude, inclinaison?: { x, y } (rotation libre, lot 15g), verrouille? }
Escalier { id, type: 'droit'|'quart_bas'|'quart_haut'|'deux_quarts'|'helicoidal'|'meunier', position, rotation,
           largeur, hauteurAMonter, nbMarches, giron, sens, gardeCorps: boolean,
           structure: 'pleine'|'ouverte', materiau: 'bois'|'metal'|'beton',
           chemin?: Point[] (escalier tracé : ligne de foulée posée clic par clic, repère de l'escalier),
           virage: 'balance'|'palier', limon?: 'lateraux'|'central'|'aucun' }
Cote { id, a, b, decalage }        Texte { id, position, contenu, taille }       // DES-31
Toiture { type: 'deux_pans'|'quatre_pans'|'croupe'|'monopente'|'plate'|'mansarde', pentes: angle[], debord, faitageAngle,
          couverture: Revetement, lucarnes: { type: 'jacobine'|'capucine'|'chien_assis', pan, position, largeur }[],
          fenetresToit[], cheminees[] }
Terrasse { id, contour, revetement, hauteur, gardeCorps: boolean, pergola: boolean }
Piscine { id, forme: 'rectangle'|'ronde'|'ovale'|'haricot'|'L'|'couloir'|'hors_sol', position, rotation, longueur, largeur,
          profondeurMin, profondeurMax, escalier: 'roman'|'droit'|'angle'|null, margelle: Revetement, debordement }
Cloture { id, points, type: 'grillage'|'bois'|'muret'|'haie'|'portail', hauteur }
Vegetal { id, type: 'arbre'|'arbuste'|'haie', position, diametre }
Terrain { parcelle, revetement? (sol de la parcelle, gazon si absent), referenceCadastrale?, codeInsee?, implantation: { x, y, rotation },
          georef?: { x, y } (Lambert-93 en mm du point 0,0 du plan, DES-35),
          orthophoto?: { storagePath, emprise { x0, y0, x1, y1 } } (photo aérienne IGN enregistrée dans le dossier du plan) }
Revetement { famille (25 familles), materiauId?, couleur?, orientation?, joint?: { largeur, couleur? },
             format?: { l, p }, pose?: 'droite'|'decalee'|'diagonale'|'chevron'|'point_de_hongrie'|'baton_rompu',
             finition?: 'mat'|'satin'|'brillant' (peinture, DES-25 ; mat si absent) }
ZoneDeco { id, support: { genre: 'mur', murId, face: 'a'|'b' } | { genre: 'piece', pieceId, surface: 'sol'|'plafond' },
           contour, revetement }
```

Écarts avec la spécification d'origine (tous rétrocompatibles, sans migration) :
- **ajoutés** : `verrouille?` (scène et objets), `inclinaison?` (objets), champs de menuiserie des ouvertures, `format?`, `pose?` et `finition?` des revêtements, `terrain.georef?` et `terrain.orthophoto?` ;
- **pas encore faits** : plinthes sur le mur (les plinthes ne sont que calculées au métré, depuis le périmètre des pièces), plots et escalier rattaché d'une terrasse, plage (remplacée par le bouton « Terrasse autour »), liner, abri et local technique d'une piscine, altitude du terrain, matériau d'un escalier, gouttières dans le modèle (elles sont calculées) ;
- le décalage d'un revêtement (`decalage`) n'existe pas : la pose « décalée » le remplace.

Référentiels : **pas faits sous forme de collections Firestore**. Le catalogue d'objets (environ 95 éléments en 11 univers, dimensions, plages, symbole 2D, prestation liée) est une constante du cœur (`packages/core/src/dessin/catalogue.ts`, données dans `catalogueCuisine.ts`, `catalogueMaison.ts`, `catalogueTechnique.ts`). Sans modèle `glb`, chaque objet a un volume 3D simple et lisible tiré de son symbole (`formes3d*.ts` : boîtes, cylindres, prismes pour les toits, plaques inclinées) : îlot à plan débordant, tabourets, table haute, buffets, étagères, banc, four, et dehors pergola à lames, carport, serre vitrée, abri à deux pans, bain de soleil, parasol, jardinière. Les matériaux (environ 28, couleur, joint, format) sont des tokens (`MATERIAUX_DESSIN` dans `@ph/ui/tokens`). Les fichiers 3D et textures sont associés par `modeles3d.ts` (§5 bis). Les collections `referentiel/dessinCatalogue` et `referentiel/materiaux` prévues au départ n'existent pas.

---

## 4. Données Firestore et Storage (détail dans `DATABASE.md` §8 quater ; chemins dans `packages/firebase/src/chemins.ts`)

| Chemin | Contenu | Lecture (règles) | Écriture |
|---|---|---|---|
| `users/{uid}/plans/{planId}` | métadonnées (`planDessin`) : `titre`, `apercu?` (chemin SVG des murs calculé par le serveur, `apercuPlan()`), `versionCourante` (révision, +1 à chaque enregistrement), `storagePath`, `derniereVersionLe`, `courantDansHistorique`, `taille` (≤ 5 Mo), `creeLe`, `majLe`, `supprimeLe`, `demandeId?` | le particulier lui-même | serveur uniquement (`allow write: if false`) |
| `artisans/{id}/plans/{planId}` | idem + `clientNom?`, `auteurUid?` | équipe opérationnelle (`isOperationnel`) | serveur uniquement, après `peut('dessin.gerer')` relu en base |
| `…/plans/{planId}/historique/{numero}` | `numero`, `storagePath`, `auteurUid`, `type: 'auto'|'manuelle'|'restauration'`, `nom?`, `taille`, `creeLe` (ajout seul) | comme le plan | serveur uniquement |
| `partagesPlans/{empreinte}` | `proprietaire {type, id}`, `planId`, `versionId: 'courante'`, `expireLe` (toujours une date de fin), `revoque`, `creeLe` | aucune lecture client (la page `/plan/[jeton]` lit côté serveur) | serveur |
| Storage `dessin/{type}/{proprietaireId}/{planId}/r{révision}-{suffixe}.json.gz` | scène compressée, **5 Mo au plus** | aucun accès client (`storage.rules` inchangé : refus par défaut) | serveur |
| Storage `…/{planId}/fond-{id}.{jpg,png,webp}`, `ortho-{id}.jpg`, `photos/photo-{date}-{id}.jpg` | plan importé (un seul, l'ancien remplacé), photo aérienne IGN (une seule), photos de la galerie (30 au plus) | idem, relu par l'opération `lire-fond` dans le dossier du plan seulement | serveur, 3 Mo au plus, signature JPEG/PNG/WebP vérifiée |

Écarts avec la spécification d'origine :
- **`apercu`** remplace la vignette image : aucune image à générer ni à stocker. Le champ `vignettePath?` existe encore dans le schéma mais n'est pas utilisé.
- La sous-collection s'appelle **`historique`** et non `versions` (le groupe de collections `versions` sert déjà aux sites).
- Le document de partage est rangé sous l'**empreinte SHA-256** du jeton : le jeton n'est jamais stocké, il n'est montré qu'à la création.
- Le partage pointe toujours sur la version courante (pas de version figée).
- Pas d'URL signée d'envoi : la scène passe par la route `/api/dessin/[operation]` (4 Mo de JSON au plus par requête, limite de l'hébergeur), puis le serveur l'écrit dans Storage.
- Pas de `devisIds[]` (DES-45 abandonné).
- Les collections de référentiel du §3 n'existent pas.

- **Enregistrement** : le client envoie la scène (validée côté client **et** serveur, `migrerScene()` appliquée), le serveur l'écrit dans Storage puis met à jour `versionCourante` **en transaction avec contrôle de version** (`versionAttendue`) pour détecter un autre onglet ou un autre membre ; en cas de conflit, l'éditeur propose le choix à l'utilisateur.
- **Versions** : automatique au plus toutes les 10 minutes d'édition, manuelle nommée à la demande. À chaque nouvelle version, le serveur supprime celles de plus de 30 jours au-delà des 50 plus récentes (au moment de l'enregistrement, pas par une Function de nuit). Restaurer = nouvelle version de type `restauration` (rien n'est écrasé).
- **Corbeille** : suppression douce 30 jours, puis purge par `purgeDessinNuit` (Function planifiée chaque nuit à 3 h 40, 200 plans par passage ; Firestore, fichiers Storage et liens de partage du plan). Export RGPD et suppression de compte incluent les plans. **Entreprise fermée** : ses plans passent à la corbeille et sont supprimés 30 jours plus tard (D92).
- **Plan joint à une demande** (DES-44) : la demande porte `planJoint { planId, proprietaireId }` et `contactSouhaite?: 'telephone' | 'ecrit_uniquement'` (`DATABASE.md` §4). L'artisan qui a accepté la demande lit le plan par une page authentifiée, sans jeton ; si le client met son plan à la corbeille, l'artisan voit « Le client a retiré son plan. » ; aucune copie n'est gardée (D93).
- Règles et index : **un test par règle** (150 cas dans `tests/regles/dessin.test.ts`), refus par défaut ; index de purge dans `firestore.indexes.json`. Aucun nom de collection hors `packages/firebase` (`chemins.ts`).
- **Pas encore fait** : purge des liens de partage expirés (ils restent en base, refusés à la lecture, jusqu'à la purge du plan) ; données de démonstration des plans dans le seed (`pnpm seed`), la maison de démonstration étant proposée comme modèle dans « Nouveau plan ».

---

## 5. Architecture du code (telle qu'elle est)

```
packages/core/src/schemas/dessinScene.ts, dessinPlan.ts
                  schémas Zod de la scène, des métadonnées, des versions, des partages et des entrées de /api/dessin
packages/core/src/dessin/            PUR, testé d'abord (Vitest), aucune dépendance runtime hors zod ; fichiers à plat
  index.ts        point d'entrée de @ph/core/dessin (réexporte aussi les schémas)
  geometrie, murs, detectionPieces, pieces, piecesDessinees
                  segments, polygones, contours des murs, jonctions L/T/X, détection des pièces, Carrez,
                  surfaces murales nettes, pièce polygonale dessinée (DES-12)
  aimantation, placement, placementExterieur, alignement
                  aimantation du tracé ; placement automatique des meubles et de l'extérieur ; aligner, répartir
  commandes, commandesMurs, commandesToit, historique
                  opérations sur la scène (chaque appel rend une nouvelle scène) ; historique de 300 étapes (D94)
  selection, pressePapier, annonces
                  sélection multiple, copier-coller entre niveaux, texte annoncé par aria-live (DES-47)
  ouvertures, menuiseries, listeMenuiseries, escaliers, niveaux, fond, objets, catalogue, cuisine, revetements
  toitures, ailesToit, pansToit, decoupeToit, exterieur, formePiscine, implantation, elevation
  validations     ouverture dans le mur, chevauchements, Blondel, échappée, garde-corps
  metre, metreNiveau, export
                  quantités par poste rattachées aux prestations de docs/data/prestations-catalogue.json ;
                  données du PDF à l'échelle ; scène sans localisation pour le partage
  volumes, formes3d, habillage3d, menuiseries3d, vantail3d, toits3d, soleil, visite, emprise, modeles3d
                  géométrie 3D (murs découpés, toits, menuiseries), soleil, collisions de la visite,
                  correspondance meubles → fichiers glb et matériaux → textures
  formes, modeles, modelesDonnees, demo, demoDonnees, apercu, annotations, migrations, format
packages/firebase/src/serveur/dessin/ plans (créer, lire, lister, enregistrer avec conflit, versions, restaurer, renommer,
                  dupliquer, corbeille), partages, planJoint, fond, photos, implantation (IGN), purge (corbeille, RGPD)
packages/ui/src/tokens/dessin.ts     MATERIAUX_DESSIN, COULEURS_OBJETS, couleurs du plan et des ambiances 3D
apps/web/app/api/dessin/[operation]/route.ts
                  toutes les opérations, chacune dans action() (schéma, permission, limite de débit, idempotence des créations)
apps/web/server/dessin.ts, pdfPlan.ts
                  contexte (particulier ou entreprise) et PDF à l'échelle (pdfkit, côté serveur)
apps/web/features/dessin/
  Editeur.tsx, EditeurEssai.tsx, EspaceDeTravail.tsx, BarreDessin, Rails, Panneau, menus (Structure, Equiper, Finitions,
  Chiffrage, Rendu, Aide…), Inspecteur*, Plan2D et calques SVG, MesPlans, NouveauPlan, Visionneuse (lien partagé),
  HistoriqueVersions, GaleriePhotos, PartageMenu, ImplantationMenu, Facades…
  etat*.ts        état de l'éditeur avec useReducer (etat, etatBase, etatStructure, etatAmenagement, etatSelection…)
  useSauvegarde, brouillons.ts
                  enregistrement automatique, brouillon et essai dans IndexedDB (API du navigateur, sans bibliothèque)
  vue3d/          Vue3D, Visite, Photo, Modele3D, textures… : three + @react-three/fiber, en import dynamique
  public/         landing /dessin
apps/functions/src/dessin/planifiees.ts
                  purgeDessinNuit seulement ; toutes les autres opérations passent par la route Next ci-dessus
apps/web/public/dessin/modeles, textures
                  40 meubles glb et 33 images de textures (11 matériaux), CC0
```

**Dépendances réellement ajoutées** (toutes signalées et acceptées) :
- `apps/web` : `three` 0.187.0, `@react-three/fiber` 9.8.2, `@react-three/drei` 10.7.9, `@react-three/postprocessing` 3.2.2, `postprocessing` 6.39.6 (chargés seulement au passage en 3D, visite ou photo) ; `pdfjs-dist` 6.4.299 (chargé seulement au choix d'un PDF à importer). `pdfkit` était déjà là.
- Racine (développement seulement) : `@gltf-transform/cli`, script `pnpm dessin:modele`.
- Variantes du catalogue (`ObjetCatalogue.style`) : un même symbole donne plusieurs volumes simples (canapé droit, sur pieds, d'angle, méridienne ; plaques induction, gaz, domino ; hottes murale, îlot, intégrée ; réfrigérateurs combiné, américain, sous plan ; baignoires droite, îlot, d'angle, avec pare-bain ; douches italienne, grande, d'angle, en niche, cabine ; WC suspendu, au sol, avec lave-mains ; vasques encastrée, à poser, suspendue ; pergolas à lames, bioclimatique, à toile, en bois).
- Cuisine personnalisable (DES-23) : chaque meuble de cuisine a trois couleurs dans `Objet.materiaux` (`facade`, `plan`, `poignee`, sans changement de schéma), rendues par les teintes `principal`, `plan` et `poignee` ; « Appliquer à toute la cuisine » (`harmoniserCuisine`) les copie sur tous les meubles de cuisine du niveau, sauf les verrouillés.
- Sélection : Échap finit le tracé en cours, sinon désélectionne ; passer en 3D, visite, photo ou façades désélectionne tout.
- Couleurs de la cuisine aussi en tête d'Équiper > Cuisine (`colorerCuisine`) : appliquées à toute la cuisine et reprises par les meubles posés ensuite (`objetAPoser`).
- Canapés : 15 modèles, volumes aux arêtes adoucies (`arrondi`), tissu teinte `tissu` (suit la couleur choisie) ; en 2D, vue de dessus tirée du volume 3D (angle, U, méridienne).
- Peinture d'un coup (DES-28) : « Murs de la pièce » (pièce choisie) et « Tous les murs extérieurs » (`revetirMursExterieurs`, aussi sans rien choisir) ; chaque face garde ensuite son revêtement, modifiable seule. Côtés de mur nommés par ce qu'ils regardent (« Côté Salon », « Côté extérieur »).
- Extrémité de mur tirée : aimantée comme au tracé (angles à 45°, alignements, autres murs, grille de 5 cm) ; Alt pour la laisser libre.
- 3D et photo : glisser déplace la vue, Espace + glisser (ou clic droit) la fait tourner.
- Bureaux (symbole `bureau`, formes3dBureau.ts) : 13 bureaux (droit, compact, caisson, pieds métal, tréteaux, assis-debout, d'angle des deux côtés, double, direction, avec étagère, secrétaire), sièges de bureau et rangements. Tables (formes3dTables.ts) : 14 tables et 13 tables basses en variantes (scandinave, industrielle, trapèze, massive, ovale, extensible, verre, tulipe, trois pieds, travertin, gigognes, coffre, marbre). Plateaux en teinte `plateau` (chêne par défaut, suit la couleur choisie). Vue 2D tirée du volume.
- Le toit suit les murs (`toituresSuivies`, appliqué à chaque modification) : une partie d'un niveau découverte (murs de l'étage effacés) reçoit le toit de la maison ; un toit retiré exprès reste retiré tant que les murs ne changent pas. L'étage ne couvre que ce que portent ses murs : pièces, murs extérieurs et murs porteurs (pas les cloisons seules).
- Terrasses retouchables (DES-18) : coins (ronds, un rectangle reste rectangle) et côtés (carrés) tirés à la souris ; tracée par-dessus la maison, seule la partie dehors est gardée, découpée en rectangles (`rectanglesHorsMaison`). Sens des lames (`revetement.orientation` : longueur, travers, diagonale) appliqué en 2D et en 3D.
- Piscine tracée comme un sol (DES-20) : deux coins opposés (deux clics au même endroit : taille par défaut), sur terrasse, gazon ou autre ; étirée ensuite par ses coins, le coin opposé fixe (`redimensionnerPiscine`).
- Toit 3D : faîtières seulement là où les deux pans descendent (jamais dans une noue) ; pignons tournés vers l'extérieur de leur propre bâtiment (annexe séparée comprise).
- Ajouter un niveau avec une pièce ou un mur choisi : seuls les murs de ce bâtiment (murs reliés entre eux, `batiments.ts`) sont repris.
- Miniatures du menu Équiper : `pnpm dessin:miniatures` (scripts/miniaturesDessin.ts) rend chaque objet du catalogue en 3D, vu de trois quarts, avec le vrai modèle ou la forme simple, dans `apps/web/public/dessin/miniatures/{id}.webp` (112 px, environ 3 Ko). À relancer après tout ajout ou changement d'objet ; un test vérifie qu'aucune ne manque. Le menu montre les objets en cartes à deux colonnes ; sans image, le symbole vu de dessus.

**Prévues mais non ajoutées** (inutiles à ce stade) : `zustand`, `immer`, `comlink`, `idb-keyval`, `clipper2-ts`, `polygon-clipping`, `maplibre-gl`. Il n'y a **pas de Web Worker** : à 500 murs et 1 000 objets, le métré prend environ 1,5 ms (DES-48).

Budget JS (EXPLOITATION §1, seuil CI provisoire de 160 Ko sur les pages publiques) : l'éditeur 2D ≤ 250 ko gzip hors 3D ; la 3D n'est jamais dans le bundle initial. **Non mesuré** à ce jour : le poids réel du bundle de l'éditeur n'est pas noté dans AVANCEMENT.

## 5 bis. Pile technique (D86)

| Besoin | Choix décidé (D86) | Réalisé dans le code |
|---|---|---|
| Application | **Next.js 16 + React 19 + TypeScript** (déjà en place) | conforme |
| Plan 2D | **SVG rendu par React** | conforme ; calques murs, pièces et meubles mémorisés (ne se redessinent que si leurs données changent) |
| 3D, visite, photo | **three.js + @react-three/fiber + @react-three/drei** (+ `@react-three/postprocessing` pour la vue photo) | conforme, chargés seulement au passage en 3D, visite ou photo |
| État de l'éditeur, annuler / rétablir | zustand + immer | **`useReducer` + scènes immuables du cœur**, aucune dépendance ; historique de 300 étapes (D94) |
| Géométrie | code maison + `clipper2-ts` ; `earcut` (dans three) | **code maison seulement** dans `packages/core/src/dessin`, sans `clipper2-ts` |
| Calculs lourds | Web Worker + comlink | **pas de worker** : calculs assez rapides (DES-48) |
| Hors ligne | IndexedDB via idb-keyval | **IndexedDB directement** (API du navigateur), brouillon et essai sans compte |
| Modèles 3D | glTF/GLB optimisés par `@gltf-transform` (Meshopt, textures KTX2) | **GLB Meshopt, textures WebP 512 px** (pas KTX2) ; 40 meubles CC0 Poly Haven, environ 5,7 Mo ; chargés seulement quand l'objet est vu en 3D ; forme simple pendant le chargement ou si le fichier manque. Fichiers dans `apps/web/public/dessin/modeles/`, **pas dans Storage** |
| Textures | (non prévu à part) | **11 matériaux en texture photo** (couleur, relief, rugosité ; WebP 512 px, 544 Ko pour 33 images) dans `apps/web/public/dessin/textures/` ; les autres matériaux gardent leur motif dessiné |
| Implantation | MapLibre GL + tuiles IGN + API Carto + API Adresse | **pas de MapLibre** (D87 modifiée par le propriétaire) : géocodage Géoplateforme, API Carto cadastre et WMS Géoplateforme **appelés par le serveur** ; la photo aérienne est téléchargée une fois et enregistrée dans le dossier du plan ; CSP inchangée pour ces services |
| Export PDF | **pdfkit** côté serveur | conforme (`apps/web/server/pdfPlan.ts`) |
| Données | Firestore + Storage + Functions v2 | Firestore + Storage ; une seule Function (purge de nuit), le reste par la route `/api/dessin` |
| Tests | Vitest, Playwright (iPhone/Pixel), captures pour la 3D | Vitest (cœur, état de l'éditeur, serveur sur émulateur) ; Playwright sur **iPhone 13 et ordinateur** ; **pas encore fait** : Pixel (non émulé dans la configuration pro), tests par capture de la 3D |

CSP : `blob:` ajouté à `connect-src` pour les textures des modèles 3D (seul changement de CSP du lot).

Poids visé : éditeur 2D ≤ 250 ko gzip ; 3D ≈ 200 ko gzip supplémentaires, chargés à la demande (non mesuré, voir §5).

---

## 6. Fonctions (chaque ligne = un identifiant `DES-xx` dans `ACCEPTANCE.md`)

État au 19/11/2026 : chaque DES de DES-01 à DES-48 a un parcours Playwright vert sur iPhone 13 et ordinateur (`apps/web/e2e-pro/dessin-*.spec.ts`), sauf DES-44 (dans le parcours particulier du simulateur) et DES-45 (abandonné). Sous chaque ligne : ce qui est **fait**, ce qui n'est **pas encore fait**. Une ligne sans mention est faite telle quelle.

### 6.1 Projets et fichiers
- DES-01 Créer un plan : **depuis une forme** (rectangle, L, U, T, saisie des cotes), **pièce par pièce**, **mur par mur**, **depuis un modèle** (studio, T2, T3, maison plain-pied, maison à étage), **depuis un plan importé** (image ou PDF en calque, mise à l'échelle en cliquant deux points et en saisissant leur distance, opacité réglable).
  - **Ajouté (demande du propriétaire)** : modèle « Maison en L meublée (démo) » dans « Nouveau plan » : deux niveaux, rez-de-chaussée en L de 13 × 11 m (deux chambres, salle de bains, WC, cuisine équipée, séjour et salle à manger, 34 meubles, sols), étage (trois chambres dont une suite, salle d'eau, bureau, palier), escalier et trémie, toits deux pans, terrasse, patio, piscine, allée, arbres, grillage (`sceneDemo`, `demoDonnees.ts`).
  - PDF importé : première page seulement, convertie en image dans le navigateur (`pdfjs-dist`), 4 Mo au plus (D91).
  - **Pas encore fait** : déplacer et faire pivoter l'image importée après sa pose (reporté deux fois).
- DES-02 Mes plans : ~~vignettes~~ **aperçu des murs** (champ `apercu`, chemin SVG calculé par le serveur), titre modifiable, date, recherche (sans accents) et tri (date, titre), dupliquer, renommer, déplacer vers la corbeille, restaurer.
  - **Pas encore fait** côté artisan : filtre par client, par membre, rattachement à une demande ou un devis.
- DES-03 Essai sans compte (`/dessin/essai`) : éditeur complet, scène gardée dans IndexedDB, bandeau « Essai sans compte » ; import, implantation, PDF, galerie, partage et demande de devis invitent à créer un compte ; « Enregistrer » mène à la connexion puis « Mes plans » (`?essai=1`) crée le plan depuis l'essai, intact.

### 6.2 Niveaux
- DES-04 Ajouter, renommer, supprimer (sauf le dernier), monter ou descendre ; types sous-sol / RDC / étage / combles ; hauteur sous plafond et épaisseur de plancher réglables, altitudes recalculées ; 10 niveaux au plus.
- DES-05 « Copier les murs extérieurs du niveau inférieur » ; niveau inférieur affiché en transparence ; trémie créée automatiquement par l'escalier.

### 6.3 Murs, cloisons et structure
- DES-06 Tracé point par point (clic ou toucher), double-clic / « Terminer » pour finir, Échap pour annuler le segment ; **saisie de la longueur et de l'angle au clavier** pendant le tracé ; Maj = orthogonal.
  - Fait : saisie de la longueur au clavier. **Pas encore fait** (non trouvé dans le code) : saisie de l'angle au clavier.
- DES-07 Types : mur (20 cm), cloison (**7,2 cm**, standard 72/48, pour permettre le galandage), demi-mur, muret, séparation invisible (délimite une pièce sans mur), poteau, poutre ; épaisseur, hauteur, mur porteur (supprimé seulement après confirmation).
  - **Pas encore fait** : régler une hauteur différente aux deux extrémités (mur rampant) dans l'éditeur ; le champ `hauteurB` existe dans le modèle et le métré en tient compte.
  - Verrouiller un mur : voir DES-29.
- DES-08 Aimantation (grille, extrémités, milieux, prolongements, perpendiculaires, angles) activable ; guides d'alignement affichés.
- DES-09 Jonctions automatiques en L, T et X ; scinder un mur ; fusionner deux murs alignés ; déplacer une extrémité ; déplacer un mur parallèlement (les murs reliés suivent, les ouvertures restent sur le mur).
- DES-10 **Modifier une dimension en cliquant sur sa cote** (intérieure ou extérieure) : la saisie déplace le mur concerné.

### 6.4 Pièces
- DES-11 Détection automatique des pièces fermées ; nom et type (séjour, cuisine, chambre, salle d'eau…) ; surface, périmètre, surface murale nette ; surface **Carrez** sous combles ; sol, plafond, plinthes (plinthes : au métré seulement, pas d'élément « plinthe » sur le plan).
- DES-12 Dessiner une pièce rectangulaire ou polygonale (point par point, fermée sur le premier point) ; crée ses murs.

### 6.5 Ouvertures
- DES-13 Portes : battante simple et double, coulissante, à galandage, pivot, porte d'entrée, porte de garage (sectionnelle, basculante) ; fenêtres 1 et 2 vantaux, oscillo-battante, fixe, œil-de-bœuf ; porte-fenêtre ; baie coulissante ; fenêtre de toit ; ouverture libre et arche.
  - Une seule « porte de garage » (pas de distinction sectionnelle / basculante) ; ajout de la porte à galandage double. Fenêtres de toit : posées sur un pan de toit (DES-17).
- DES-14 Glisser sur un mur (aimantée au mur, cotes jusqu'aux angles affichées), largeur, hauteur, allège, sens et côté d'ouverture inversables, volets, couleur de menuiserie ; refus si elle dépasse du mur ou en chevauche une autre.
  - **Menuiseries complètes (lot 15h)** : remplissage (plein, vitré, semi-vitré, cassettes), petits bois, matériau (PVC, bois, alu), imposte, volets roulants ou battants, coulissants en galandage (poche dans la cloison, 7,2 cm au moins) ou en applique ; vitrage clair seulement (choix du propriétaire) ; liste des menuiseries par modèle identique dans Chiffrer.
  - **Couleur des menuiseries (demande du propriétaire)** : nuancier (blanc, gris anthracite, noir, bois clair, bois naturel, chêne doré, bois foncé, vert sauge), couleur libre (nuancier du navigateur), « Appliquer à toutes les menuiseries » du niveau (`colorerMenuiseries`).

### 6.6 Escaliers
- DES-15 Droit, quart tournant bas / haut, deux quarts, hélicoïdal, échelle de meunier ; calcul automatique du nombre de marches et du giron ; alerte Blondel et hauteur d'échappée ; trémie au niveau supérieur ; garde-corps.

### 6.7 Mode toiture et combles
- DES-16 Générer la toiture depuis le contour des murs : deux pans, quatre pans, croupe, monopente, toit plat (acrotère), mansarde (brisis à 70°) ; pente, débord, orientation du faîtage, pignons.
  - **Fait en plus** : maisons en L, T, U, H découpées en ailes (noues, croupes et débords aux bouts libres, pans découpés sous le toit voisin) ; toit d'un niveau limité à la partie sans étage au-dessus, appentis adossé à l'étage ; hauteurs « au plus bas » (égout) et « au plus haut » (faîtage) ; un clic pose le toit sur toute la maison.
  - **Pas encore fait** : murs obliques (le découpage en ailes suit des angles droits).
- DES-17 Lucarnes (jacobine, capucine, chien-assis), fenêtres de toit inclinées comme le pan, cheminées, gouttières (calculées, comptées seulement à l'air libre) ; matériaux de couverture (tuiles, ardoise, zinc, bac acier, toiture végétalisée) ; surface de couverture au métré (toit plat chiffré en étanchéité) ; combles aménageables avec surface Carrez (≥ 1,80 m).

### 6.8 Mode extérieur : terrasse, terrain, piscine
- DES-18 Terrasse : posée en deux coins (rectangle), matériau, sens de pose, hauteur (marches générées côté jardin), garde-corps (poteaux métalliques, main courante à 1 m, verre clair, seulement sur les côtés libres), pergola. Une terrasse à moins de 60 cm d'une façade s'y colle, sans recouvrir la maison.
  - **Pas encore fait** : contour libre polygonal, plots.
- DES-19 Terrain : parcelle tracée, « autour de la maison » ou issue du cadastre (DES-35), orientation nord, allées, clôtures (bois, grillage, muret, haie, portail ; points alignés sur la limite à moins d'1 m), arbres, arbustes, haies (placement automatique hors de la maison).
  - **Pas encore fait** : gazon en tant que zone dessinée.
- DES-20 Piscine : rectangle, ronde, ovale, haricot, en L, couloir de nage, hors-sol, à débordement ; profondeurs (fond plat ou pente), escalier roman / droit / d'angle, margelles ; **volume d'eau** calculé ; distance aux limites affichée (indicatif, pas un avis juridique). Plage : bouton « Terrasse autour, jusqu'à la maison » (1,20 m autour ; piscine encastrée en 3D et déduite de la terrasse au métré).
  - **Pas encore fait** : liner, abri, local technique.

### 6.9 Aménager
- DES-21 Bibliothèque par univers (menu **Équiper**, environ 60 éléments en 11 univers) : cuisine, salle de bain, chambre, dressing, chambre d'enfant, bureau, séjour, luminaires et déco, électricité (prises, interrupteurs, points lumineux), plomberie et chauffage (radiateurs, chaudière, ballon), extérieur ; recherche plein texte sans accents.
  - **Pas encore fait** : filtres de dimensions.
- DES-22 Poser (clic sur l'élément puis sur le plan) et glisser, rotation (±15°, ±90°, touche R, poignée en 3D), dimensions réglables dans les plages du modèle, plaquer contre un mur, collisions signalées.
  - **Fait en plus (demandes du propriétaire)** : **placement automatique** (dos au mur, calé dans l'angle, bord à bord avec un voisin, guides orange ; Alt ou aimant coupé = pose libre) ; **rotation libre sur 3 axes** (`inclinaison`, curseurs au degré, « À plat »).
  - **Vrais modèles 3D** pour 35 meubles (canapé, fauteuils dont lounge, tables dont table basse ronde et table 4, chaises, tabourets, pouf, buffet, chevet, commode, armoire, bibliothèque, étagères, bureaux, cuisinière, lit 90, suspension, ventilateur, plantes, miroir, salon de jardin, table de pique-nique, chaise de jardin, jardinière, potager surélevé, foyer) ; les autres restent en volumes simples. La couleur de façade choisie dans l'inspecteur ne s'applique pas aux vrais modèles.
  - **Pas encore fait** : variantes et matériaux par slot ; hauteur de pose réglable (la hauteur du catalogue est appliquée) ; emprise 2D exacte des meubles inclinés (calculée sur le meuble droit) ; modèles 3D libres pour la cuisine, la salle de bains, les lits doubles…
- DES-23 **Mode cuisine** : modules bas, hauts, colonnes ; plan de travail continu au-dessus des meubles bas (débord 3 cm) ; électroménager ; triangle d'activité indicatif (3,60 à 7,90 m) ; postes « plan de travail » et « équipements » au métré.
  - **Pas encore fait** : crédence générée, fileurs, façades et poignées au choix, liste des modules à part.
- DES-24 Salle de bain : douche à l'italienne avec paroi, baignoire, vasque, WC, sèche-serviettes (selon le catalogue).
  - **Pas encore fait** : zones de sécurité électrique affichées en option.

### 6.10 Décorer
- DES-25 Peinture : nuancier, couleur libre, finitions mat / satin / brillant (champ `finition?`, visibles en 3D) ; par face de mur, plafond. Menuiseries : voir DES-14.
- DES-26 Papier peint, carrelage (format, joint largeur et couleur, pose droite / décalée / diagonale / chevron / point de Hongrie), parquet et stratifié (largeur de lame, pose droite / bâton rompu / point de Hongrie / chevron), parement, façade (enduit, bardage), sols extérieurs, couvertures ; motifs SVG en 2D (menu **Finitions**).
  - **Textures photo en 3D** pour 11 matériaux (chêne clair, chêne naturel, noyer, carrelage gris, tomette, faïence métro, béton ciré, travertin, brique, pierre de parement, enduit à la chaux) ; vignettes photo dans Finitions ; trois textures écartées car trompeuses.
  - **Pas encore fait** : motif, sens et raccord du papier peint ; textures photo des papiers peints, du stratifié gris, de l'ardoise et du carrelage blanc 60 × 60 (aucune texture libre convenable trouvée).
- DES-27 **Zones décoratives** : polygone sur une face de mur ou un sol (soubassement, crédence, tapis de carrelage) avec son propre revêtement.
- DES-28 Copier / coller le style (revêtements d'un élément vers un autre) ; appliquer à tous les murs de la pièce en un clic.

### 6.11 Outils transverses
- DES-29 Sélection simple, multiple (Maj + clic, rectangle à la souris, Ctrl + A), copier / coller (aussi vers un autre niveau) / dupliquer, supprimer, aligner et répartir, verrouiller un mur ou un meuble (`verrouille`), **verrouiller le plan** (`scene.verrouille`).
  - **Pas encore fait** : grouper.
- DES-30 Calques affichables : cotes, surfaces, mobilier, électricité, plomberie, annotations, plan importé ; **enregistrés avec la scène** ; tous affichés par défaut, électricité et plomberie comprises.
- DES-31 Cote libre et texte sur le plan (calque « annotations ») ; flèche du nord affichée dès que le plan a un nord ou un terrain ; cartouche dans le PDF (DES-41).
  - **Pas encore fait** : outil mesure, flèche libre, cartouche sur le plan à l'écran.

### 6.12 Vues
- DES-32 **Plan 2D** : style couleur ou **noir et blanc** pour l'imprimer (menu Rendu ; affichage seulement, rien d'enregistré), symboles normalisés (portes avec arc d'ouverture, double trait des fenêtres, coulissants), cotes des murs cliquables.
- DES-33 **3D** : orbite, zoom, panoramique ; vue maison entière, niveau isolé, coupe « maison de poupée » (murs avant abaissés selon l'angle de vue), toit masquable ; ombres selon l'heure et le nord. **La 3D ne sert qu'à voir** (décision du propriétaire, 21/11/2026) : aucun clic, glisser ni pose en 3D ; tout se modifie en 2D, et la sélection faite en 2D est montrée en 3D.
  - **Ajouté (demande du propriétaire)** : **murs transparents** (menu Rendu) : murs translucides (opacité 22 %) avec un contour net, meubles et pièces visibles au travers ; affichage seulement.
  - **Pas encore fait** : cartes d'ombre plus fines sur les grands terrains.
- DES-34 **Visite** : première personne à 1,60 m, **on traverse les murs** (décision du propriétaire, 21/11/2026), les meubles bloquent (pas les tapis), escaliers praticables ; clavier (flèches / ZQSD), glisser pour regarder, **joystick tactile** ; mini-plan avec position ; départ sur une place libre.
- DES-35 **Vue d'implantation** (plan de masse) : adresse saisie → adresses proposées (Géoplateforme IGN) → parcelle sous le point (API Carto cadastre), posée centrée sur la maison ; recalage aux flèches et rotation (le nord tourne avec la parcelle) ; photo aérienne et limites cadastrales (WMS Géoplateforme) téléchargées **une fois par le serveur** et enregistrées dans le dossier du plan ; cotes de la maison aux limites, flèche du nord ; photo au sol en 3D. France métropolitaine seulement (Lambert-93) ; distances indicatives. **Pas de MapLibre** ni de carte navigable (D87 modifiée). Aucune adresse enregistrée ni journalisée.
  - **Pas encore fait** : vérification contre les vrais services IGN (testé avec des réponses simulées ; à faire en préproduction).
- DES-36 **Façades et coupes** : élévations nord / sud / est / ouest selon le nord du plan, coupe verticale sur un trait tracé en deux clics (murs, toit et planchers tranchés en noir, repères d'altitude) ; le trait n'est pas enregistré.
- DES-37 **Vue photo** : cadrage (paysage, carré, portrait), ambiance (jour, soirée), rendu amélioré côté client (occlusion ambiante, vignette, tonalité) et export JPEG/PNG haute définition (2 400 px de large en paysage) ; galerie « Mes photos » du plan (JPEG vérifié par le serveur, 30 au plus). Pas de rendu serveur (D85 ✅, coût nul).

### 6.13 Historique et sauvegarde
- DES-38 Annuler / rétablir **300 étapes dans la session** (D94 : des heures de travail, sans risque pour la mémoire d'un téléphone) (Ctrl/Cmd+Z, Ctrl/Cmd+Maj+Z ou Ctrl+Y, boutons) ; un glisser = une seule étape ; l'historique couvre les revêtements et les calques (pas le zoom).
- DES-39 Enregistrement automatique 2 s après la dernière modification + indicateur ; bouton Enregistrer (version nommée). **Hors ligne** : le statut « Hors ligne » reste affiché, chaque modification est gardée sur l'appareil (IndexedDB), nouvel essai toutes les 30 s et au retour du réseau (corrigé en recette 15k).
- DES-40 Historique des versions (automatiques et nommées), aperçu, restauration sans rien écraser ; conflit entre onglets ou membres détecté, choix proposé (« Prendre la version enregistrée » ou « Garder la mienne »).

### 6.14 Export, partage, lien avec Portail Travaux
- DES-41 Export **PDF à l'échelle** produit par le serveur (1/50 ou 1/100, A4 ou A3 paysage ; murs, baies, débattements, pièces, cotes, nord, échelle graphique, cartouche, légende, métré en annexe ; refus clair si le plan ne tient pas, avec l'échelle et le format conseillés), PNG du plan, photos (galerie).
- DES-42 Lien de partage en lecture seule (plan, 3D, visite, façades), sans compte, révocable ; validité **7 jours, 30 jours, 90 jours ou 1 an** (toujours une date de fin ; « sans fin » a été retiré en recette) ; liste des liens actifs. Le serveur retire du partage les coordonnées Lambert-93, la photo aérienne, la référence cadastrale, la commune et l'image importée. Équipe : les plans de l'entreprise sont visibles par les membres autorisés, sans partage.
- DES-43 **Métré** (onglet « Chiffrer ») : métré de toute la maison, postes à cocher, CSV pour Excel ; le PDF du métré est l'annexe du PDF à l'échelle.
- DES-44 Particulier : **« Demander des devis »** (onglet Chiffrer) ouvre le simulateur existant. Le client **choisit** de joindre son plan (« Joindre mon plan ») et peut cocher **« Recevoir des devis par écrit, sans être appelé »**. Fait : champs `planJoint` et `contactSouhaite: 'ecrit_uniquement'` sur la demande (`DATABASE.md` §4) ; le plan est vérifié comme appartenant au particulier connecté ; le téléphone n'est jamais renvoyé aux artisans dans ce cas (D90) ; « Voir le plan du client » après acceptation (D93) ; prix **recalculés serveur** par le simulateur.
- DES-45 **Abandonné** le 18/11/2026 à la demande du propriétaire (« j'aime pas cette fonctionnalité »), jamais mis en ligne. Prévu : côté artisan, « Créer un devis depuis ce plan » préremplissait les lignes d'un devis depuis le métré. La page « Nouveau devis » et la bibliothèque de prestations sont inchangées ; l'artisan dispose du lien de partage et du plan joint par le client. Pas de test Playwright pour cet identifiant.

### 6.15 Mobile, accessibilité, performance
- DES-46 `MOBILE.md` : conçu à 390 px. Téléphone (moins de 900 px de large) : **les deux rails restent** ; les panneaux (menus et propriétés) s'ouvrent en **feuilles du bas** entre les rails (60 % de la hauteur au plus), repliés au départ, un seul ouvert à la fois, plan cadré au-dessus ; choisir un outil ou une vue replie le menu ; pincer pour zoomer ; appui long (0,5 s) = propriétés de l'élément ; saisie des cotes avec clavier décimal. 3D et visite au doigt (joystick). Zoom minimal 6 px/m pour voir une maison et son jardin.
  - Écart : pas de palette d'outils en barre basse (remplacée par le rail de droite, choix du propriétaire, §7).
  - **Pas encore fait** : tests sur Pixel et iPhone SE (seul l'iPhone 13 est émulé dans la configuration Playwright pro), tests sur vrais appareils.
- DES-47 Accessibilité : boutons avec libellé, focus visible, **raccourcis listés** (touche « ? », même liste dans le menu Aide), élément sélectionné et ses mesures annoncés (`aria-live`, `descriptionSelection`), déplacement aux flèches (1 cm, Maj = 10 cm), `prefers-reduced-motion` coupe l'inertie de la caméra 3D.
- DES-48 Performance mesurée (scène de 500 murs et 1 000 objets) : métré ≈ 1,5 ms, glisser d'un meuble avec placement ≈ 5 ms (cœur) ; ouverture du plan 345 à 490 ms (< 2 s), rendu après zoom ≈ 90 ms et glisser ≈ 32 ms par mouvement (Playwright sur ordinateur, temps de pilotage compris) ; modèles `glb` compressés (Meshopt).
  - **Pas encore fait** : instanciation et niveaux de détail en 3D, textures `ktx2`, mesure des 60 i/s sur un portable moyen.

---

## 7. Interface (décidée avec le propriétaire le 18/11/2026 ; la maquette reste la référence des couleurs et des composants)

- **Pleine page**, sans le cadre de l'espace (comme l'éditeur du site et les devis).
- **Barre d'une ligne** : « ← Mes plans », nom du projet modifiable, pastille d'enregistrement, sélecteur de niveau, annuler / rétablir, vues Plan · 3D · Visite · Façades (masquées sur téléphone, où elles sont dans le menu Rendu), Enregistrer.
- **Rail vertical à gauche** (icône + libellé) : Structure, Équiper, Finitions, Chiffrer, Rendu, et Aide en bas. Un clic ouvre le **panneau repliable** du menu, un second clic (ou « « ») le replie.
- **Rail vertical à droite** (icônes) : sélectionner, tracer un mur, dessiner une pièce · magnétisme, cotes, surfaces · zoom avant, pourcentage, zoom arrière, ajuster à l'écran · Propriétés en bas, qui ouvre ou replie l'**inspecteur**.
- **Aucun bouton horizontal posé sur le plan** : le plan occupe tout l'espace entre les panneaux, centré sur un papier pointillé et recadré à chaque ouverture ou fermeture de panneau. Seuls les messages (erreur, conflit) s'affichent au-dessus.
- **Téléphone** : mêmes rails, panneaux par-dessus le plan, repliés au départ (détail : DES-46).
- **Menu Rendu** : vue (Plan 2D, 3D, Visite, Photo, Façades sur téléphone), soleil, maison de poupée, niveau isolé, afficher le toit, **murs transparents**, **plan en noir et blanc**, galerie « Mes photos ».
- **Nouveau plan** : forme (rectangle, L, U, T), plan vide, modèles de départ (studio, T2, T3, plain-pied, maison à étage) et maison de démonstration en L.
- Écrans vides, erreurs, chargement, hors ligne : dessinés (guide « Bien démarrer », bandeaux au-dessus du plan).

---

## 8. Sécurité, coûts, RGPD

- Toutes les opérations passent par `action()` dans `/api/dessin/[operation]` : schéma, `peut()` (relu en base côté entreprise), limite de débit, idempotence des créations et duplications (`cleIdempotence`).
- Limites de débit réelles, par client (identifiant de l'enveloppe `action()`) et par heure : 600 opérations au total (`dessin`) ; en plus, PDF 30, parcelle 20, adresses 120, fichiers (plan importé, photos) 30.
- Le contenu des plans est privé ; Storage est fermé aux clients (accès par le serveur seulement) ; les liens partagés ne révèlent ni nom ni localisation (coordonnées, photo aérienne, référence cadastrale, commune et image importée retirées) ; aucune donnée personnelle dans les URL (le jeton est opaque, stocké en empreinte SHA-256, masqué dans Sentry).
- Fichiers envoyés : image ou PDF importé (PDF 4 Mo au plus dans le navigateur, image 3 Mo au plus côté serveur), photos JPEG 3 Mo au plus ; type vérifié par la signature du fichier.
- `COUTS.md` §Plans : pas de rendu serveur ni d'appel payant ; aperçu de « Mes plans » en SVG (aucune image générée) ; versions élaguées ; photo aérienne téléchargée une seule fois par plan.
- Quotas (D84, dans le code) : particulier **5 plans actifs** (`QUOTA_PLANS_PARTICULIER`), artisan illimité ; scène compressée **5 Mo** au plus (`TAILLE_MAX_SCENE`) ; 30 photos par plan.

---

## 9. Décisions à trancher (reportées dans `DECISIONS.md`)

Tranchées le 18/11/2026 : D84 gratuit · D85 aucun rendu serveur · D87 données publiques IGN / cadastre · D88 CC0 puis catalogue maison · D90 plan joint et « devis par écrit sans appel » au choix du client.
Puis : D86 pile technique (§5 bis) · D89 pas de temps réel en v1 · D90 téléphone jamais montré aux artisans si « par écrit » · D91 import image et PDF en v1 · D92 plans d'une entreprise fermée supprimés 30 jours après · D93 plan joint retiré par le client · D94 historique de 300 étapes. **Plus aucune ligne ⏳ pour Dessin.**

Écarts entre ces décisions et le code (validés par le propriétaire, voir AVANCEMENT §31) :
- D86 : `zustand`, `immer`, `comlink`, `idb-keyval`, `clipper2-ts` et `maplibre-gl` non ajoutés (§5 bis).
- D87 : pas de MapLibre ; services IGN appelés par le serveur, photo aérienne enregistrée dans le dossier du plan.
- D88 : réalisé en partie (40 meubles et 11 textures CC0) ; catalogue maison pas encore fait.
- D89 : pas de temps réel ; conflit proposé à l'utilisateur (conforme).

---

## 10. Prompts Claude Code (un lot par session, plan d'abord)

> **Historique** : ces prompts sont ceux du départ, gardés tels quels pour mémoire. Plusieurs points ont changé en cours de route (routes `/pro/plans` et `/mes-plans`, pas de MapLibre, DES-45 abandonné, dépendances non ajoutées, pas de seed des plans, tests Pixel non faits) : l'état réel est décrit aux §1 à §8 et dans AVANCEMENT §31.
>
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
[Note : « Créer un devis depuis ce plan » (DES-45) a été abandonné à la demande du propriétaire.]
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

## 11. Branchements sur l'existant (chacun fait avec l'accord du propriétaire)

Tout le reste de Dessin vit dans de nouveaux fichiers (`packages/core/src/dessin/`, `packages/core/src/schemas/dessin*.ts`, `packages/firebase/src/serveur/dessin`, `apps/web/features/dessin/`, `apps/web/app/…/plans`, `…/mes-plans`, `…/dessin`, `/plan/[jeton]`, `/api/dessin`, `apps/functions/src/dessin`). Points qui ont touché un fichier existant :

| Branchement | Fichier existant concerné | Sous-lot | État |
|---|---|---|---|
| Export du sous-chemin `@ph/core/dessin` | `packages/core/package.json` | 15b | fait |
| Chemins des plans, index de purge, règles de lecture | `firestore.rules` (2 blocs de lecture), `firestore.indexes.json`, `packages/firebase/src/chemins.ts` ; `storage.rules` **non modifié** (refus par défaut suffit) | 15c | fait |
| Export `@ph/firebase/dessin` et Function `purgeDessinNuit` | `packages/firebase/package.json`, `apps/functions/src/index.ts` | 15c | fait |
| Permission d'équipe `dessin.gerer` | `packages/core/src/equipe/permissions.ts` | 15c | fait |
| Export RGPD et suppression de compte incluant les plans | fonctions RGPD existantes | 15c | fait |
| Flags `dessin` et `dessinPublic` | `packages/core/src/flags.ts` | 15d | fait |
| Lien « Plans » dans la barre latérale pro | menu pro (option de `menuPro`), adresses et icône | 15d | fait |
| Onglet « Mes plans » de l'espace particulier | onglets de l'espace (prop `avecPlans`) | 15d | fait |
| Tokens de couleur de Dessin | `@ph/ui/tokens` | 15d, 15f | fait |
| Nouvelles dépendances | `apps/web/package.json`, `package.json` (racine) | 15e, 15g, 15k | fait (§5) |
| Plan joint et « devis par écrit sans appel » | schéma et création des demandes, affichage côté artisan | 15i | fait |
| Plans d'une entreprise fermée à la corbeille | fermeture d'entreprise | 15k | fait (D92) |
| CSP : `blob:` dans `connect-src` | en-têtes de sécurité | 15k | fait |
| Sitemap : `/dessin` seulement si Plans et sa page publique sont ouverts | `apps/web/app/sitemap.ts` | 15j | fait |
| `/dessin` en `revalidate = 3600` | `apps/web/app/(particuliers)/dessin/page.tsx` | à l'ouverture | **pas encore fait** (page dynamique tant que le flag est éteint) |
