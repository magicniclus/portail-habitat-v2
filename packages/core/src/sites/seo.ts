import type { PageSite } from './schemas';

export interface ControleSeo {
  cle: 'title' | 'meta' | 'h1' | 'ville' | 'alt';
  libelle: string;
  ok: boolean;
}

const sansBalises = (t: string) =>
  t.replace(/\[([^\]]+)\]\(#L\d+\)/g, '$1').replace(/<\/?[biu]>/g, '');
const normal = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Panneau SEO (SITE_INTERNET §4.5) : contrôles cliquables et score sur 100. */
export function controlesSeo(
  p: Pick<PageSite, 'seo' | 'sections'>,
  ville?: string,
): { controles: ControleSeo[]; score: number } {
  const els = p.sections.flatMap((s) => s.rows.flatMap((r) => r.cols.flatMap((c) => c.els)));
  const h1 = els.filter((e) => e.type === 'titre' && e.p.niveau === 'h1');
  const images = els.filter((e) => e.type === 'image');
  const t = p.seo.title.trim().length;
  const m = p.seo.meta.trim().length;
  const villeOk =
    !ville ||
    (normal(p.seo.title).includes(normal(ville)) &&
      h1.some((e) => e.type === 'titre' && normal(sansBalises(e.p.texte)).includes(normal(ville))));
  const controles: ControleSeo[] = [
    { cle: 'title', libelle: 'Titre entre 30 et 60 caractères', ok: t >= 30 && t <= 60 },
    { cle: 'meta', libelle: 'Description entre 110 et 155 caractères', ok: m >= 110 && m <= 155 },
    { cle: 'h1', libelle: 'Un seul titre principal (H1)', ok: h1.length === 1 },
    { cle: 'ville', libelle: 'Ville dans le titre et le H1', ok: villeOk },
    {
      cle: 'alt',
      libelle: 'Texte alternatif sur chaque image',
      ok: images.every((e) => e.type === 'image' && e.p.legende.trim().length > 0),
    },
  ];
  return {
    controles,
    score: Math.round((controles.filter((c) => c.ok).length / controles.length) * 100),
  };
}
