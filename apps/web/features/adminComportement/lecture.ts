import { CODES_REPLAY } from '@ph/core/comportement';

/** État d'un replay à l'instant `t` (ms) : position du curseur, trace, clics passés, défilement. */
export type Evenement = [number, number, number, number];

export function etatReplay(evenements: readonly Evenement[], t: number) {
  const trace: [number, number][] = [];
  const clics: { x: number; y: number; age: number }[] = [];
  let curseur: [number, number] | null = null;
  let haut = 0;
  for (const [te, code, x, y] of evenements) {
    if (te > t) break;
    if (code === CODES_REPLAY.defilement) haut = y;
    else {
      curseur = [x, y];
      trace.push(curseur);
      if (code === CODES_REPLAY.clic) clics.push({ x, y, age: t - te });
    }
  }
  return { curseur, trace: trace.slice(-60), clics: clics.filter((c) => c.age < 1500), haut };
}

export const dureeReplay = (evenements: readonly Evenement[]) =>
  evenements.length ? evenements[evenements.length - 1]![0] : 0;
