/**
 * Format du texte riche des sites (titres et textes) : balises courtes, toujours équilibrées, et
 * listes en début de ligne. Rien d'autre n'est rendu : le reste est échappé.
 * - `<b> <i> <u>` gras, italique, souligné · `<s>` barré · `<sup>` exposant · `<mark>` surligné
 * - `<ka> <kp> <ks> <kb>` couleur : accent, principale, sombre, blanc
 * - ligne commençant par `• ` : puce ; par `1. ` : liste numérotée
 * - `[mot](#L1)` : mot lié (actions.ts)
 */
export const BALISES_TEXTE = ['b', 'i', 'u', 's', 'sup', 'mark', 'ka', 'kp', 'ks', 'kb'] as const;
export type BaliseTexte = (typeof BALISES_TEXTE)[number];

/** Couleurs de texte proposées (jetons de la palette du site). */
export const COULEURS_TEXTE = {
  ka: 'accent',
  kp: 'primaire',
  ks: 'sombre',
  kb: 'blanc',
} as const satisfies Partial<Record<BaliseTexte, string>>;

export const RE_BALISE_TEXTE = new RegExp(`<(\\/?)(${BALISES_TEXTE.join('|')})>`, 'g');

/** Ligne de liste : puce `• ` ou numéro `12. `. */
export const RE_LIGNE_LISTE = /^(?:(•) |(\d{1,2})\. )/;

/** Texte lisible sans mise en forme (SEO, structure, extraits) : mots liés gardés, balises et puces retirées. */
export function texteSansFormat(t: string): string {
  return t
    .replace(/\[([^\]]+)\]\(#L\d+\)/g, '$1')
    .replace(RE_BALISE_TEXTE, '')
    .split('\n')
    .map((l) => l.replace(RE_LIGNE_LISTE, ''))
    .join('\n');
}

export type BlocTexte =
  | { type: 'texte'; lignes: string[] }
  | { type: 'puces' | 'numeros'; lignes: string[]; depart?: number };

/** Découpe en paragraphes et listes (lignes consécutives de même type). */
export function blocsTexte(t: string): BlocTexte[] {
  const blocs: BlocTexte[] = [];
  for (const l of t.split('\n')) {
    const m = RE_LIGNE_LISTE.exec(l);
    const type = !m ? 'texte' : m[1] ? 'puces' : 'numeros';
    const contenu = m ? l.slice(m[0].length) : l;
    const dernier = blocs.at(-1);
    if (dernier?.type === type) dernier.lignes.push(contenu);
    else
      blocs.push(
        type === 'numeros'
          ? { type, lignes: [contenu], depart: Number(m![2]) }
          : { type, lignes: [contenu] },
      );
  }
  return blocs;
}
