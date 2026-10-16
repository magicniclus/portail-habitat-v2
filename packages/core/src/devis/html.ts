export interface ReglesHtml {
  balises: ReadonlySet<string>;
  /** Liens relatifs au site (`/page`) gardés, sans `nofollow`. */
  liensInternes: boolean;
  /** Balise refusée : échappée (visible en texte) ou retirée ; `script`, `style`… avec leur contenu. */
  refusees: 'echapper' | 'retirer';
}

/** Balises permises dans la description d'un devis (DATABASE §8 bis). */
const REGLES_DEVIS: ReglesHtml = {
  balises: new Set(['b', 'i', 'u', 'a', 'ul', 'ol', 'li']),
  liensInternes: false,
  refusees: 'echapper',
};
const SCHEMAS_LIEN = /^(https?:|mailto:)/i;
const CONTENU_RETIRE =
  /<(script|style|iframe|object|embed|template|noscript|svg|math)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;

const echapper = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** Texte : les entités déjà valides (`&nbsp;`, `&#233;` produits par l'éditeur) sont gardées. */
const echapperTexte = (s: string) =>
  s
    .replace(/&(?!(?:#\d{1,7}|#x[0-9a-f]{1,6}|[a-z][a-z0-9]{1,31});)/gi, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function lienSur(attributs: string, internes: boolean): { href: string; interne: boolean } | null {
  const m = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attributs);
  const brut = (m?.[1] ?? m?.[2] ?? m?.[3] ?? '').replace(/&amp;/g, '&');
  // Caractères de contrôle et espaces retirés avant le test du schéma (`java\tscript:`).
  const net = [...brut].filter((c) => c.charCodeAt(0) > 0x20 && c.charCodeAt(0) !== 0x7f).join('');
  if (internes && /^\/(?!\/)/.test(net)) return { href: net, interne: true };
  return SCHEMAS_LIEN.test(net) ? { href: net, interne: false } : null;
}

/**
 * Liste blanche stricte, sans dépendance : seules les balises permises survivent (devis :
 * `b i u a ul ol li`), sans attribut (sauf un `href` http, https ou mailto sur `a`, ou relatif si
 * les liens internes sont permis) ; le reste est échappé ou retiré. Balises refermées dans l'ordre,
 * fermetures orphelines retirées. Appelée côté serveur avant tout enregistrement.
 */
export function assainirHtml(brut: string, regles: ReglesHtml = REGLES_DEVIS): string {
  const entree = regles.refusees === 'retirer' ? brut.replace(CONTENU_RETIRE, '') : brut;
  const pile: string[] = [];
  let sortie = '';
  let i = 0;
  const balise = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^<>]*)>/g;
  for (let m = balise.exec(entree); m; m = balise.exec(entree)) {
    sortie += echapperTexte(entree.slice(i, m.index));
    i = m.index + m[0].length;
    const nom = m[2]!.toLowerCase();
    if (!regles.balises.has(nom)) {
      if (regles.refusees === 'echapper') sortie += echapper(m[0]);
      continue;
    }
    if (m[1]) {
      const pos = pile.lastIndexOf(nom);
      if (pos === -1) continue;
      while (pile.length > pos) sortie += `</${pile.pop()}>`;
      continue;
    }
    if (nom === 'a') {
      const l = lienSur(m[3] ?? '', regles.liensInternes);
      sortie += !l
        ? '<a>'
        : l.interne
          ? `<a href="${echapper(l.href)}">`
          : `<a href="${echapper(l.href)}" rel="noopener noreferrer nofollow">`;
    } else sortie += `<${nom}>`;
    pile.push(nom);
  }
  sortie += echapperTexte(entree.slice(i));
  while (pile.length) sortie += `</${pile.pop()}>`;
  return sortie;
}
