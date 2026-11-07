import { assainirHtml, type ReglesHtml } from '../devis/html';
import { slugifier } from '../format/slug';

/** Corps d'un article (BLOG §3) : liste blanche, balises refusées retirées avec leur contenu. */
const REGLES_BLOG: ReglesHtml = {
  balises: new Set([
    'p',
    'h2',
    'h3',
    'strong',
    'em',
    'u',
    'b',
    'i',
    'ul',
    'ol',
    'li',
    'blockquote',
    'a',
    'br',
  ]),
  liensInternes: true,
  refusees: 'retirer',
};

export const assainirCorps = (html: string): string => assainirHtml(html, REGLES_BLOG);

const sansAccents = (t: string) =>
  t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[’']/g, ' ');

/** Texte brut d'un corps assaini (balises retirées, entités courantes décodées). */
export function texteDuHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

const motsDe = (t: string) => sansAccents(t).match(/[a-z0-9]+/g) ?? [];

/** Le mot-clé (tous ses mots, dans l'ordre) figure-t-il dans ce texte ? */
export function contientMotCle(texte: string, motCle: string): boolean {
  const k = motsDe(motCle).join(' ');
  return k.length > 0 && ` ${motsDe(texte).join(' ')} `.includes(` ${k} `);
}

export interface StatsTexte {
  mots: number;
  intertitres: number;
  liensInternes: number;
  motCleAuDebut: boolean;
  /** Part des mots occupée par le mot-clé, en %. */
  densite: number;
}

export function statsTexte(html: string, motCle: string): StatsTexte {
  const mots = motsDe(texteDuHtml(html));
  const k = motsDe(motCle);
  let occurrences = 0;
  if (k.length)
    for (let i = 0; i + k.length <= mots.length; i++)
      if (k.every((m, j) => mots[i + j] === m)) occurrences++;
  return {
    mots: mots.length,
    intertitres: (html.match(/<h[23]>/g) ?? []).length,
    liensInternes: (html.match(/<a href="\/(?!\/)/g) ?? []).length,
    motCleAuDebut: k.length > 0 && contientMotCle(mots.slice(0, 100).join(' '), motCle),
    densite: mots.length ? Math.round(((occurrences * k.length) / mots.length) * 1000) / 10 : 0,
  };
}

/** Adresse `/blog/{slug}` tirée du titre, unique dans le blog. */
export function adresseArticle(titre: string, prises: readonly string[]): string {
  const base = slugifier(titre) || 'article';
  let s = base;
  for (let n = 2; prises.includes(s); n++) s = `${base}-${n}`;
  return s;
}
