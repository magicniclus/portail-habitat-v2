import {
  LIBELLES_ELEMENT,
  texteSansFormat,
  trouverNoeud,
  type Appareil,
  type Element,
  type PageSite,
} from '@ph/core/sites';
import type { NiveauEditeur } from '@ph/ui/tokens';

const extrait = (e: Element) => {
  const p = e.p as Record<string, unknown>;
  const t = texteSansFormat(String(p.texte ?? p.valeur ?? p.nom ?? p.legende ?? ''));
  return t ? ` · ${t}` : '';
};

export interface Ligne {
  id: string;
  label: string;
  niveau: NiveauEditeur;
  prof: number;
  masque: boolean;
}

/**
 * Lignes du panneau Structure : navigation, zones ; la zone de la sélection (ou toutes avec
 * `tout`) se déplie jusqu'à ses sections, blocs et contenus.
 */
export function lignesStructure(
  page: PageSite,
  selection: string | null,
  appareil: Appareil,
  navigationMasquee: boolean,
  tout: boolean,
): Ligne[] {
  const chaine = new Set(
    selection && selection !== 'nav'
      ? (trouverNoeud(page, selection)?.chaine.map((x) => x.id) ?? [])
      : [],
  );
  const lignes: Ligne[] = [
    {
      id: 'nav',
      label: 'Navigation · globale',
      niveau: 'nav',
      prof: 0,
      masque: page.sansNavigation || navigationMasquee,
    },
  ];
  for (const z of page.sections) {
    lignes.push({
      id: z.id,
      label: z.p.nom || 'Zone',
      niveau: 'zone',
      prof: 0,
      masque: z.p.masque[appareil],
    });
    if (!tout && !chaine.has(z.id)) continue;
    z.rows.forEach((r, ri) => {
      const ws = r.cols.map((c) => c.w).join('/');
      lignes.push({
        id: r.id,
        label: `Section ${ri + 1} · ${ws}`,
        niveau: 'section',
        prof: 1,
        masque: r.p.masque[appareil],
      });
      r.cols.forEach((c, ci) => {
        lignes.push({
          id: c.id,
          label: `Bloc ${ci + 1}`,
          niveau: 'bloc',
          prof: 2,
          masque: c.p.masque[appareil],
        });
        for (const e of c.els)
          lignes.push({
            id: e.id,
            label: `${LIBELLES_ELEMENT[e.type]}${extrait(e)}`,
            niveau: 'element',
            prof: 3,
            masque: e.p.masque[appareil],
          });
      });
    });
  }
  return lignes;
}
