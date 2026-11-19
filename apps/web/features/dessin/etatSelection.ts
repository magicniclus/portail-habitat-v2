import {
  alignerObjets,
  collerElements,
  colorerMenuiseries,
  copierElements,
  deplacerElements,
  elementsDansRectangle,
  repartirObjets,
  supprimerElements,
  verrouillerElements,
  type Element,
  type GenreMultiple,
  type Point,
} from '@ph/core/dessin';
import { succes } from '@ph/core/resultat';
import {
  contexteNavigateur as ctx,
  niveauDe,
  sceneDe,
  surNiveau,
  surScene,
  type Action,
  type EtatEditeur,
} from './etatBase';

const MULTIPLES: readonly string[] = ['mur', 'objet', 'cote', 'texte'] satisfies GenreMultiple[];
const DECALAGE_COLLE = { x: 500, y: 500 };

/** Éléments visés par une commande de groupe : la sélection multiple, sinon l'élément choisi. */
function elementsChoisis(e: EtatEditeur): Element[] {
  if (e.multi.length) return e.multi;
  const s = e.selection;
  return s && MULTIPLES.includes(s.genre) ? [{ genre: s.genre as GenreMultiple, id: s.id }] : [];
}

/** Nouvelle sélection : un seul élément devient la sélection simple, plusieurs la multiple. */
function choisir(e: EtatEditeur, els: Element[]): EtatEditeur {
  return {
    ...e,
    multi: els.length > 1 ? els : [],
    selection: els[0] ? { genre: els[0].genre, id: els[0].id } : null,
    trace: null,
    proprietes: e.proprietes || els.length > 0,
  };
}

/** Clic sur un élément : sélection simple, ou ajout / retrait avec Maj (DES-29). */
export function selectionner(
  e: EtatEditeur,
  a: Extract<Action, { type: 'selectionner' }>,
): EtatEditeur {
  const s = a.selection;
  if (!a.ajouter || !s || !MULTIPLES.includes(s.genre))
    return { ...e, multi: [], selection: s, trace: null, proprietes: e.proprietes || s !== null };
  const avant = elementsChoisis(e);
  const deja = avant.some((x) => x.genre === s.genre && x.id === s.id);
  return choisir(
    e,
    deja
      ? avant.filter((x) => !(x.genre === s.genre && x.id === s.id))
      : [...avant, { genre: s.genre as GenreMultiple, id: s.id }],
  );
}

/** Suppr sur une sélection multiple ; `null` si la sélection est simple. */
export function supprimerMulti(e: EtatEditeur, confirme: boolean): EtatEditeur | null {
  if (e.multi.length < 2) return null;
  const suite = surNiveau(e, (n) => supprimerElements(n, e.multi, ctx, confirme));
  return suite.erreur ? { ...suite, proprietes: true } : choisir(suite, []);
}

/** Flèches sur une sélection multiple ; `null` si la sélection est simple. */
export function deplacerMulti(e: EtatEditeur, delta: Point): EtatEditeur | null {
  if (e.multi.length < 2) return null;
  return surNiveau(e, (n) => deplacerElements(n, e.multi, delta, ctx), 'clavier');
}

function coller(e: EtatEditeur, copie: EtatEditeur['copie']): EtatEditeur {
  if (!copie) return { ...e, erreur: 'Rien à coller : copiez d’abord une sélection.' };
  let poses: Element[] = [];
  const suite = surNiveau(e, (n) => {
    const r = collerElements(n, copie, DECALAGE_COLLE, ctx);
    if (!r.ok) return r;
    const { elements, ...niveau } = r.data;
    poses = elements;
    return succes(niveau);
  });
  return suite.erreur ? suite : choisir(suite, poses);
}

/** Actions de la sélection multiple, du presse-papier et des verrous ; `null` sinon. */
export function reduireSelection(e: EtatEditeur, a: Action): EtatEditeur | null {
  switch (a.type) {
    case 'selectionnerZone':
      return choisir(e, elementsDansRectangle(niveauDe(e), a.a, a.b));
    case 'toutSelectionner': {
      const n = niveauDe(e);
      return choisir(
        e,
        elementsDansRectangle(n, { x: -Infinity, y: -Infinity }, { x: Infinity, y: Infinity }),
      );
    }
    case 'copier': {
      const els = elementsChoisis(e);
      // Rien de choisi : Ctrl + C ne fait rien (pas de message pour un geste aussi courant).
      if (!els.length) return e;
      return { ...e, copie: copierElements(niveauDe(e), els), erreur: null };
    }
    case 'coller':
      return coller(e, e.copie);
    case 'dupliquerSelection': {
      const els = elementsChoisis(e);
      if (!els.length) return { ...e, erreur: 'Choisissez d’abord ce qu’il faut dupliquer.' };
      return coller(e, copierElements(niveauDe(e), els));
    }
    case 'alignerSelection':
      return surNiveau(e, (n) => alignerObjets(n, elementsChoisis(e), a.bord));
    case 'repartirSelection':
      return surNiveau(e, (n) => repartirObjets(n, elementsChoisis(e), a.axe));
    case 'verrouillerSelection':
      return surNiveau(e, (n) => verrouillerElements(n, elementsChoisis(e), a.valeur));
    case 'couleurMenuiseries':
      return surNiveau(e, (n) => colorerMenuiseries(n, a.couleur));
    case 'verrouillerPlan':
      return surScene(e, (s) => succes({ ...s, verrouille: a.valeur }));
    default:
      return null;
  }
}

/** Actions qui laissent passer un plan verrouillé : lecture, vues, annuler, déverrouiller. */
const PERMISES_VERROUILLE = new Set<Action['type']>([
  'annuler',
  'retablir',
  'verrouillerPlan',
  'remplacerScene',
  'finGeste',
]);

/**
 * Plan verrouillé (DES-29) : toute action qui modifierait la scène est refusée avec un message,
 * l'affichage (vues, zoom, sélection, calques de l'éditeur) reste libre.
 */
export function gardeVerrou(avant: EtatEditeur, a: Action, apres: EtatEditeur): EtatEditeur {
  const scene = sceneDe(avant);
  if (!scene.verrouille || PERMISES_VERROUILLE.has(a.type)) return apres;
  // Modification, ou commande refusée pour une autre raison : le verrou passe en premier.
  const tente =
    sceneDe(apres) !== scene || (apres.erreur !== null && apres.erreur !== avant.erreur);
  return tente
    ? { ...avant, erreur: 'Plan verrouillé : déverrouillez-le pour le modifier.' }
    : apres;
}
