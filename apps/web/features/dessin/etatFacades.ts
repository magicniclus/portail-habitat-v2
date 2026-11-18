import { distance, type Point } from '@ph/core/dessin';
import type { Action, EtatEditeur } from './etatBase';

/** Outil « coupe » (DES-36) : deux clics sur le plan, puis la coupe s'affiche. */
export function poserCoupe(e: EtatEditeur, point: Point): EtatEditeur | null {
  if (e.outil !== 'coupe') return null;
  if (!e.trace) return { ...e, trace: point, erreur: null };
  if (distance(e.trace, point) < 500) return { ...e, erreur: 'Tracez une coupe plus longue.' };
  return {
    ...e,
    trace: null,
    outil: 'selection',
    coupe: { a: e.trace, b: point },
    vue: 'facades',
    facade: 'coupe',
    erreur: null,
  };
}

/** Choix de la façade ; `null` si l'action n'en fait pas partie. */
export function reduireFacades(e: EtatEditeur, a: Action): EtatEditeur | null {
  if (a.type !== 'facade') return null;
  if (a.facade === 'coupe' && !e.coupe)
    return { ...e, vue: 'plan', outil: 'coupe', trace: null, erreur: null };
  return { ...e, facade: a.facade };
}
