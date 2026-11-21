/** Générateur pseudo-aléatoire déterministe (même algorithme que scripts/maquette.mjs). */
export function aleatoire(graine: number): () => number {
  let x = graine >>> 0;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}
