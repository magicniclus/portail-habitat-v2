import {
  ajouterElementToit,
  definirToiture,
  modifierToiture,
  niveauSuperieur,
  reglerHauteursToit,
  toitureAutomatique,
  retirerElementToit,
  type Point,
} from '@ph/core/dessin';
import {
  contexteNavigateur as ctx,
  niveauDe,
  sceneDe,
  surNiveau,
  surScene,
  type Action,
  type EtatEditeur,
} from './etatBase';

/** Clic sur le plan avec l'outil « toit » : fenêtre de toit, cheminée ou lucarne. */
export function poserToit(e: EtatEditeur, point: Point): EtatEditeur | null {
  if (e.outil !== 'toit') return null;
  return surNiveau(e, (n) => ajouterElementToit(n, e.elementToit, point, ctx));
}

/** Toiture du niveau courant (lot 15h) ; `null` si l'action n'en fait pas partie. */
export function reduireToiture(e: EtatEditeur, a: Action): EtatEditeur | null {
  switch (a.type) {
    case 'toiture':
      return surNiveau(e, (n) => definirToiture(n, a.toiture));
    case 'toitureAuto': {
      // Le toit posé se voit en 3D : la maison de poupée (qui le masque) est désactivée.
      const suite = surScene(e, (s) => toitureAutomatique(s, a.toiture));
      return suite.erreur ? suite : { ...suite, rendu: { ...suite.rendu, poupee: false } };
    }
    case 'hauteursToit': {
      const dessus = niveauSuperieur(sceneDe(e), niveauDe(e).id);
      const h = {
        ...(a.egout !== undefined ? { egout: a.egout } : {}),
        ...(a.faitage !== undefined ? { faitage: a.faitage } : {}),
      };
      return surNiveau(e, (n) => reglerHauteursToit(n, h, dessus));
    }
    case 'modifierToiture':
      return surNiveau(e, (n) => modifierToiture(n, a.modif));
    case 'retirerElementToit':
      return surNiveau(e, (n) => retirerElementToit(n, a.id));
    default:
      return null;
  }
}
