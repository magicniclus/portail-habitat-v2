const FORMULE = /^[=+\-@\t\r]/;

const champ = (v: string) => {
  const s = FORMULE.test(v) ? `'${v}` : v;
  return /[;"\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};

/**
 * CSV lisible par Excel en France : séparateur « ; », BOM UTF-8 (accents corrects), CRLF.
 * Les cellules qui commencent comme une formule sont préfixées d'une apostrophe.
 */
export function versCsv(
  entetes: readonly string[],
  lignes: readonly (readonly string[])[],
  o: { bom?: boolean } = {},
): string {
  const corps = [entetes, ...lignes].map((l) => l.map(champ).join(';')).join('\r\n');
  return `${o.bom === false ? '' : '﻿'}${corps}\r\n`;
}
