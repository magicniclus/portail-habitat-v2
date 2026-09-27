const SIREN_LA_POSTE = '356000000';

export function normaliserSiren(saisie: string): string {
  return saisie.replace(/[\s. ]/g, '');
}

function luhn(chiffres: string): boolean {
  let somme = 0;
  for (let i = 0; i < chiffres.length; i++) {
    let n = Number(chiffres[chiffres.length - 1 - i]);
    if (i % 2 === 1) n = n * 2 > 9 ? n * 2 - 9 : n * 2;
    somme += n;
  }
  return somme % 10 === 0;
}

export function estSirenValide(saisie: string): boolean {
  const s = normaliserSiren(saisie);
  return /^\d{9}$/.test(s) && luhn(s);
}

export function estSiretValide(saisie: string): boolean {
  const s = normaliserSiren(saisie);
  if (!/^\d{14}$/.test(s)) return false;
  if (s.startsWith(SIREN_LA_POSTE)) {
    // Les établissements de La Poste dérogent à Luhn : somme des chiffres multiple de 5.
    return [...s].reduce((a, c) => a + Number(c), 0) % 5 === 0;
  }
  return luhn(s);
}

export function sirenDeSiret(siret: string): string {
  return normaliserSiren(siret).slice(0, 9);
}

export function formatSiren(siren: string): string {
  const s = normaliserSiren(siren);
  return /^\d{9}$/.test(s) ? s.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3') : siren;
}

export function formatSiret(siret: string): string {
  const s = normaliserSiren(siret);
  return /^\d{14}$/.test(s) ? s.replace(/(\d{3})(\d{3})(\d{3})(\d{5})/, '$1 $2 $3 $4') : siret;
}
