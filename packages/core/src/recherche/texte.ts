/** Normalisation et outils textuels de la recherche (RECHERCHE.md §2). */

/** Minuscules, sans accents, œ → oe, ponctuation et apostrophes → espace. */
export function normaliser(s: string | null | undefined): string {
  return (s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/['’`]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Racinisation légère : pluriels en -s/-x, « travaux » → « traval ». */
export function raciner(w: string): string {
  if (w.length > 4 && w.endsWith('aux')) return `${w.slice(0, -3)}al`;
  if (w.length > 3 && /[sx]$/.test(w)) return w.slice(0, -1);
  return w;
}

export function motsDe(s: string, motsVides: ReadonlySet<string>, garderVides = false): string[] {
  return normaliser(s)
    .split(' ')
    .filter((w) => w && (garderVides || !motsVides.has(w)))
    .map(raciner);
}

/** Distance de Damerau-Levenshtein bornée : renvoie `max + 1` dès que la borne est dépassée. */
export function distance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d: number[][] = [];
  for (let i = 0; i <= a.length; i++) d[i] = [i];
  for (let j = 0; j <= b.length; j++) d[0]![j] = j;
  for (let i = 1; i <= a.length; i++) {
    let meilleur = 99;
    for (let j = 1; j <= b.length; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + c);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        v = Math.min(v, d[i - 2]![j - 2]! + 1);
      d[i]![j] = v;
      if (v < meilleur) meilleur = v;
    }
    if (meilleur > max) return max + 1;
  }
  return d[a.length]![b.length]!;
}

/** Libellé découpé en segments, `b` = partie reconnue (mise en gras). */
export function surligner(libelle: string, mots: readonly string[]): { t: string; b: boolean }[] {
  const sortie: { t: string; b: boolean }[] = [];
  for (const w of libelle.split(/(\s+|['’])/)) {
    const n = raciner(normaliser(w));
    const trouve = Boolean(
      n &&
      n.length >= 2 &&
      mots.some((q) => q.length >= 2 && (n.startsWith(q) || (q.startsWith(n) && n.length >= 3))),
    );
    const dernier = sortie[sortie.length - 1];
    if (dernier && dernier.b === trouve) dernier.t += w;
    else sortie.push({ t: w, b: trouve });
  }
  return sortie;
}
