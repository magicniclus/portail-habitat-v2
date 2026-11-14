import { APPAREILS, type Appareil, type Marges } from './schemas';

type AvecMarges = { mb: number; marges?: Record<Appareil, Marges> | undefined };

/** Marges par appareil d'un contenu ; sans réglage, la marge du bas historique partout. */
export function margesDe(p: AvecMarges): Record<Appareil, Marges> {
  if (p.marges) return p.marges;
  const m = { h: 0, b: p.mb, g: 0, d: 0 };
  return { desktop: m, tablet: m, mobile: m };
}

/**
 * Une marge changée sur un appareil : sur ordinateur, la tablette et le mobile suivent tant
 * qu'ils avaient la même valeur (pas de réglage propre) ; sur tablette, le mobile suit pareil ;
 * sur mobile, rien d'autre ne bouge (SITE-02). `mb` garde la marge du bas de l'ordinateur.
 */
export function reglerMarge(
  p: AvecMarges,
  a: Appareil,
  cote: keyof Marges,
  v: number,
): { marges: Record<Appareil, Marges>; mb: number } {
  const avant = margesDe(p);
  const suite = APPAREILS.slice(APPAREILS.indexOf(a));
  const ancienne = avant[a][cote];
  const marges = Object.fromEntries(
    APPAREILS.map((x) => {
      const suit = x === a || (suite.includes(x) && avant[x][cote] === ancienne);
      return [x, suit ? { ...avant[x], [cote]: v } : avant[x]];
    }),
  ) as Record<Appareil, Marges>;
  return { marges, mb: marges.desktop.b };
}
