/** Premier et dernier mot : « Camille M. » → CM, « jean-pierre dupont » → JD, « Bertrand Rénovation » → BR. */
export function initiales(nom: string): string {
  const mots = nom.split(/\s+/).filter((m) => /\p{L}/u.test(m[0] ?? ''));
  const extremes = mots.length > 1 ? [mots[0]!, mots.at(-1)!] : mots;
  return extremes.map((m) => m[0]!.toUpperCase()).join('');
}
