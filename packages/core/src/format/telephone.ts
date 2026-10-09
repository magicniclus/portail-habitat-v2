const E164 = /^\+[1-9]\d{7,14}$/;
const FR = /^\+33[1-9]\d{8}$/;

/** Saisie libre → E.164 (« +33612345678 »), ou `null`. Les numéros français sans indicatif sont acceptés. */
export function normaliserTel(saisie: string): string | null {
  let s = saisie.replace(/\(0\)/g, '').replace(/[\s.\-()]/g, '');
  if (/^0\d{9}$/.test(s)) s = `+33${s.slice(1)}`;
  else if (s.startsWith('00')) s = `+${s.slice(2)}`;
  if (s.startsWith('+33')) return FR.test(s) ? s : null;
  return E164.test(s) ? s : null;
}

/** E.164 → « 06 12 34 56 78 » pour la France ; les autres numéros restent en E.164. */
export function formatTel(e164: string): string {
  if (!FR.test(e164)) return e164;
  return `0${e164.slice(3)}`.replace(/(\d{2})(?=\d)/g, '$1 ');
}

export function estMobileFr(e164: string): boolean {
  return /^\+33[67]\d{8}$/.test(e164);
}

/** « 06 12 •• •• 48 » : numéro reconnaissable sans être lisible (écrans de sécurité). */
export function masquerTel(e164: string): string {
  const groupes = formatTel(e164).split(' ');
  if (groupes.length !== 5) return `${e164.slice(0, 4)}•••${e164.slice(-2)}`;
  return [groupes[0], groupes[1], '••', '••', groupes[4]].join(' ');
}
