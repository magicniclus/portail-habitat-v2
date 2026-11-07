/** Mots écrits en minuscules dans un nom de commune (sauf en tête). */
const PETITS = new Set([
  'de',
  'du',
  'des',
  'la',
  'le',
  'les',
  'sur',
  'sous',
  'en',
  'et',
  'aux',
  'au',
  'lès',
]);
const ELISIONS = /^(d|l)'(.+)$/;

/**
 * Nom de commune lisible : les noms venus du SIRET sont en capitales (« CARIGNAN-DE-BORDEAUX »
 * → « Carignan-de-Bordeaux ») ; un nom déjà en casse usuelle est rendu tel quel.
 */
export function casseVille(ville: string): string {
  if (!ville || ville !== ville.toUpperCase()) return ville;
  let premier = true;
  return ville
    .toLowerCase()
    .split(/([\s-]+)/)
    .map((mot) => {
      if (!mot.trim() || mot === '-') return mot;
      const elision = ELISIONS.exec(mot);
      const resultat =
        !premier && PETITS.has(mot)
          ? mot
          : elision
            ? `${premier ? elision[1]!.toUpperCase() : elision[1]}'${elision[2]!.charAt(0).toUpperCase()}${elision[2]!.slice(1)}`
            : `${mot.charAt(0).toUpperCase()}${mot.slice(1)}`;
      premier = false;
      return resultat;
    })
    .join('');
}
