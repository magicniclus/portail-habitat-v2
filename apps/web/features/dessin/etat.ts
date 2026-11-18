import {
  annuler,
  appliquerRevetement,
  deplacerMur,
  modifierLongueurMur,
  renommerPiece,
  retablir,
  terminerGeste,
} from '@ph/core/dessin';
import {
  contexteNavigateur as ctx,
  etatInitial,
  surNiveau,
  ZOOM_MAX,
  ZOOM_MIN,
  type Action,
  type EtatEditeur,
} from './etatBase';
import { reduireAmenagement } from './etatAmenagement';
import { reduireStructure } from './etatStructure';

export * from './etatBase';

/** Réducteur de l'éditeur : actions de base ici, structure (ouvertures, niveaux…) à part. */
export function reduire(e: EtatEditeur, a: Action): EtatEditeur {
  switch (a.type) {
    case 'outil':
      return {
        ...e,
        outil: a.outil,
        typeMur: a.typeMur ?? e.typeMur,
        typeOuverture: a.typeOuverture ?? e.typeOuverture,
        typeEscalier: a.typeEscalier ?? e.typeEscalier,
        catalogueId: a.catalogueId ?? e.catalogueId,
        trace: null,
        echelle: null,
        erreur: null,
      };
    case 'terminerTrace':
      return { ...e, trace: null, echelle: null };
    case 'selectionner':
      return {
        ...e,
        selection: a.selection,
        trace: null,
        proprietes: e.proprietes || a.selection !== null,
      };
    case 'modifierLongueur':
      return surNiveau(e, (n) => modifierLongueurMur(n, a.murId, a.longueur, ctx));
    case 'deplacerMur':
      return surNiveau(e, (n) => deplacerMur(n, a.murId, a.delta, ctx), a.geste ?? null);
    case 'deplacerClavier':
      if (e.selection?.genre === 'objet')
        return (
          reduireAmenagement(e, {
            type: 'deplacerObjetDe',
            id: e.selection.id,
            delta: a.delta,
            geste: 'clavier',
          }) ?? e
        );
      if (e.selection?.genre !== 'mur') return e;
      return surNiveau(e, (n) => deplacerMur(n, e.selection!.id, a.delta, ctx));
    case 'finGeste':
      return { ...e, historique: terminerGeste(e.historique), guides: [] };
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
    case 'menu': {
      const menu = a.basculer !== false && a.menu === e.menu ? null : a.menu;
      return { ...e, menu, metreVu: e.metreVu || menu === 'chiffrer' };
    }
    case 'proprietes':
      return { ...e, proprietes: a.ouvert ?? !e.proprietes };
    case 'remplacerScene':
      return {
        ...etatInitial(a.scene),
        niveauId: a.scene.niveaux.some((n) => n.id === e.niveauId)
          ? e.niveauId
          : a.scene.niveaux[0]!.id,
        zoom: e.zoom,
        menu: e.menu,
        proprietes: e.proprietes,
        metreVu: e.metreVu,
        ajustement: e.ajustement,
      };
    case 'effacerErreur':
      return { ...e, erreur: null };
    default:
      return reduireStructure(e, a) ?? reduireAmenagement(e, a) ?? e;
  }
}
