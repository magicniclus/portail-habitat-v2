import {
  ajouterCote,
  ajouterTexte,
  basculerCalque,
  modifierTexte,
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

/** Texte modifié, calque affiché ou masqué ; `null` si l'action n'en fait pas partie. */
export function reduireAnnotations(e: EtatEditeur, a: Action): EtatEditeur | null {
  if (a.type === 'modifierTexte') return surNiveau(e, (n) => modifierTexte(n, a.id, a.modif));
  if (a.type === 'calqueScene') return surScene(e, (s) => succes(basculerCalque(s, a.cle)));
  return null;
}
