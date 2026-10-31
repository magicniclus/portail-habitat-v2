import type { PageSite, Section } from './schemas';

type Pages = Record<string, PageSite>;

/**
 * Zones globales : chaque page garde sa copie (rendu et publication inchangés) ; une copie
 * modifiée est recopiée dans toutes les autres. Chaque copie garde son identifiant et son ancre
 * (uniques sur sa page). Rien ne change si aucune zone globale n'a bougé.
 */
export function propagerGlobales(avant: Pages, apres: Pages): Pages {
  const sources = new Map<string, Section>();
  for (const [id, p] of Object.entries(apres)) {
    if (p === avant[id]) continue;
    const anciennes = new Map((avant[id]?.sections ?? []).map((s) => [s.id, s]));
    for (const s of p.sections)
      if (s.p.globale && !sources.has(s.p.globale) && anciennes.get(s.id) !== s)
        sources.set(s.p.globale, s);
  }
  if (!sources.size) return apres;
  let change = false;
  const pages = Object.fromEntries(
    Object.entries(apres).map(([id, p]) => {
      let modifiee = false;
      const sections = p.sections.map((s) => {
        const src = s.p.globale ? sources.get(s.p.globale) : undefined;
        if (!src || src === s) return s;
        modifiee = true;
        return {
          ...structuredClone(src),
          id: s.id,
          p: { ...structuredClone(src.p), ancre: s.p.ancre },
        };
      });
      if (!modifiee) return [id, p];
      change = true;
      return [id, { ...p, sections }];
    }),
  );
  return change ? pages : apres;
}

/** Zones globales du site (une par identifiant) et le nombre de pages qui les portent. */
export function zonesGlobales(
  pages: Pages,
): { globale: string; section: Section; pages: number }[] {
  const vues = new Map<string, { globale: string; section: Section; pages: Set<string> }>();
  for (const [id, p] of Object.entries(pages))
    for (const s of p.sections) {
      if (!s.p.globale) continue;
      const v = vues.get(s.p.globale) ?? { globale: s.p.globale, section: s, pages: new Set() };
      v.pages.add(id);
      vues.set(s.p.globale, v);
    }
  return [...vues.values()].map((v) => ({ ...v, pages: v.pages.size }));
}
