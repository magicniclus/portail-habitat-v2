/** Balises permises dans la description d'un devis (DATABASE §8 bis). */
const PERMISES = new Set(['b', 'i', 'u', 'a', 'ul', 'ol', 'li']);
const SCHEMAS_LIEN = /^(https?:|mailto:)/i;

const echapper = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** Texte : les entités déjà valides (`&nbsp;`, `&#233;` produits par l'éditeur) sont gardées. */
const echapperTexte = (s: string) =>
  s
    .replace(/&(?!(?:#\d{1,7}|#x[0-9a-f]{1,6}|[a-z][a-z0-9]{1,31});)/gi, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function lienSur(attributs: string): string | null {
  const m = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attributs);
  const brut = (m?.[1] ?? m?.[2] ?? m?.[3] ?? '').replace(/&amp;/g, '&');
  // Caractères de contrôle et espaces retirés avant le test du schéma (`java\tscript:`).
  const net = [...brut].filter((c) => c.charCodeAt(0) > 0x20 && c.charCodeAt(0) !== 0x7f).join('');
  return SCHEMAS_LIEN.test(net) ? net : null;
}

/**
 * Liste blanche stricte, sans dépendance : seules `b i u a ul ol li` survivent, sans attribut
 * (sauf un `href` http, https ou mailto sur `a`) ; tout le reste est échappé. Balises refermées
 * dans l'ordre, fermetures orphelines retirées. Appelée côté serveur avant tout enregistrement.
 */
export function assainirHtml(entree: string): string {
  const pile: string[] = [];
  let sortie = '';
  let i = 0;
  const balise = /<(\/?)([a-zA-Z]+)([^<>]*)>/g;
  for (let m = balise.exec(entree); m; m = balise.exec(entree)) {
    sortie += echapperTexte(entree.slice(i, m.index));
    i = m.index + m[0].length;
    const nom = m[2]!.toLowerCase();
    if (!PERMISES.has(nom)) {
      sortie += echapper(m[0]);
      continue;
    }
    if (m[1]) {
      const pos = pile.lastIndexOf(nom);
      if (pos === -1) continue;
      while (pile.length > pos) sortie += `</${pile.pop()}>`;
      continue;
    }
    if (nom === 'a') {
      const href = lienSur(m[3] ?? '');
      sortie += href ? `<a href="${echapper(href)}" rel="noopener noreferrer nofollow">` : '<a>';
    } else sortie += `<${nom}>`;
    pile.push(nom);
  }
  sortie += echapperTexte(entree.slice(i));
  while (pile.length) sortie += `</${pile.pop()}>`;
  return sortie;
}
