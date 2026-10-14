import type { Element, PageSite, Section } from './schemas';

/** Historique de l'éditeur (SITE_INTERNET §4.1) : 80 états, une modification efface le futur. */
export interface Historique<T> {
  passe: T[];
  present: T;
  futur: T[];
}
const MAX_ETATS = 80;

export const historique = <T>(present: T): Historique<T> => ({ passe: [], present, futur: [] });

export const appliquer = <T>(h: Historique<T>, suivant: T): Historique<T> => ({
  passe: [...h.passe, h.present].slice(-MAX_ETATS),
  present: suivant,
  futur: [],
});

export function annuler<T>(h: Historique<T>): Historique<T> {
  const precedent = h.passe.at(-1);
  if (precedent === undefined) return h;
  return { passe: h.passe.slice(0, -1), present: precedent, futur: [h.present, ...h.futur] };
}

export function retablir<T>(h: Historique<T>): Historique<T> {
  const [suivant, ...reste] = h.futur;
  if (suivant === undefined) return h;
  return { passe: [...h.passe, h.present], present: suivant, futur: reste };
}

/** Déplace l'élément `i` d'un cran (`-1` vers le haut) ; sans effet aux bords. */
export function deplacer<T>(liste: readonly T[], i: number, sens: -1 | 1): T[] {
  const j = i + sens;
  if (j < 0 || j >= liste.length) return [...liste];
  const n = [...liste];
  [n[i], n[j]] = [n[j]!, n[i]!];
  return n;
}

/** Tous les éléments de la page, avec leur section. */
export function elementsDe(p: Pick<PageSite, 'sections'>): { section: Section; el: Element }[] {
  return p.sections.flatMap((s) =>
    s.rows.flatMap((r) => r.cols.flatMap((c) => c.els.map((el) => ({ section: s, el })))),
  );
}

export const supprimerSection = (p: PageSite, id: string): PageSite => ({
  ...p,
  sections: p.sections.filter((s) => s.id !== id),
});

/** Copie juste après l'original : nouveaux identifiants partout, ancres et ID HTML vidés (uniques). */
export function dupliquerSection(p: PageSite, id: string, nouvelId: () => string): PageSite {
  const i = p.sections.findIndex((s) => s.id === id);
  if (i < 0) return p;
  const s = p.sections[i]!;
  const copie: Section = {
    id: nouvelId(),
    p: { ...s.p, ancre: '' },
    rows: s.rows.map((r) => ({
      id: nouvelId(),
      p: { ...r.p, htmlId: '' },
      cols: r.cols.map((c) => ({
        ...c,
        id: nouvelId(),
        p: { ...c.p, htmlId: '' },
        els: c.els.map((e) => ({ ...e, id: nouvelId(), p: { ...e.p, htmlId: '' } }) as Element),
      })),
    })),
  };
  return { ...p, sections: [...p.sections.slice(0, i + 1), copie, ...p.sections.slice(i + 1)] };
}

/** Réglages d'un élément fusionnés (le schéma revalide à l'enregistrement). */
export function majElement(p: PageSite, id: string, reglages: Record<string, unknown>): PageSite {
  return {
    ...p,
    sections: p.sections.map((s) => ({
      ...s,
      rows: s.rows.map((r) => ({
        ...r,
        cols: r.cols.map((c) => ({
          ...c,
          els: c.els.map((e) =>
            e.id === id ? ({ ...e, p: { ...e.p, ...reglages } } as Element) : e,
          ),
        })),
      })),
    })),
  };
}

const enSlug = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');

/** Adresse d'une nouvelle page, unique sur le site (`contact-2`…). */
export function slugDePage(nom: string, pages: Record<string, Pick<PageSite, 'slug'>>): string {
  const base = enSlug(nom) || 'page';
  const pris = new Set(Object.values(pages).map((p) => p.slug));
  let slug = base;
  for (let n = 2; pris.has(slug); n++) slug = `${base}-${n}`;
  return slug;
}

const v3 = <T>(v: T) => ({ desktop: v, tablet: v, mobile: v });

/** Page libre en brouillon : un bandeau titre + texte, à compléter dans l'éditeur. */
export function nouvellePage(nom: string, slug: string, ordre: number): PageSite {
  const base = { htmlId: '', mb: 16, masque: v3(false) };
  return {
    nom,
    court: nom.slice(0, 40),
    slug,
    type: 'libre',
    statut: 'brouillon',
    ordre,
    sansNavigation: false,
    menu: true,
    seo: { title: '', meta: '', motCle: '' },
    sections: [
      {
        id: `s-${slug}`,
        p: {
          nom: 'Introduction',
          ancre: '',
          largeur: 'boite',
          padY: { desktop: 80, tablet: 64, mobile: 48 },
          masque: v3(false),
          fond: 'clair',
          fondType: 'couleur',
          fondImage: '',
          voile: 'sombre',
          voileOpacite: 0,
          fondPos: 'center',
          texteCouleur: 'auto',
        },
        rows: [
          {
            id: `r-${slug}`,
            p: {
              htmlId: '',
              gap: 24,
              valign: 'start',
              fond: '',
              empile: true,
              inverse: false,
              masque: v3(false),
            },
            cols: [
              {
                id: `c-${slug}`,
                w: 12,
                p: {
                  htmlId: '',
                  pad: 0,
                  arrondi: 0,
                  ombre: false,
                  valign: 'start',
                  masque: v3(false),
                  fond: '',
                  fondType: 'couleur',
                  fondImage: '',
                  voile: 'sombre',
                  voileOpacite: 0,
                  fondPos: 'center',
                  texteCouleur: 'auto',
                },
                els: [
                  {
                    id: `t-${slug}`,
                    type: 'titre',
                    p: {
                      ...base,
                      texte: nom,
                      niveau: 'h1',
                      taille: { desktop: 44, tablet: 36, mobile: 30 },
                      couleur: '',
                      align: 'left',
                    },
                  },
                  {
                    id: `x-${slug}`,
                    type: 'texte',
                    p: {
                      ...base,
                      texte: 'Présentez ici ce que vous proposez.',
                      taille: { desktop: 18, tablet: 17, mobile: 16 },
                      couleur: '',
                      align: 'left',
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}
