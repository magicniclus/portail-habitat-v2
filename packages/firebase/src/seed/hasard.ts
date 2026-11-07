/** Générateur déterministe (xorshift32) : même graine, même jeu de données. */
export function creerHasard(graine: number) {
  let x = graine >>> 0 || 1;
  const suivant = () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
  const entier = (min: number, max: number) => min + Math.floor(suivant() * (max - min + 1));
  const choisir = <T>(liste: readonly T[]): T => liste[Math.floor(suivant() * liste.length)]!;
  const identifiant = (longueur = 20) => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length: longueur }, () => alphabet[Math.floor(suivant() * 62)]).join('');
  };
  /** Chaîne de chiffres complétée par une clé de Luhn (SIREN : 8 + 1, SIRET : 13 + 1). */
  const luhn = (chiffres: string) => {
    for (let c = 0; c <= 9; c++) {
      const s = chiffres + c;
      let somme = 0;
      for (let i = 0; i < s.length; i++) {
        let d = Number(s[s.length - 1 - i]);
        if (i % 2 === 1) d = d * 2 > 9 ? d * 2 - 9 : d * 2;
        somme += d;
      }
      if (somme % 10 === 0) return s;
    }
    return chiffres + '0';
  };
  const chiffres = (n: number) => Array.from({ length: n }, () => entier(0, 9)).join('');
  const siren = () => luhn(String(entier(1, 9)) + chiffres(7));
  const siret = (s: string) => luhn(s + chiffres(4));
  return { suivant, entier, choisir, identifiant, siren, siret };
}
export type Hasard = ReturnType<typeof creerHasard>;
