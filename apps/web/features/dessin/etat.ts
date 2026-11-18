import {
  annuler,
  appliquerRevetement,
  couperMurAuMilieu,
  deplacerExtremite,
  deplacerMur,
  fusionnerMurs,
  modifierMur,
  modifierLongueurMur,
  renommerPiece,
  typerPiece,
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
import { reduireExterieur } from './etatExterieur';
import { reduireFacades } from './etatFacades';
import { reduireToiture } from './etatToiture';

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
        elementToit: a.elementToit ?? e.elementToit,
        elementExterieur: a.elementExterieur ?? e.elementExterieur,
        formePiscine: a.formePiscine ?? e.formePiscine,
        typeCloture: a.typeCloture ?? e.typeCloture,
        clotureEnCours: null,
        trace: null,
        echelle: null,
        erreur: null,
      };
    case 'terminerTrace':
      return { ...e, trace: null, echelle: null, clotureEnCours: null };
    case 'selectionner':
      return {
        ...e,
        selection: a.selection,
        trace: null,
        proprietes: e.proprietes || a.selection !== null,
      };
    case 'modifierLongueur':
      return surNiveau(e, (n) => modifierLongueurMur(n, a.murId, a.longueur, ctx));
    case 'modifierMur':
      return surNiveau(e, (n) => modifierMur(n, a.murId, a.modif, ctx));
    case 'deplacerExtremite':
      return surNiveau(
        e,
        (n) => deplacerExtremite(n, a.murId, a.extremite, a.vers, ctx),
        a.geste ?? null,
      );
    case 'couperMur':
      return surNiveau(e, (n) => couperMurAuMilieu(n, a.murId, ctx));
    case 'fusionnerMur':
      return { ...surNiveau(e, (n) => fusionnerMurs(n, a.murId, a.avec, ctx)), selection: null };
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
    case 'typerPiece':
      return surNiveau(e, (n) => typerPiece(n, a.pieceId, a.typePiece));
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
    case 'vue':
      return {
        ...e,
        vue: a.vue,
        trace: null,
        outil: 'selection',
        selection: a.vue === 'visite' ? null : e.selection,
      };
    case 'rendu':
      return { ...e, rendu: { ...e.rendu, ...a.reglages } };
    case 'photoAjoutee':
      return { ...e, revisionPhotos: e.revisionPhotos + 1 };
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
      return (
        reduireStructure(e, a) ??
        reduireAmenagement(e, a) ??
        reduireToiture(e, a) ??
        reduireExterieur(e, a) ??
        reduireFacades(e, a) ??
        e
      );
  }
}
