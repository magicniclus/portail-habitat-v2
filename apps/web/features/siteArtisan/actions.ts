import {
  blocsTexte,
  COULEURS_TEXTE,
  RE_BALISE_TEXTE,
  type Action,
  type PageSite,
} from '@ph/core/sites';
import { esc } from './html';

const chiffres = (t: string) => t.replace(/[^\d+]/g, '');

/** Ce qu'un lien doit connaître du site : ses pages, et l'URL des fichiers à télécharger. */
export interface CibleLiens {
  pages: Record<string, Pick<PageSite, 'slug'>>;
  media?: (src: string) => string | null;
}

/** Lien d'une action (bouton, image, menu, mot lié) ; `null` = rien de cliquable. */
export function lienAction(
  a: Action,
  { pages, media }: CibleLiens,
): { href: string; externe: boolean; nofollow: boolean; popup?: boolean } | null {
  const lien = (href: string, externe = false, nofollow = false) => ({ href, externe, nofollow });
  switch (a.type) {
    case 'page': {
      const p = a.page ? pages[a.page] : undefined;
      return p ? lien(`/${p.slug}${a.ancre ? `#${a.ancre}` : ''}`, Boolean(a.onglet)) : null;
    }
    case 'ancre':
      return a.ancre ? lien(`#${a.ancre}`) : null;
    case 'url':
      return a.url?.startsWith('https://')
        ? lien(a.url, a.onglet !== false, a.nofollow !== false)
        : null;
    case 'tel':
      return a.tel ? lien(`tel:${chiffres(a.tel)}`) : null;
    case 'sms':
      return a.tel ? lien(`sms:${chiffres(a.tel)}`) : null;
    case 'whatsapp':
      return a.tel
        ? lien(
            `https://wa.me/${chiffres(a.tel).replace(/^0/, '33').replace(/^\+/, '')}${a.message ? `?text=${encodeURIComponent(a.message)}` : ''}`,
            true,
          )
        : null;
    case 'email': {
      if (!a.email) return null;
      const q = [
        a.objet ? `subject=${encodeURIComponent(a.objet)}` : '',
        a.message ? `body=${encodeURIComponent(a.message)}` : '',
      ]
        .filter(Boolean)
        .join('&');
      return lien(`mailto:${a.email}${q ? `?${q}` : ''}`);
    }
    case 'formulaire':
      return a.formulaire === 'popup'
        ? { ...lien('#formulaire'), popup: true }
        : lien('#formulaire');
    case 'fichier': {
      const url = a.fichierId ? media?.(a.fichierId) : null;
      return url ? lien(url, true) : null;
    }
    case 'aucun':
      return null;
  }
}

/** `<a …>` d'une action, ou `<span>` si l'action ne mène nulle part. */
export function balise(
  a: Action,
  cible: CibleLiens,
  classe: string,
  contenu: string,
  style = '',
): string {
  const l = lienAction(a, cible);
  const s = style ? ` style="${esc(style)}"` : '';
  if (!l) return `<span class="${classe}"${s}>${contenu}</span>`;
  const rel = [l.externe ? 'noopener noreferrer' : '', l.nofollow ? 'nofollow' : '']
    .filter(Boolean)
    .join(' ');
  const plus = `${l.externe ? ' target="_blank"' : ''}${rel ? ` rel="${rel}"` : ''}${l.popup ? ' data-fenetre="formulaire"' : ''}`;
  return `<a class="${classe}" href="${esc(l.href)}"${plus}${s}>${contenu}</a>`;
}

const RE_RICHE = new RegExp(`${RE_BALISE_TEXTE.source}|\\[([^\\]]+)\\]\\(#(L\\d+)\\)`, 'g');

/** Balise HTML d'une balise du texte riche (couleurs : `span` de classe `ka`, `kp`…). */
const ouvrir = (b: string) => (b in COULEURS_TEXTE ? `<span class="${b}">` : `<${b}>`);
const fermer = (b: string) => (b in COULEURS_TEXTE ? '</span>' : `</${b}>`);

/** Une ligne ou un paragraphe : tout est échappé, seules les balises équilibrées et les liens connus sont rendus. */
function enLigne(
  texte: string,
  liens: Record<string, Action> | undefined,
  cible: CibleLiens,
  edition: boolean,
): string {
  const ouvertes: string[] = [];
  let out = '';
  let i = 0;
  for (const m of texte.matchAll(RE_RICHE)) {
    out += esc(texte.slice(i, m.index)).replace(/\n/g, '<br>');
    i = m.index! + m[0].length;
    if (m[2]) {
      if (!m[1]) {
        ouvertes.push(m[2]);
        out += ouvrir(m[2]);
      } else if (ouvertes.at(-1) === m[2]) {
        ouvertes.pop();
        out += fermer(m[2]);
      }
    } else {
      const a = liens?.[m[4]!];
      const lien = a ? balise(a, cible, 'lien', esc(m[3])) : esc(m[3]);
      out += edition && a ? lien.replace(/^<(a|span) /, `<$1 data-lid="${m[4]}" `) : lien;
    }
  }
  out += esc(texte.slice(i)).replace(/\n/g, '<br>');
  while (ouvertes.length) out += fermer(ouvertes.pop()!);
  return out;
}

/**
 * Texte riche de l'éditeur (`texteRiche.ts` du cœur) → HTML : gras, italique, souligné, barré,
 * exposant, surligné, couleurs du thème, mots liés ; listes à puces ou numérotées (textes
 * seulement : un titre garde ses lignes).
 */
export function texteRiche(
  texte: string,
  liens: Record<string, Action> | undefined,
  cible: CibleLiens,
  /** Éditeur : chaque lien garde son identifiant (modification directe sur la page). */
  edition = false,
  listes = true,
): string {
  if (!listes) return enLigne(texte, liens, cible, edition);
  return blocsTexte(texte)
    .map((b) => {
      if (b.type === 'texte') return enLigne(b.lignes.join('\n'), liens, cible, edition);
      const items = b.lignes.map((l) => `<li>${enLigne(l, liens, cible, edition)}</li>`).join('');
      return b.type === 'puces'
        ? `<ul class="tl">${items}</ul>`
        : `<ol class="tl"${b.depart && b.depart > 1 ? ` start="${b.depart}"` : ''}>${items}</ol>`;
    })
    .join('');
}
