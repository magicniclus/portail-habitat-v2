import {
  aimanterAngle,
  deplacerEscalier,
  placerEscalierContreMur,
  deplacerPointEscalier,
  distance,
  hauteurVersLeHaut,
  MODELES_ESCALIER,
  poserEscalierTrace,
  toleranceEnMm,
  versRepere,
  type Point,
} from '@ph/core/dessin';
import { niveauDe, sceneDe, surNiveau, contexteNavigateur as ctx } from './etatBase';
import type { Action, EtatEditeur } from './etatBase';

/**
 * Escalier tracé (DES-15), comme un mur : un clic au départ, un clic à chaque virage, puis
 * double-clic, Échap ou un clic sur le dernier point pour finir. Les virages s'aimantent aux
 * angles courants (tous les 45°) et restent libres entre deux.
 */
export function poserPointEscalier(e: EtatEditeur, point: Point): EtatEditeur | null {
  const modele = MODELES_ESCALIER[e.modeleEscalier];
  if (e.outil !== 'escalier' || !modele.trace) return null;
  const dernier = e.cheminEscalier.at(-1);
  // Aimant doux : les virages s'accrochent aux angles courants (droit, 45°…), sinon libres.
  const p = dernier ? aimanterAngle(dernier, point) : point;
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
  if (a.type === 'placerEscalier')
    return surNiveau(
      e,
      (n) => {
        const ici = n.escaliers.find((x) => x.id === a.id)?.position ?? a.position;
        return e.aimant && !a.libre
          ? placerEscalierContreMur(n, a.id, a.position, toleranceEnMm(12, e.zoom))
          : deplacerEscalier(n, a.id, { x: a.position.x - ici.x, y: a.position.y - ici.y });
      },
      a.geste ?? null,
    );
  if (a.type !== 'pointEscalier') return null;
  // La poignée s'aimante aux angles courants depuis le point voisin du tracé.
  const esc = niveauDe(e).escaliers.find((x) => x.id === a.id);
  const voisin = esc?.chemin?.[a.i === 0 ? 1 : a.i - 1];
  const vers =
    esc && voisin ? aimanterAngle(versRepere(esc.position, esc.rotation)(voisin), a.vers) : a.vers;
  const suite = surNiveau(e, (n) => deplacerPointEscalier(n, a.id, a.i, vers), a.geste ?? null);
  return suite.erreur ? e : suite;
}
