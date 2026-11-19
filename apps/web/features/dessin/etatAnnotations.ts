import {
  ajouterCote,
  ajouterTexte,
  basculerCalque,
  distance,
  modifierTexte,
  pieceDepuisContour,
  toleranceEnMm,
  type Point,
} from '@ph/core/dessin';
import { succes } from '@ph/core/resultat';
import {
  contexteNavigateur as ctx,
  niveauDe,
  surNiveau,
  surScene,
  type Action,
  type EtatEditeur,
} from './etatBase';

/** Outils « cote » (deux clics) et « texte » (un clic, puis l'inspecteur) : DES-31. */
export function poserAnnotation(e: EtatEditeur, point: Point): EtatEditeur | null {
  if (e.outil === 'texte') {
    const suite = surNiveau(e, (n) => ajouterTexte(n, point, 'Texte', ctx));
    const pose = niveauDe(suite).textes.at(-1);
    if (suite.erreur || !pose) return suite;
    return {
      ...suite,
      outil: 'selection',
      selection: { genre: 'texte', id: pose.id },
      proprietes: true,
    };
  }
  if (e.outil !== 'cote') return null;
  if (!e.trace) return { ...e, trace: point, erreur: null };
  const suite = surNiveau(e, (n) => ajouterCote(n, e.trace!, point, ctx));
  return { ...suite, trace: suite.erreur ? e.trace : null };
}

/**
 * Pièce libre (DES-12) : chaque clic ajoute un point ; un clic sur le premier point, un double
 * clic ou Échap ferment le contour et créent les murs.
 */
export function poserPolygone(e: EtatEditeur, point: Point): EtatEditeur | null {
  if (e.outil !== 'pieceLibre') return null;
  const premier = e.polygone[0];
  if (premier && e.polygone.length >= 3 && distance(point, premier) <= toleranceEnMm(16, e.zoom))
    return fermerPolygone(e);
  return { ...e, polygone: [...e.polygone, point], trace: point, erreur: null };
}

/** Ferme le contour en cours (au moins trois points), sinon l'abandonne. */
export function fermerPolygone(e: EtatEditeur): EtatEditeur {
  if (e.polygone.length < 3) return { ...e, polygone: [], trace: null };
  const suite = surNiveau(e, (n) => pieceDepuisContour(n, e.polygone, ctx));
  return suite.erreur ? suite : { ...suite, polygone: [], trace: null };
}

/** Texte modifié, calque affiché ou masqué ; `null` si l'action n'en fait pas partie. */
export function reduireAnnotations(e: EtatEditeur, a: Action): EtatEditeur | null {
  if (a.type === 'modifierTexte') return surNiveau(e, (n) => modifierTexte(n, a.id, a.modif));
  if (a.type === 'calqueScene') return surScene(e, (s) => succes(basculerCalque(s, a.cle)));
  return null;
}
