import type { Action } from '@ph/core/sites';

/**
 * Texte riche de l'éditeur (`<b> <i> <u>`, `[mot](#L1)`, retours à la ligne) ↔ HTML d'une zone
 * modifiable (panneau de droite ou directement sur la page). Le retour vers le texte ne garde que
 * ces balises et les liens connus : tout le reste (collé depuis Word, une page web…) devient du
 * texte simple.
 */
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function versHtml(texte: string): string {
  return esc(texte)
    .replace(/&lt;(\/?)([biu])&gt;/g, '<$1$2>')
    .replace(/\[([^\]]+)\]\(#(L\d+)\)/g, '<a href="#$2" data-lid="$2">$1</a>')
    .replace(/\n/g, '<br>');
}

/** Ce que `depuisHtml` lit d'un nœud du DOM (testable sans navigateur). */
export interface NoeudTexte {
  nodeType: number;
  nodeName: string;
  nodeValue: string | null;
  textContent: string | null;
  childNodes: ArrayLike<NoeudTexte>;
  previousSibling: NoeudTexte | null;
  getAttribute?: (n: string) => string | null;
}

const BALISES: Record<string, 'b' | 'i' | 'u'> = { b: 'b', strong: 'b', i: 'i', em: 'i', u: 'u' };

export function depuisHtml(racine: NoeudTexte): string {
  const lire = (n: NoeudTexte): string => {
    if (n.nodeType === 3) return (n.nodeValue ?? '').replace(/\u00a0/g, ' ');
    if (n.nodeType !== 1) return '';
    const nom = n.nodeName.toLowerCase();
    const dedans = () => Array.from(n.childNodes).map(lire).join('');
    if (nom === 'br') return '\n';
    const marque = n.getAttribute?.('data-lid');
    if (nom === 'a' || marque) {
      const lid = marque ?? n.getAttribute?.('href')?.match(/#(L\d+)$/)?.[1];
      const mot = (n.textContent ?? '').replace(/[[\]()]/g, '');
      return lid && /^L\d+$/.test(lid) && mot ? `[${mot}](#${lid})` : dedans();
    }
    const b = BALISES[nom];
    if (b) {
      const x = dedans();
      return x ? `<${b}>${x}</${b}>` : '';
    }
    if (nom === 'div' || nom === 'p') return (n.previousSibling ? '\n' : '') + dedans();
    return dedans();
  };
  return Array.from(racine.childNodes)
    .map(lire)
    .join('')
    .replace(/<(b|i|u)><\/\1>/g, '');
}

/** Liens encore présents dans le texte (les autres ont été effacés avec leurs mots). */
export function liensUtilises(
  texte: string,
  liens: Record<string, Action> | undefined,
): Record<string, Action> {
  const ids = new Set([...texte.matchAll(/\]\(#(L\d+)\)/g)].map((m) => m[1]!));
  return Object.fromEntries(Object.entries(liens ?? {}).filter(([id]) => ids.has(id)));
}

/** Prochain identifiant de lien libre (`L1`, `L2`…). */
export function nouveauLien(texte: string, liens: Record<string, Action> | undefined): string {
  let n = 1;
  while (liens?.[`L${n}`] || texte.includes(`(#L${n})`)) n++;
  return `L${n}`;
}
