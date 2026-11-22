import {
  deplacerEscalier,
  deplacerPointEscalier,
  distance,
  hauteurVersLeHaut,
  MODELES_ESCALIER,
  orthogonal,
  poserEscalierTrace,
  toleranceEnMm,
  type Point,
} from '@ph/core/dessin';
import { niveauDe, sceneDe, surNiveau, contexteNavigateur as ctx } from './etatBase';
import type { Action, EtatEditeur } from './etatBase';

/**
 * Escalier tracé (DES-15), comme un mur : un clic au départ, un clic à chaque virage, puis
 * double-clic, Échap ou un clic sur le dernier point pour finir. Les volées sont d'équerre
 * (horizontales ou verticales depuis le point précédent).
 */
export function poserPointEscalier(e: EtatEditeur, point: Point): EtatEditeur | null {
  const modele = MODELES_ESCALIER[e.modeleEscalier];
  if (e.outil !== 'escalier' || !modele.trace) return null;
  const dernier = e.cheminEscalier.at(-1);
  const p = dernier ? orthogonal(dernier, point) : point;
  // Clic sur le dernier point (ou double-clic) : l'escalier est fini.
  if (dernier && distance(dernier, p) <= toleranceEnMm(12, e.zoom)) return finirEscalier(e);
  return {
    ...e,
    cheminEscalier: [...e.cheminEscalier, p],
    trace: p,
    selection: null,
    erreur: null,
  };
}

/** Termine le tracé : l'escalier est posé et sélectionné, l'outil revient à la sélection. */
export function finirEscalier(e: EtatEditeur): EtatEditeur {
  const modele = MODELES_ESCALIER[e.modeleEscalier];
  const fin = { ...e, cheminEscalier: [], trace: null };
  if (!modele.trace || e.cheminEscalier.length < 2) return fin;
  const suite = surNiveau(fin, (n) =>
    poserEscalierTrace(
      n,
      {
        chemin: e.cheminEscalier,
        hauteurAMonter: hauteurVersLeHaut(sceneDe(e), e.niveauId),
        ...modele.trace!,
      },
      ctx,
    ),
  );
  const pose = niveauDe(suite).escaliers.at(-1);
  return suite.erreur || !pose
    ? suite
    : { ...suite, outil: 'selection', selection: { genre: 'escalier', id: pose.id } };
}

/** Poignée d'un point du tracé : refusée (trop court) pendant le geste, simplement ignorée. */
export function reduireEscalier(e: EtatEditeur, a: Action): EtatEditeur | null {
  if (a.type === 'deplacerEscalier')
    return surNiveau(e, (n) => deplacerEscalier(n, a.id, a.delta), a.geste ?? null);
  if (a.type !== 'pointEscalier') return null;
  const suite = surNiveau(e, (n) => deplacerPointEscalier(n, a.id, a.i, a.vers), a.geste ?? null);
  return suite.erreur ? e : suite;
}
