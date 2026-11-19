import {
  creerHistorique,
  enregistrer,
  type Alignement,
  type CalqueScene,
  type Copie,
  type Element,
  type CibleRevetement,
  type ElementToit,
  type FormePiscine,
  type GenreExterieur,
  type ModificationToiture,
  type TypeToiture,
  type Guide,
  type Contexte,
  type HistoriqueDessin,
  type ModificationEscalier,
  type ModificationObjet,
  type ModificationOuverture,
  type Niveau,
  type CoteVue,
  type ModificationMur,
  type ParcelleCadastre,
  type Piece,
  type Point,
  type Revetement,
  type Scene,
  type TypeEscalier,
  type TypeMur,
  type TypeNiveau,
  type TypeOuverture,
  type TypeCloture,
} from '@ph/core/dessin';
import type { Resultat } from '@ph/core/resultat';

/** État de l'éditeur Dessin (DESSIN.md §7) : scène + historique, outil, sélection, affichage. */
export type Outil =
  | 'selection'
  | 'mur'
  | 'piece'
  | 'ouverture'
  | 'escalier'
  | 'echelle'
  | 'objet'
  | 'zone'
  | 'toit'
  | 'exterieur'
  | 'coupe'
  | 'cote'
  | 'texte'
  | 'pieceLibre';
type GenreSelection =
  | 'mur'
  | 'piece'
  | 'ouverture'
  | 'escalier'
  | 'objet'
  | 'zone'
  | 'terrasse'
  | 'piscine'
  | 'cloture'
  | 'vegetal'
  | 'cote'
  | 'texte';
/** Éléments posés avec l'outil « extérieur » (DES-18 à DES-20). */
export type ElementExterieur =
  'terrasse' | 'allee' | 'piscine' | 'cloture' | 'arbre' | 'arbuste' | 'haie' | 'parcelle';
type Selection = { genre: GenreSelection; id: string } | null;
/** Menus du rail vertical de gauche ; chacun ouvre un panneau repliable. */
export type Vue = 'plan' | '3d' | 'visite' | 'photo' | 'facades';
/** Façade affichée (DES-36), ou la coupe tracée sur le plan. */
export type Facade = CoteVue | 'coupe';

export interface ReglagesRendu {
  /** Heure du soleil (6 à 20). */
  heure: number;
  /** Murs avant abaissés selon l'angle de vue. */
  poupee: boolean;
  /** Seulement le niveau courant (sinon la maison jusqu'à ce niveau). */
  niveauSeul: boolean;
  /** Toit affiché en 3D (masqué en maison de poupée). */
  toit: boolean;
  /** Vue photo (DES-37). */
  cadrage: 'paysage' | 'carre' | 'portrait';
  ambiance: 'jour' | 'soiree';
  format: 'image/jpeg' | 'image/png';
}

export type Menu = 'structure' | 'equiper' | 'finitions' | 'chiffrer' | 'rendu' | 'aide';

export interface EtatEditeur {
  historique: HistoriqueDessin<Scene>;
  niveauId: string;
  outil: Outil;
  typeMur: TypeMur;
  typeOuverture: TypeOuverture;
  typeEscalier: TypeEscalier;
  /** Objet du catalogue à poser avec l'outil « objet ». */
  catalogueId: string;
  /** Élément posé sur le toit avec l'outil « toit ». */
  elementToit: ElementToit;
  elementExterieur: ElementExterieur;
  formePiscine: FormePiscine;
  typeCloture: TypeCloture;
  /** Clôture en cours de tracé : les clics suivants y ajoutent un point. */
  clotureEnCours: string | null;
  /** Style copié (DES-28), collé sur une autre pièce, un mur ou une zone. */
  pressePapier: Revetement | null;
  /** Points de la pièce libre en cours de tracé (DES-12). */
  polygone: Point[];
  /** Premier point du segment, de la pièce ou de la mesure d'échelle en cours. */
  trace: Point | null;
  /** Deux points de la mise à l'échelle, en attente de la distance réelle. */
  echelle: { a: Point; b: Point } | null;
  selection: Selection;
  /** Pixels par mètre. */
  zoom: number;
  /** Incrémenté pour demander au plan de s'ajuster à l'écran (à l'ouverture, bouton). */
  ajustement: number;
  aimant: boolean;
  vue: Vue;
  facade: Facade;
  /** Trait de coupe tracé sur le plan (non enregistré). */
  coupe: { a: Point; b: Point } | null;
  rendu: ReglagesRendu;
  /** Incrémenté à chaque photo ajoutée : la galerie se recharge. */
  revisionPhotos: number;
  /** Guides du placement automatique pendant un glisser. */
  guides: Guide[];
  /** Affichage du plan 2D ; `noirEtBlanc` : style imprimable (DES-32), non enregistré. */
  calques: { cotes: boolean; surfaces: boolean; noirEtBlanc: boolean };
  /** Sélection multiple (DES-29), deux éléments ou plus ; vide sinon. */
  multi: Element[];
  /** Éléments copiés (Ctrl + C), collables sur n'importe quel niveau. */
  copie: Copie | null;
  /** Panneau ouvert à gauche, `null` = replié. */
  menu: Menu | null;
  /** Panneau des propriétés (droite) déplié. */
  proprietes: boolean;
  /** Le métré a été consulté (guide « Bien démarrer »). */
  metreVu: boolean;
  /** Postes du métré décochés (clés), exclus des exports et du devis. */
  metreExclus: string[];
  erreur: string | null;
}

export type Action =
  | {
      type: 'outil';
      outil: Outil;
      typeMur?: TypeMur;
      typeOuverture?: TypeOuverture;
      typeEscalier?: TypeEscalier;
      catalogueId?: string;
      elementToit?: ElementToit;
      elementExterieur?: ElementExterieur;
      formePiscine?: FormePiscine;
      typeCloture?: TypeCloture;
    }
  | { type: 'poserPoint'; point: Point }
  | { type: 'toiture'; toiture: TypeToiture | null }
  /** Toit sur toute la maison : chaque niveau, sur la partie sans étage au-dessus. */
  | { type: 'toitureAuto'; toiture: TypeToiture }
  | { type: 'hauteursToit'; egout?: number; faitage?: number }
  | { type: 'modifierToiture'; modif: ModificationToiture }
  | { type: 'retirerElementToit'; id: string }
  | {
      type: 'modifierExterieur';
      genre: 'terrasse' | 'piscine' | 'cloture' | 'vegetal';
      id: string;
      modif: Record<string, unknown>;
    }
  | { type: 'supprimerExterieur'; genre: GenreExterieur; id: string }
  | { type: 'parcelleAutour' }
  | { type: 'implanter'; parcelle: ParcelleCadastre }
  | { type: 'ajusterImplantation'; decalage?: Point; rotation?: number }
  | { type: 'terrasseAutour'; piscineId: string }
  | { type: 'terminerTrace' }
  /** `ajouter` (Maj + clic) : ajoute l'élément à la sélection, ou l'en retire (DES-29). */
  | { type: 'selectionner'; selection: Selection; ajouter?: boolean }
  | { type: 'selectionnerZone'; a: Point; b: Point }
  | { type: 'toutSelectionner' }
  | { type: 'copier' }
  | { type: 'coller' }
  | { type: 'dupliquerSelection' }
  | { type: 'alignerSelection'; bord: Alignement }
  | { type: 'repartirSelection'; axe: 'x' | 'y' }
  | { type: 'verrouillerSelection'; valeur: boolean }
  | { type: 'verrouillerPlan'; valeur: boolean }
  | { type: 'modifierLongueur'; murId: string; longueur: number }
  /** Réglages d'un mur (DES-07) ; couper au milieu, fusionner avec le voisin (DES-09). */
  | { type: 'modifierMur'; murId: string; modif: ModificationMur }
  | { type: 'couperMur'; murId: string }
  | { type: 'deplacerExtremite'; murId: string; extremite: 'a' | 'b'; vers: Point; geste?: string }
  | { type: 'fusionnerMur'; murId: string; avec: string }
  | { type: 'deplacerMur'; murId: string; delta: Point; geste?: string }
  | { type: 'finGeste' }
  /** Flèches du clavier : déplace le mur sélectionné (DES-47). */
  | { type: 'deplacerClavier'; delta: Point }
  /** `confirme` : suppression d'un mur porteur acceptée après avertissement. */
  | { type: 'supprimerSelection'; confirme?: boolean }
  | { type: 'renommerPiece'; pieceId: string; nom: string }
  | { type: 'typerPiece'; pieceId: string; typePiece: Piece['type'] }
  | { type: 'revetement'; cible: CibleRevetement; revetement: Revetement }
  | { type: 'modifierOuverture'; id: string; modif: ModificationOuverture }
  | { type: 'modifierEscalier'; id: string; modif: ModificationEscalier }
  | { type: 'deplacerObjetDe'; id: string; delta: Point; geste?: string }
  /** Glisser à la souris : centre voulu, placé automatiquement sauf aimant coupé ou Alt. */
  | { type: 'deplacerObjetVers'; id: string; vers: Point; geste?: string; libre?: boolean }
  | {
      type: 'orienterObjet';
      id: string;
      angles: { rotation?: number; x?: number; y?: number };
      geste?: string;
    }
  | { type: 'tournerObjet'; id: string; angle: number }
  /** Touche R : quart de tour de l'objet choisi. */
  | { type: 'tournerSelection' }
  | { type: 'modifierObjet'; id: string; modif: ModificationObjet }
  | { type: 'dupliquerObjet'; id: string }
  | { type: 'revetirMurs'; pieceId: string; revetement: Revetement }
  | { type: 'revetirZone'; id: string; revetement: Revetement }
  | { type: 'copierStyle'; revetement: Revetement }
  | { type: 'collerStyle' }
  | { type: 'changerNiveau'; niveauId: string }
  | { type: 'ajouterNiveau'; niveau: TypeNiveau; copierMurs: boolean }
  | { type: 'renommerNiveau'; niveauId: string; nom: string }
  | { type: 'supprimerNiveau'; niveauId: string }
  | {
      type: 'reglerNiveau';
      niveauId: string;
      reglages: { hauteurSousPlafond?: number; epaisseurPlancher?: number };
    }
  | { type: 'deplacerNiveau'; niveauId: string; sens: 1 | -1 }
  | { type: 'poserFond'; storagePath: string }
  | { type: 'reglerFond'; opacite: number }
  | { type: 'retirerFond' }
  | { type: 'mettreAEchelle'; distance: number }
  | { type: 'annuler' }
  | { type: 'retablir' }
  | { type: 'zoom'; zoom: number }
  | { type: 'ajuster' }
  | { type: 'aimant' }
  | { type: 'vue'; vue: Vue }
  | { type: 'rendu'; reglages: Partial<ReglagesRendu> }
  | { type: 'photoAjoutee' }
  | { type: 'calque'; cle: keyof EtatEditeur['calques'] }
  /** Ouvre un menu, ou le replie s'il est déjà ouvert ; `null` replie. */
  | { type: 'menu'; menu: Menu | null; basculer?: boolean }
  | { type: 'proprietes'; ouvert?: boolean }
  | { type: 'remplacerScene'; scene: Scene }
  | { type: 'facade'; facade: Facade }
  | { type: 'basculerPoste'; cle: string }
  /** Cotes libres et textes (DES-31), calques du plan enregistrés (DES-30). */
  | { type: 'modifierTexte'; id: string; modif: { contenu?: string; taille?: number } }
  | { type: 'calqueScene'; cle: CalqueScene }
  | { type: 'effacerErreur' };

/** Assez bas pour voir une maison et tout son jardin sur un téléphone (≈ 40 m de large). */
export const ZOOM_MIN = 6;
export const ZOOM_MAX = 200;
export const ZOOM_DEFAUT = 50;

/** Identifiants d'éléments : préfixe + 10 caractères aléatoires (schéma : 4 à 24). */
export const contexteNavigateur: Contexte = {
  nouvelId: (prefixe) => `${prefixe}_${crypto.randomUUID().replaceAll('-', '').slice(0, 10)}`,
};

export function etatInitial(scene: Scene): EtatEditeur {
  return {
    historique: creerHistorique(scene),
    niveauId: scene.niveaux[0]!.id,
    outil: 'selection',
    typeMur: 'mur',
    typeOuverture: 'porte',
    typeEscalier: 'droit',
    catalogueId: 'canape-3',
    elementToit: 'fenetre',
    elementExterieur: 'terrasse',
    formePiscine: 'rectangle',
    typeCloture: 'bois',
    clotureEnCours: null,
    pressePapier: null,
    polygone: [],
    trace: null,
    echelle: null,
    selection: null,
    zoom: ZOOM_DEFAUT,
    ajustement: 1,
    aimant: true,
    vue: 'plan',
    facade: 'sud',
    coupe: null,
    rendu: {
      heure: 15,
      poupee: true,
      niveauSeul: false,
      toit: true,
      cadrage: 'paysage',
      ambiance: 'jour',
      format: 'image/jpeg',
    },
    revisionPhotos: 0,
    guides: [],
    calques: { cotes: true, surfaces: true, noirEtBlanc: false },
    multi: [],
    copie: null,
    menu: 'structure',
    proprietes: true,
    metreVu: false,
    metreExclus: [],
    erreur: null,
  };
}

export const sceneDe = (e: EtatEditeur) => e.historique.present;
export const niveauDe = (e: EtatEditeur): Niveau =>
  sceneDe(e).niveaux.find((n) => n.id === e.niveauId) ?? sceneDe(e).niveaux[0]!;

/** Applique une commande pure à toute la scène ; une erreur s'affiche sans rien modifier. */
export function surScene(
  e: EtatEditeur,
  commande: (s: Scene) => Resultat<Scene>,
  geste: string | null = null,
): EtatEditeur {
  const r = commande(sceneDe(e));
  if (!r.ok) return { ...e, erreur: r.message };
  return { ...e, historique: enregistrer(e.historique, r.data, geste), erreur: null };
}

/** Applique une commande pure au niveau courant. */
export const surNiveau = (
  e: EtatEditeur,
  commande: (n: Niveau) => Resultat<Niveau>,
  geste: string | null = null,
): EtatEditeur =>
  surScene(
    e,
    (s) => {
      const r = commande(niveauDe(e));
      return r.ok
        ? {
            ok: true,
            data: { ...s, niveaux: s.niveaux.map((n) => (n.id === r.data.id ? r.data : n)) },
          }
        : r;
    },
    geste,
  );
