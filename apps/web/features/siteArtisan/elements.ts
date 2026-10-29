import {
  LIBELLES_ELEMENT,
  resoudreCouleur,
  texteSur,
  type Appareil,
  type ChampFormulaire,
  type Couleur,
  type Element,
  type Navigation,
  type PageSite,
  type SuiviSite,
  type Theme,
} from '@ph/core/sites';
import { balise, texteRiche } from './actions';
import { esc } from './html';
import { rendreCartesBlog, type ArticleRendu, type ClassementRendu } from './blog';
import { marquerEdition } from './edition';
import { rendreFormulaire } from './formulaire';

export interface ContexteRendu {
  pages: Record<string, Pick<PageSite, 'slug'>>;
  /** `lib:…` / `up:…` → URL publique de l'image ; `null` si introuvable. */
  media: (src: string) => string | null;
  champs: readonly ChampFormulaire[];
  turnstileSiteKey?: string;
  /** Éditeur seulement : sections et éléments changés par une proposition de l'IA. */
  surligner?: ReadonlySet<string>;
  /** Articles publiés du site, pour l'élément « Articles du blog » (BLOG §6). */
  blog?: { articles: readonly ArticleRendu[]; classement: ClassementRendu };
  /** Aperçu de l'éditeur : chaque zone, section, bloc et contenu se sélectionne au clic. */
  edition?: boolean;
  /** Mode Aperçu de l'éditeur : liens et fenêtres actifs, rien n'est envoyé ni compté. */
  apercu?: boolean;
  /** Balise Google et pixel Meta du site publié (derrière le consentement). */
  suivi?: SuiviSite;
  /** Thème et navigation du site : fournis par `rendreDocument`. */
  theme?: Theme;
  navigation?: Navigation;
}

const JETONS: Record<string, string> = {
  primaire: 'var(--primaire)',
  accent: 'var(--accent)',
  clair: 'var(--clair)',
  sombre: 'var(--sombre)',
  blanc: 'white',
};
/** Couleur du thème ou CSS déjà validée par le schéma ; `auto` / `aucun` → rien. */
export const css = (c: Couleur | undefined) =>
  !c || c === 'auto' || c === 'aucun' ? '' : (JETONS[c] ?? c).replace(/[;"<>{}]/g, '');

/** Variables par appareil (`--d`, `--t`, `--m`) : un réglage mobile ne touche pas l'ordinateur (SITE-02). */
export const parAppareil = (nom: string, v: Record<Appareil, number>, unite = 'px') =>
  `--${nom}d:${v.desktop}${unite};--${nom}t:${v.tablet}${unite};--${nom}m:${v.mobile}${unite};`;

export const masques = (m: Record<Appareil, boolean>) =>
  [m.desktop ? 'hd' : '', m.tablet ? 'ht' : '', m.mobile ? 'hm' : ''].filter(Boolean).join(' ');

const ALIGN = { left: '', center: 'text-align:center;', right: 'text-align:right;' } as const;
const COTE = { left: '', center: 'ac', right: 'ad' } as const;
const couleur = (c: Couleur) => (css(c) ? `--col:${css(c)};` : '');

/** Couleurs d'un bouton : fond, texte, contour ; sur fond foncé, « principale » passe en accent. */
function couleursBouton(c: Couleur, fonce: boolean, theme?: Theme): string {
  const jeton = fonce && c === 'primaire' ? 'accent' : c === 'auto' ? 'primaire' : c;
  const fond = css(jeton) || 'var(--primaire)';
  const reel = theme ? resoudreCouleur(jeton, theme.palette) : null;
  const texte = texteSur(reel) === 'blanc' ? 'white' : 'var(--sombre)';
  return `--bb:${fond};--bt:${texte};--bc:${fonce ? 'white' : fond};`;
}

/** Texte différent sur mobile : deux versions, une seule visible selon l'appareil. */
function avecMobile(e: Element, html: string, rendreMobile: (t: string) => string): string {
  if (!e.p.texteMobileOn || !e.p.texteMobile) return html;
  return `<span class="nm">${html}</span><span class="om">${rendreMobile(e.p.texteMobile)}</span>`;
}

export function rendreElement(e: Element, ctx: ContexteRendu, fonce = false): string {
  const html = rendreBrut(e, ctx, fonce);
  if (!ctx.edition) return html;
  const texte =
    e.p.texteMobileOn || !html
      ? undefined
      : e.type === 'titre' || e.type === 'texte'
        ? 'riche'
        : e.type === 'surtitre' || e.type === 'bouton'
          ? 'simple'
          : undefined;
  return marquerEdition(
    html || `<div class="${masques(e.p.masque)} el ed-vide">${LIBELLES_ELEMENT[e.type]}</div>`,
    e.id,
    'element',
    texte,
  );
}

const ratio = (r: string) => r.replace(/[^\d /.]/g, '') || '4 / 3';

function rendreBrut(e: Element, ctx: ContexteRendu, fonce: boolean): string {
  const base = `${masques(e.p.masque)} el${ctx.surligner?.has(e.id) ? ' ia-modifie' : ''}`.trim();
  const mb = `margin-bottom:${e.p.mb}px;`;
  const id = e.p.htmlId ? ` id="${esc(e.p.htmlId)}"` : '';
  const riche = (t: string) =>
    texteRiche(t, 'liens' in e.p ? e.p.liens : undefined, ctx, ctx.edition);
  switch (e.type) {
    case 'titre':
    case 'texte': {
      const lien = `${e.p.lienCouleur ? `--lc:${css(e.p.lienCouleur) || 'inherit'};` : ''}`;
      const style = `${mb}${parAppareil('f', e.p.taille)}${ALIGN[e.p.align]}${couleur(e.p.couleur)}${lien}`;
      const cls = `${base} ts ${e.type === 'titre' ? 't' : `txt${e.p.align === 'center' ? ' ct' : ''}`}${e.p.lienSouligne === false ? ' ns' : ''}`;
      const balise_ = e.type === 'titre' ? e.p.niveau : 'div';
      return `<${balise_}${id} class="${cls}" style="${esc(style)}">${avecMobile(e, riche(e.p.texte), riche)}</${balise_}>`;
    }
    case 'surtitre':
      return `<p${id} class="${base} ts sur${e.p.couleur === 'accent' ? ' ac' : ''}" style="${esc(`${mb}${parAppareil('f', e.p.taille)}${ALIGN[e.p.align]}${couleur(e.p.couleur)}`)}">${avecMobile(e, esc(e.p.texte), esc)}</p>`;
    case 'bouton': {
      const lien = balise(
        e.p.action,
        ctx,
        `btn${e.p.variante === 'contour' ? ' contour' : ''}${e.p.largeur === 'plein' ? ' large' : ''}`,
        avecMobile(e, esc(e.p.texte), esc),
        couleursBouton(e.p.couleur, fonce, ctx.theme),
      );
      const cls = `${base} bouton${e.p.enLigne && e.p.largeur !== 'plein' ? ' enligne' : ''}${e.p.largeur === 'plein' ? ' pl' : ''}`;
      return `<div${id} class="${cls}" style="${esc(`${mb}${ALIGN[e.p.align]}`)}">${lien}</div>`;
    }
    case 'image': {
      const url = ctx.media(e.p.src);
      const r = ratio(e.p.ratio);
      const mobile = ['4 / 3', '4/3', '3 / 4', '3/4', '1 / 1', '1/1'].includes(e.p.ratio)
        ? '16 / 9'
        : r;
      const voile =
        css(e.p.voile) && e.p.voileOpacite
          ? `--voile:${css(e.p.voile)};--vo:${e.p.voileOpacite / 100};`
          : '';
      const style = `${mb}--ar:${r};--arm:${mobile};--ra:${e.p.arrondi}px;--of:${e.p.ajuste};--op:${e.p.pos.replace(/[^a-z %]/g, '')};${voile}`;
      const img = url
        ? `<img src="${esc(url)}" alt="${esc(e.p.legende)}" loading="lazy" decoding="async">`
        : `<span class="vide" role="img" aria-label="${esc(e.p.legende)}"></span>`;
      return `<figure${id} class="${base} image" style="${esc(style)}">${balise(e.p.action, ctx, 'img', img)}</figure>`;
    }
    case 'liste':
      return `<ul${id} class="${base} liste ${COTE[e.p.align]}" style="${esc(`${mb}${couleur(e.p.couleur)}`)}">${e.p.items.map((x) => `<li><span class="puce" aria-hidden="true">${esc(e.p.icone)}</span><span>${esc(x)}</span></li>`).join('')}</ul>`;
    case 'avis':
      return `<blockquote${id} class="${base} avis" style="${esc(`${mb}${ALIGN[e.p.align]}`)}"><span class="etoiles" role="img" aria-label="${e.p.note} étoiles sur 5">${'★'.repeat(e.p.note)}${'☆'.repeat(5 - e.p.note)}</span><p>${esc(e.p.texte)}</p><footer>${esc(e.p.nom)}</footer></blockquote>`;
    case 'chiffre':
      return `<div${id} class="${base} chiffre" style="${esc(`${mb}${ALIGN[e.p.align]}${couleur(e.p.couleur)}`)}"><strong class="ts" style="${esc(parAppareil('f', e.p.taille))}">${esc(e.p.valeur)}</strong><span>${esc(e.p.label)}</span></div>`;
    case 'formulaire':
      return rendreFormulaire(e.p.bouton, ctx, base, mb);
    case 'video': {
      const v = e.p.url?.match(
        /^https:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,20})/,
      );
      if (v)
        return `<div${id} class="${base} video" style="${esc(mb)}"><iframe src="https://www.youtube-nocookie.com/embed/${esc(v[1]!)}" title="${esc(e.p.legende || 'Vidéo')}" loading="lazy" allowfullscreen></iframe></div>`;
      return ctx.edition
        ? `<div${id} class="${base} video" style="${esc(mb)}"><span class="vide">▶ ${esc(e.p.legende || 'Collez le lien YouTube dans les réglages')}</span></div>`
        : '';
    }
    case 'carte':
      return `<p${id} class="${base} carte" style="${esc(mb)}"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z"/><circle cx="12" cy="10" r="2"/></svg>${esc(e.p.adresse || e.p.legende)}</p>`;
    case 'espace':
      return `<div class="${base} espace" style="${esc(parAppareil('h', e.p.hauteur))}" aria-hidden="true"></div>`;
    case 'separateur':
      return `<hr class="${base}${e.p.largeur === 'court' ? ' court' : ''} ${COTE[e.p.align]}" style="${esc(mb)}">`;
    case 'logo':
      return `<p${id} class="${base} logo-el" style="${esc(mb)}">${esc(e.p.texte)}</p>`;
    case 'menu': {
      const liens = (ctx.navigation?.liens ?? [])
        .map((l) => balise(l.action, ctx, '', esc(l.label)))
        .join('');
      return liens
        ? `<nav${id} class="${base} menu-el" aria-label="Menu" style="${esc(`${mb}justify-content:${{ left: 'flex-start', center: 'center', right: 'flex-end' }[e.p.align]};`)}">${liens}</nav>`
        : '';
    }
    case 'blog':
      return ctx.blog
        ? rendreCartesBlog(ctx.blog.articles, e.p, {
            media: ctx.media,
            classement: ctx.blog.classement,
            classe: base,
          })
        : '';
  }
}
