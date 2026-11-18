import {
  ajouterMur,
  annuler,
  appliquerRevetement,
  creerHistorique,
  deplacerMur,
  enregistrer,
  modifierLongueurMur,
  renommerPiece,
  retablir,
  supprimerMur,
  terminerGeste,
  type CibleRevetement,
  type Contexte,
  type HistoriqueDessin,
  type Niveau,
  type Point,
  type Revetement,
  type Scene,
  type TypeMur,
} from '@ph/core/dessin';
import type { Resultat } from '@ph/core/resultat';

/** État de l'éditeur Dessin (DESSIN.md §7) : scène + historique, outil, sélection, affichage. */
export type Outil = 'selection' | 'mur' | 'piece';
type Selection = { genre: 'mur' | 'piece'; id: string } | null;
export type OngletBibliotheque = 'structure' | 'equiper' | 'finitions' | 'chiffrer' | 'rendu';

export interface EtatEditeur {
  historique: HistoriqueDessin<Scene>;
  niveauId: string;
  outil: Outil;
  typeMur: TypeMur;
  /** Premier point du segment ou de la pièce en cours de tracé. */
  trace: Point | null;
  selection: Selection;
  /** Pixels par mètre. */
  zoom: number;
  /** Incrémenté pour demander au plan de s'ajuster à l'écran (à l'ouverture, bouton). */
  ajustement: number;
  aimant: boolean;
  calques: { cotes: boolean; surfaces: boolean };
  onglet: OngletBibliotheque;
  erreur: string | null;
}

export type Action =
  | { type: 'outil'; outil: Outil; typeMur?: TypeMur }
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
  | { type: 'annuler' }
  | { type: 'retablir' }
  | { type: 'zoom'; zoom: number }
  | { type: 'ajuster' }
  | { type: 'aimant' }
  | { type: 'calque'; cle: keyof EtatEditeur['calques'] }
  | { type: 'onglet'; onglet: OngletBibliotheque }
  | { type: 'remplacerScene'; scene: Scene }
  | { type: 'effacerErreur' };

const ZOOM_MIN = 15;
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
    trace: null,
    selection: null,
    zoom: ZOOM_DEFAUT,
    ajustement: 1,
    aimant: true,
    calques: { cotes: true, surfaces: true },
    onglet: 'structure',
    erreur: null,
  };
}

export const sceneDe = (e: EtatEditeur) => e.historique.present;
export const niveauDe = (e: EtatEditeur): Niveau =>
  sceneDe(e).niveaux.find((n) => n.id === e.niveauId) ?? sceneDe(e).niveaux[0]!;

/** Applique une commande pure au niveau courant ; une erreur s'affiche sans rien modifier. */
function surNiveau(
  e: EtatEditeur,
  commande: (n: Niveau) => Resultat<Niveau>,
  geste: string | null = null,
): EtatEditeur {
  const r = commande(niveauDe(e));
  if (!r.ok) return { ...e, erreur: r.message };
  const scene = sceneDe(e);
  const suivante: Scene = {
    ...scene,
    niveaux: scene.niveaux.map((n) => (n.id === r.data.id ? r.data : n)),
  };
  return { ...e, historique: enregistrer(e.historique, suivante, geste), erreur: null };
}

const ctx = contexteNavigateur;

function poserPoint(e: EtatEditeur, point: Point): EtatEditeur {
  if (e.outil === 'selection') return e;
  if (!e.trace) return { ...e, trace: point, selection: null };
  if (e.outil === 'mur') {
    const suite = surNiveau(e, (n) =>
      ajouterMur(n, { a: e.trace!, b: point, type: e.typeMur }, ctx),
    );
    // Le tracé continue depuis le dernier point (DES-06) ; refusé : on reste au même endroit.
    return suite.erreur ? { ...suite, trace: e.trace } : { ...suite, trace: point };
  }
  // Pièce rectangulaire d'un geste (DES-12) : deux coins opposés, quatre murs.
  const a = e.trace;
  const coins = [a, { x: point.x, y: a.y }, point, { x: a.x, y: point.y }];
  if (a.x === point.x || a.y === point.y)
    return { ...e, erreur: 'Tracez un rectangle : les deux coins doivent être opposés.' };
  const suite = surNiveau(e, (n) => {
    let courant: Resultat<Niveau> = { ok: true, data: n };
    for (let i = 0; i < 4 && courant.ok; i++)
      courant = ajouterMur(
        courant.data,
        { a: coins[i]!, b: coins[(i + 1) % 4]!, type: 'mur' },
        ctx,
      );
    return courant;
  });
  return { ...suite, trace: null };
}

export function reduire(e: EtatEditeur, a: Action): EtatEditeur {
  switch (a.type) {
    case 'outil':
      return { ...e, outil: a.outil, typeMur: a.typeMur ?? e.typeMur, trace: null, erreur: null };
    case 'poserPoint':
      return poserPoint(e, a.point);
    case 'terminerTrace':
      return { ...e, trace: null };
    case 'selectionner':
      return { ...e, selection: a.selection, trace: null };
    case 'modifierLongueur':
      return surNiveau(e, (n) => modifierLongueurMur(n, a.murId, a.longueur, ctx));
    case 'deplacerMur':
      return surNiveau(e, (n) => deplacerMur(n, a.murId, a.delta, ctx), a.geste ?? null);
    case 'deplacerClavier':
      if (e.selection?.genre !== 'mur') return e;
      return surNiveau(e, (n) => deplacerMur(n, e.selection!.id, a.delta, ctx));
    case 'finGeste':
      return { ...e, historique: terminerGeste(e.historique) };
    case 'supprimerSelection':
      if (e.selection?.genre !== 'mur') return e;
      return { ...surNiveau(e, (n) => supprimerMur(n, e.selection!.id, ctx)), selection: null };
    case 'renommerPiece':
      return surNiveau(e, (n) => renommerPiece(n, a.pieceId, a.nom));
    case 'revetement':
      return surNiveau(e, (n) => appliquerRevetement(n, a.cible, a.revetement));
    case 'annuler':
      return { ...e, historique: annuler(e.historique), trace: null, selection: null };
    case 'retablir':
      return { ...e, historique: retablir(e.historique), trace: null, selection: null };
    case 'ajuster':
      return { ...e, ajustement: e.ajustement + 1 };
    case 'zoom':
      return { ...e, zoom: Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(a.zoom))) };
    case 'aimant':
      return { ...e, aimant: !e.aimant };
    case 'calque':
      return { ...e, calques: { ...e.calques, [a.cle]: !e.calques[a.cle] } };
    case 'onglet':
      return { ...e, onglet: a.onglet };
    case 'remplacerScene':
      return { ...etatInitial(a.scene), zoom: e.zoom, onglet: e.onglet, ajustement: e.ajustement };
    case 'effacerErreur':
      return { ...e, erreur: null };
  }
}
