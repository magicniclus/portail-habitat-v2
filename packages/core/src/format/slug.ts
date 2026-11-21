/** Identifiant d'URL : minuscules sans accents, mots séparés par des tirets (« Bâti Pierre & Chaux » → « bati-pierre-chaux »). */
export function slugifier(...parties: (string | null | undefined)[]): string {
  return parties
    .filter(Boolean)
    .join(' ')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/['’]/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '');
}
