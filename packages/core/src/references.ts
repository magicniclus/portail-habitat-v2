/** Sans 0, O, 1, I : lisible au téléphone et recopiable sans erreur. */
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/** Référence donnée à l'usager (« PH-7K2Q9M ») ; `alea` fournit des réels dans [0, 1[. */
export function referenceLisible(prefixe: string, alea: () => number): string {
  let r = '';
  for (let i = 0; i < 6; i++) r += ALPHABET[Math.floor(alea() * 32) % 32];
  return `${prefixe}-${r}`;
}
