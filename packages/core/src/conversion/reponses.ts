/** Adresse d'un en-tête `From` (« Marc Dupont <marc@exemple.fr> » ou « marc@exemple.fr »). */
export function adresseExpediteur(from: string): string | null {
  const brute = (/<([^<>\s]+@[^<>\s]+)>/.exec(from)?.[1] ?? from).trim().toLowerCase();
  return /^[^@\s<>"]+@[^@\s<>"]+\.[a-z]{2,}$/.test(brute) ? brute : null;
}
