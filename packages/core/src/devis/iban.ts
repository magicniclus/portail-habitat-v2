/** Longueur de l'IBAN par pays (zone SEPA courante) ; les autres pays : 15 à 34 caractères. */
const LONGUEURS: Record<string, number> = {
  FR: 27,
  MC: 27,
  BE: 16,
  LU: 20,
  DE: 22,
  ES: 24,
  IT: 27,
  PT: 25,
  NL: 18,
  CH: 21,
  AT: 20,
  IE: 22,
};

export const normaliserIban = (iban: string): string => iban.replace(/[\s-]/g, '').toUpperCase();

/** IBAN plausible : pays, longueur et clé de contrôle (ISO 13616, reste 1 modulo 97). */
export function ibanValide(brut: string): boolean {
  const iban = normaliserIban(brut);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  const attendu = LONGUEURS[iban.slice(0, 2)];
  if (attendu && iban.length !== attendu) return false;
  const chiffres = (iban.slice(4) + iban.slice(0, 4)).replace(/[A-Z]/g, (c) =>
    String(c.charCodeAt(0) - 55),
  );
  let reste = 0;
  for (const c of chiffres) reste = (reste * 10 + Number(c)) % 97;
  return reste === 1;
}

/** « FR76 3000 6000 0112 3456 7890 189 » (PDF des factures). */
export const formatIban = (iban: string): string =>
  normaliserIban(iban).replace(/(.{4})(?=.)/g, '$1 ');

/** 4 derniers caractères, seuls affichés dans l'espace pro. */
export const finIban = (iban: string): string => normaliserIban(iban).slice(-4);
