import type { Appareil, ChampFormulaire, Couleur, Element, PageSite } from '@ph/core/sites';
import { balise, texteRiche } from './actions';
import { esc } from './html';

export interface ContexteRendu {
  pages: Record<string, Pick<PageSite, 'slug'>>;
  /** `lib:…` / `up:…` → URL publique de l'image ; `null` si introuvable. */
  media: (src: string) => string | null;
  champs: readonly ChampFormulaire[];
  turnstileSiteKey?: string;
  /** Éditeur seulement : sections et éléments changés par une proposition de l'IA. */
  surligner?: ReadonlySet<string>;
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

const alignement = (a: string) =>
  a === 'center' ? 'text-align:center;' : a === 'right' ? 'text-align:right;' : '';

/** Texte différent sur mobile : deux versions, une seule visible selon l'appareil. */
function avecMobile(e: Element, html: string, rendreMobile: (t: string) => string): string {
  if (!e.p.texteMobileOn || !e.p.texteMobile) return html;
  return `<span class="nm">${html}</span><span class="om">${rendreMobile(e.p.texteMobile)}</span>`;
}

export function rendreElement(e: Element, ctx: ContexteRendu): string {
  const base = `${masques(e.p.masque)} el${ctx.surligner?.has(e.id) ? ' ia-modifie' : ''}`.trim();
  const mb = `margin-bottom:${e.p.mb}px;`;
  const id = e.p.htmlId ? ` id="${esc(e.p.htmlId)}"` : '';
  switch (e.type) {
    case 'titre': {
      const style = `${mb}${parAppareil('f', e.p.taille)}${alignement(e.p.align)}${css(e.p.couleur) ? `color:${css(e.p.couleur)};` : ''}`;
      const contenu = avecMobile(e, texteRiche(e.p.texte, e.p.liens, ctx.pages), (t) =>
        texteRiche(t, e.p.liens, ctx.pages),
      );
      return `<${e.p.niveau}${id} class="${base} ts" style="${esc(style)}">${contenu}</${e.p.niveau}>`;
    }
    case 'surtitre':
      return `<p${id} class="${base} ts sur" style="${esc(`${mb}${parAppareil('f', e.p.taille)}${alignement(e.p.align)}color:${css(e.p.couleur) || 'var(--accent)'};`)}">${avecMobile(e, esc(e.p.texte), esc)}</p>`;
    case 'texte':
      return `<div${id} class="${base} ts txt" style="${esc(`${mb}${parAppareil('f', e.p.taille)}${alignement(e.p.align)}${css(e.p.couleur) ? `color:${css(e.p.couleur)};` : ''}`)}">${avecMobile(e, texteRiche(e.p.texte, e.p.liens, ctx.pages), (t) => texteRiche(t, e.p.liens, ctx.pages))}</div>`;
    case 'bouton': {
      const fond = css(e.p.couleur) || 'var(--primaire)';
      const style =
        e.p.variante === 'plein'
          ? `background:${fond};border-color:${fond};color:white;`
          : `border-color:${fond};color:${fond};background:transparent;`;
      const lien = balise(
        e.p.action,
        ctx.pages,
        `btn${e.p.largeur === 'plein' ? ' plein' : ''}`,
        avecMobile(e, esc(e.p.texte), esc),
        style,
      );
      return `<div${id} class="${base} bouton${e.p.enLigne ? ' enligne' : ''}" style="${esc(`${mb}${alignement(e.p.align)}`)}">${lien}</div>`;
    }
    case 'image': {
      const url = ctx.media(e.p.src);
      const img = url
        ? `<img src="${esc(url)}" alt="${esc(e.p.legende)}" loading="lazy" decoding="async" style="${esc(`aspect-ratio:${e.p.ratio.replace(/[^\d /.]/g, '')};object-fit:${e.p.ajuste};object-position:${e.p.pos.replace(/[^a-z %]/g, '')};border-radius:${e.p.arrondi}px;`)}">`
        : `<span class="vide" role="img" aria-label="${esc(e.p.legende)}" style="aspect-ratio:${esc(e.p.ratio.replace(/[^\d /.]/g, ''))}"></span>`;
      return `<figure${id} class="${base} image" style="${esc(mb)}">${balise(e.p.action, ctx.pages, 'img', img)}</figure>`;
    }
    case 'liste':
      return `<ul${id} class="${base} liste" style="${esc(`${mb}${alignement(e.p.align)}`)}">${e.p.items.map((x) => `<li><span aria-hidden="true">${esc(e.p.icone)}</span> ${esc(x)}</li>`).join('')}</ul>`;
    case 'avis':
      return `<blockquote${id} class="${base} avis" style="${esc(mb)}"><p class="etoiles" role="img" aria-label="${e.p.note} étoiles sur 5">${'★'.repeat(e.p.note)}</p><p>${esc(e.p.texte)}</p><footer>${esc(e.p.nom)}</footer></blockquote>`;
    case 'chiffre':
      return `<div${id} class="${base} chiffre" style="${esc(`${mb}${alignement(e.p.align)}`)}"><strong class="ts" style="${esc(parAppareil('f', e.p.taille))}">${esc(e.p.valeur)}</strong><span>${esc(e.p.label)}</span></div>`;
    case 'formulaire':
      return rendreFormulaire(e.p.bouton, ctx, base, mb);
    case 'video':
      return e.p.url &&
        /^https:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]{6,20}/.test(e.p.url)
        ? `<div${id} class="${base} video" style="${esc(mb)}"><iframe src="https://www.youtube-nocookie.com/embed/${esc(e.p.url.match(/(?:v=|be\/)([\w-]{6,20})/)![1])}" title="${esc(e.p.legende)}" loading="lazy" allowfullscreen></iframe></div>`
        : '';
    case 'carte':
      return `<p${id} class="${base} carte" style="${esc(mb)}">${esc(e.p.adresse || e.p.legende)}</p>`;
    case 'espace':
      return `<div class="${base} espace" style="${esc(parAppareil('h', e.p.hauteur))}" aria-hidden="true"></div>`;
    case 'separateur':
      return `<hr class="${base}${e.p.largeur === 'court' ? ' court' : ''}" style="${esc(mb)}">`;
    case 'logo':
      return `<p class="${base} logo-el" style="${esc(mb)}">${esc(e.p.texte)}</p>`;
    case 'menu':
    case 'blog':
      return '';
  }
}

const TYPES_HTML: Record<string, string> = { email: 'email', tel: 'tel', date: 'date', cp: 'text' };

/** Formulaire du site : champs de la configuration, anti-robot Turnstile, envoi sans rechargement. */
function rendreFormulaire(bouton: string, ctx: ContexteRendu, base: string, mb: string): string {
  const champ = (c: ChampFormulaire) => {
    const id = `f-${esc(c.id)}`;
    const requis = c.requis ? ' required' : '';
    const etoile = c.requis ? ' <span aria-hidden="true">*</span>' : '';
    const label = `<label for="${id}">${esc(c.libelle)}${etoile}</label>`;
    if (c.type === 'zone')
      return `<p>${label}<textarea id="${id}" name="${esc(c.id)}" rows="4"${requis}></textarea></p>`;
    if ((c.type === 'liste' || c.type === 'choix') && c.options)
      return `<p>${label}<select id="${id}" name="${esc(c.id)}"${requis}><option value="">Choisir</option>${c.options.map((o) => `<option>${esc(o)}</option>`).join('')}</select></p>`;
    const extra =
      c.type === 'cp'
        ? ' inputmode="numeric" maxlength="5" pattern="\\d{5}"'
        : c.type === 'tel'
          ? ' autocomplete="tel"'
          : c.type === 'email'
            ? ' autocomplete="email"'
            : '';
    return `<p>${label}<input id="${id}" name="${esc(c.id)}" type="${TYPES_HTML[c.type] ?? 'text'}"${extra}${requis}></p>`;
  };
  return `<form id="formulaire" class="${base} formulaire" style="${esc(mb)}" data-formulaire novalidate>${ctx.champs
    .filter((c) => c.type !== 'photos')
    .map(champ)
    .join(
      '',
    )}${ctx.turnstileSiteKey ? `<div class="cf-turnstile" data-sitekey="${esc(ctx.turnstileSiteKey)}" data-appearance="interaction-only"></div>` : ''}<p class="rgpd">Vos informations servent uniquement à vous recontacter au sujet de votre projet.</p><button type="submit" class="btn plein" style="background:var(--primaire);border-color:var(--primaire);color:white">${esc(bouton)}</button><p class="statut" role="status" aria-live="polite"></p></form>`;
}
