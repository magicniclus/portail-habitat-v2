import {
  BALISES_TEXTE,
  blocsTexte,
  COULEURS_TEXTE,
  type Action,
  type BaliseTexte,
} from '@ph/core/sites';

/**
 * Texte riche de l'éditeur (format `texteRiche.ts` du cœur : gras, italique, souligné, barré,
 * exposant, surligné, couleurs, listes, mots liés) ↔ HTML d'une zone modifiable (panneau de droite
 * ou directement sur la page). Le retour vers le texte ne garde que ces formats et les liens
 * connus : tout le reste (collé depuis Word, une page web…) devient du texte simple.
 */
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const RE_ECHAPPEE = new RegExp(`&lt;(\\/?)(${BALISES_TEXTE.join('|')})&gt;`, 'g');

const ligneHtml = (l: string) =>
  esc(l)
    .replace(RE_ECHAPPEE, (_t, f: string, b: string) =>
      b in COULEURS_TEXTE ? (f ? '</span>' : `<span class="${b}">`) : `<${f}${b}>`,
    )
    .replace(/\[([^\]]+)\]\(#(L\d+)\)/g, '<a href="#$2" data-lid="$2">$1</a>');

export function versHtml(texte: string): string {
  return blocsTexte(texte)
    .map((b) => {
      if (b.type === 'texte') return b.lignes.map(ligneHtml).join('<br>');
      const items = b.lignes.map((l) => `<li>${ligneHtml(l)}</li>`).join('');
      return b.type === 'puces'
        ? `<ul>${items}</ul>`
        : `<ol${b.depart && b.depart > 1 ? ` start="${b.depart}"` : ''}>${items}</ol>`;
    })
    .join('');
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

const BALISES: Record<string, BaliseTexte> = {
  b: 'b',
  strong: 'b',
  i: 'i',
  em: 'i',
  u: 'u',
  s: 's',
  strike: 's',
  del: 's',
  sup: 'sup',
  mark: 'mark',
};
const LISTES = new Set(['ul', 'ol']);

export function depuisHtml(racine: NoeudTexte): string {
  const lire = (n: NoeudTexte): string => {
    if (n.nodeType === 3) return (n.nodeValue ?? '').replace(/\u00a0/g, ' ');
    if (n.nodeType !== 1) return '';
    const nom = n.nodeName.toLowerCase();
    const dedans = () => Array.from(n.childNodes).map(lire).join('');
    // Après une liste, la suite repart sur une nouvelle ligne.
    const apresListe = n.previousSibling && LISTES.has(n.previousSibling.nodeName.toLowerCase());
    if (nom === 'br') return '\n';
    const marque = n.getAttribute?.('data-lid');
    if (nom === 'a' || marque) {
      const lid = marque ?? n.getAttribute?.('href')?.match(/#(L\d+)$/)?.[1];
      const mot = (n.textContent ?? '').replace(/[[\]()]/g, '');
      return lid && /^L\d+$/.test(lid) && mot ? `[${mot}](#${lid})` : dedans();
    }
    if (LISTES.has(nom)) {
      const depart = Number(n.getAttribute?.('start') ?? 1) || 1;
      const items = Array.from(n.childNodes)
        .filter((x) => x.nodeName.toLowerCase() === 'li')
        .map((li, i) => {
          const x = Array.from(li.childNodes).map(lire).join('').replace(/\n/g, ' ');
          return `${nom === 'ul' ? '•' : `${depart + i}.`} ${x}`;
        });
      return (n.previousSibling ? '\n' : '') + items.join('\n');
    }
    const couleur = (n.getAttribute?.('class') ?? '').split(/\s+/).find((c) => c in COULEURS_TEXTE);
    const b = BALISES[nom] ?? (nom === 'span' && couleur ? (couleur as BaliseTexte) : undefined);
    if (b) {
      const x = dedans();
      return x ? `${apresListe ? '\n' : ''}<${b}>${x}</${b}>` : '';
    }
    if (nom === 'div' || nom === 'p') return (n.previousSibling ? '\n' : '') + dedans();
    return (apresListe ? '\n' : '') + dedans();
  };
  return Array.from(racine.childNodes)
    .map((n) =>
      n.nodeType === 3 && n.previousSibling && LISTES.has(n.previousSibling.nodeName.toLowerCase())
        ? `\n${lire(n)}`
        : lire(n),
    )
    .join('')
    .replace(new RegExp(`<(${BALISES_TEXTE.join('|')})></\\1>`, 'g'), '');
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
