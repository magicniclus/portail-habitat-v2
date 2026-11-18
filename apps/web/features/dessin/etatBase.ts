import {
  creerHistorique,
  enregistrer,
  type CibleRevetement,
  type Contexte,
  type HistoriqueDessin,
  type ModificationEscalier,
  type ModificationObjet,
  type ModificationOuverture,
  type Niveau,
  type Point,
  type Revetement,
  type Scene,
  type TypeEscalier,
  type TypeMur,
  type TypeNiveau,
  type TypeOuverture,
} from '@ph/core/dessin';
import type { Resultat } from '@ph/core/resultat';

/** État de l'éditeur Dessin (DESSIN.md §7) : scène + historique, outil, sélection, affichage. */
export type Outil =
  'selection' | 'mur' | 'piece' | 'ouverture' | 'escalier' | 'echelle' | 'objet' | 'zone';
type GenreSelection = 'mur' | 'piece' | 'ouverture' | 'escalier' | 'objet' | 'zone';
type Selection = { genre: GenreSelection; id: string } | null;
/** Menus du rail vertical de gauche ; chacun ouvre un panneau repliable. */
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
  /** Style copié (DES-28), collé sur une autre pièce, un mur ou une zone. */
  pressePapier: Revetement | null;
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
  calques: { cotes: boolean; surfaces: boolean };
  /** Panneau ouvert à gauche, `null` = replié. */
  menu: Menu | null;
  /** Panneau des propriétés (droite) déplié. */
  proprietes: boolean;
  /** Le métré a été consulté (guide « Bien démarrer »). */
  metreVu: boolean;
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
    }
  | { type: 'poserPoint'; point: Point }
  | { type: 'terminerTrace' }
  | { type: 'selectionner'; selection: Selection }
  | { type: 'modifierLongueur'; murId: string; longueur: number }
  | { type: 'deplacerMur'; murId: string; delta: Point; geste?: string }
  | { type: 'finGeste' }
  /** Flèches du clavier : déplace le mur sélectionné (DES-47). */
  | { type: 'deplacerClavier'; delta: Point }
  | { type: 'supprimerSelection' }
  | { type: 'renommerPiece'; pieceId: string; nom: string }
  | { type: 'revetement'; cible: CibleRevetement; revetement: Revetement }
  | { type: 'modifierOuverture'; id: string; modif: ModificationOuverture }
  | { type: 'modifierEscalier'; id: string; modif: ModificationEscalier }
  | { type: 'deplacerObjetDe'; id: string; delta: Point; geste?: string }
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
  | { type: 'poserFond'; storagePath: string }
  | { type: 'reglerFond'; opacite: number }
  | { type: 'retirerFond' }
  | { type: 'mettreAEchelle'; distance: number }
  | { type: 'annuler' }
  | { type: 'retablir' }
  | { type: 'zoom'; zoom: number }
  | { type: 'ajuster' }
  | { type: 'aimant' }
  | { type: 'calque'; cle: keyof EtatEditeur['calques'] }
  /** Ouvre un menu, ou le replie s'il est déjà ouvert ; `null` replie. */
  | { type: 'menu'; menu: Menu | null; basculer?: boolean }
  | { type: 'proprietes'; ouvert?: boolean }
  | { type: 'remplacerScene'; scene: Scene }
  | { type: 'effacerErreur' };

export const ZOOM_MIN = 15;
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
    pressePapier: null,
    trace: null,
    echelle: null,
    selection: null,
    zoom: ZOOM_DEFAUT,
    ajustement: 1,
    aimant: true,
    calques: { cotes: true, surfaces: true },
    menu: 'structure',
    proprietes: true,
    metreVu: false,
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
