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
  niveauDe,
  surNiveau,
  ZOOM_MAX,
  ZOOM_MIN,
  type Action,
  type EtatEditeur,
} from './etatBase';
import { viserExtremite } from './etatAimant';
import { reduireAmenagement } from './etatAmenagement';
import { reduireNiveaux } from './etatNiveaux';
import { finirEscalier, reduireEscalier } from './etatEscalier';
import { reduireStructure } from './etatStructure';
import { reduireExterieur } from './etatExterieur';
import { fermerPolygone, reduireAnnotations } from './etatAnnotations';
import { deplacerMulti, gardeVerrou, reduireSelection, selectionner } from './etatSelection';
import { reduireFacades } from './etatFacades';
import { reduireToiture } from './etatToiture';

export * from './etatBase';

/** Réducteur de l'éditeur ; un plan verrouillé refuse toute modification (DES-29). */
export function reduire(e: EtatEditeur, a: Action): EtatEditeur {
  return gardeVerrou(e, a, reduireBrut(e, a));
}

/** Actions de base ici, structure (ouvertures, niveaux…) et le reste à part. */
function reduireBrut(e: EtatEditeur, a: Action): EtatEditeur {
  switch (a.type) {
    case 'outil':
      return {
        ...e,
        outil: a.outil,
        typeMur: a.typeMur ?? e.typeMur,
        typeOuverture: a.typeOuverture ?? e.typeOuverture,
        typeEscalier: a.typeEscalier ?? e.typeEscalier,
        modeleEscalier: a.modeleEscalier ?? e.modeleEscalier,
        cheminEscalier: [],
        catalogueId: a.catalogueId ?? e.catalogueId,
        elementToit: a.elementToit ?? e.elementToit,
        elementExterieur: a.elementExterieur ?? e.elementExterieur,
        formePiscine: a.formePiscine ?? e.formePiscine,
        typeCloture: a.typeCloture ?? e.typeCloture,
        clotureEnCours: null,
        polygone: [],
        trace: null,
        echelle: null,
        erreur: null,
      };
    case 'terminerTrace':
      if (e.polygone.length) return fermerPolygone(e);
      if (e.cheminEscalier.length) return finirEscalier(e);
      return { ...e, trace: null, echelle: null, clotureEnCours: null };
    case 'echap': {
      // Échap finit le tracé en cours (ce qui vient d'être posé reste choisi) et revient au
      // curseur normal ; sans tracé, il quitte l'outil, puis désélectionne.
      const enCours =
        e.polygone.length || e.cheminEscalier.length || e.trace || e.echelle || e.clotureEnCours;
      const fini = enCours ? reduire(e, { type: 'terminerTrace' }) : e;
      if (fini.outil !== 'selection') return reduire(fini, { type: 'outil', outil: 'selection' });
      return enCours ? fini : { ...fini, selection: null, multi: [] };
    }
    case 'selectionner':
      return selectionner(e, a);
    case 'modifierLongueur':
      return surNiveau(e, (n) => modifierLongueurMur(n, a.murId, a.longueur, ctx));
    case 'modifierMur':
      return surNiveau(e, (n) => modifierMur(n, a.murId, a.modif, ctx));
    case 'deplacerExtremite': {
      const vers =
        e.aimant && !a.libre
          ? viserExtremite(niveauDe(e), a.murId, a.extremite, a.vers, e.zoom)
          : a.vers;
      return surNiveau(
        e,
        (n) => deplacerExtremite(n, a.murId, a.extremite, vers, ctx),
        a.geste ?? null,
      );
    }
    case 'couperMur':
      return surNiveau(e, (n) => couperMurAuMilieu(n, a.murId, ctx));
    case 'fusionnerMur':
      return { ...surNiveau(e, (n) => fusionnerMurs(n, a.murId, a.avec, ctx)), selection: null };
    case 'deplacerMur':
      return surNiveau(e, (n) => deplacerMur(n, a.murId, a.delta, ctx), a.geste ?? null);
    case 'deplacerClavier':
      if (e.multi.length) return deplacerMulti(e, a.delta) ?? e;
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
      return { ...e, historique: annuler(e.historique), trace: null, selection: null, multi: [] };
    case 'retablir':
      return { ...e, historique: retablir(e.historique), trace: null, selection: null, multi: [] };
    case 'ajuster':
      return { ...e, ajustement: e.ajustement + 1, ajusterParcelle: a.parcelle === true };
    case 'zoom':
      return { ...e, zoom: Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(a.zoom))) };
    case 'zoomer':
      return {
        ...e,
        zoom: Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(e.zoom * a.facteur))),
      };
    case 'aimant':
      return { ...e, aimant: !e.aimant };
    case 'vue':
      return {
        ...e,
        vue: a.vue,
        trace: null,
        outil: 'selection',
        // La 3D, la visite, la photo et les façades servent à voir : rien n'y reste choisi.
        selection: a.vue === 'plan' ? e.selection : null,
        multi: a.vue === 'plan' ? e.multi : [],
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
        reduireEscalier(e, a) ??
        reduireStructure(e, a) ??
        reduireNiveaux(e, a) ??
        reduireAmenagement(e, a) ??
        reduireToiture(e, a) ??
        reduireExterieur(e, a) ??
        reduireFacades(e, a) ??
        reduireAnnotations(e, a) ??
        reduireSelection(e, a) ??
        e
      );
  }
}
