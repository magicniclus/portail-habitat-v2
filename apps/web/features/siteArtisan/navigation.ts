import {
  navigationComplete,
  resoudreCouleur,
  texteSur,
  estFonce,
  type Navigation,
  type Theme,
} from '@ph/core/sites';
import { balise } from './actions';
import { marquerEdition } from './edition';
import { css, parAppareil, type ContexteRendu } from './elements';
import { esc } from './html';

const FLECHE = { gauche: 'flex-start', centre: 'center', droite: 'flex-end' } as const;
const icone = (d: string, t = 22) =>
  `<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="${d}"/></svg>`;
const BURGER = 'M4 7h16M4 12h16M4 17h16';
const CROIX = 'M6 6l12 12M18 6 6 18';
const TEL =
  'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2';

/** Styles de la barre et du menu mobile (variables posées par `rendreNavigation`). */
export const STYLE_NAV = `.nav{position:relative;z-index:20;background:var(--nf);color:var(--nt);font-size:15px}.nav.fixe{position:sticky;top:0}.nav.ombre{box-shadow:0 1px 0 rgba(20,30,40,.06),0 6px 16px rgba(20,30,40,.06)}
.nav.transp{position:absolute;left:0;right:0;background:transparent;box-shadow:none}.nav.transp~main>.s:first-child{padding-top:calc(var(--pd) + 76px)}
.nav .in{display:flex;align-items:center;gap:20px;max-width:calc(var(--max) + 2 * var(--px));margin:0 auto;padding:var(--nhd) var(--px);min-height:42px}
.marque{display:flex;align-items:center;gap:10px;min-width:0;color:inherit;text-decoration:none;order:1}.marque img{height:var(--ltd);width:auto;max-width:180px;object-fit:contain}
.marque .ini{width:var(--ltd);height:var(--ltd);border-radius:calc(var(--ltd)/4);background:var(--lf);color:var(--lt)}.marque .nom{font-family:inherit;font-size:19px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nav .liens{display:flex;flex:1;flex-wrap:wrap;gap:26px;justify-content:var(--na);order:2}.nav .liens a{color:inherit;text-decoration:none;font-weight:500;white-space:nowrap}.nav .liens a[aria-current]{font-weight:700;text-decoration:underline;text-underline-offset:6px}
.nav .droite{display:flex;gap:14px;align-items:center;order:3}.nav .tel{font-weight:700;color:inherit;text-decoration:none;white-space:nowrap}
.cta{display:inline-flex;align-items:center;justify-content:center;padding:10px 16px;border-radius:var(--rayon);background:var(--cb);color:var(--ct);font-weight:700;font-size:14px;white-space:nowrap;text-decoration:none;min-height:44px}
.burger,.telmini,.ctamini{display:none}.burger{width:44px;height:44px;border:0;background:transparent;color:var(--bt,inherit);align-items:center;justify-content:center;cursor:pointer;padding:0;order:var(--bo,4)}
.telmini{width:44px;height:44px;border-radius:min(var(--rayon),22px);border:1.5px solid currentColor;align-items:center;justify-content:center;color:inherit;order:2}
.tiroir{position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;overflow-y:auto;padding:16px 22px 28px;background:var(--tf);color:var(--tt);transform:translateX(var(--sens,100%));transition:transform .32s cubic-bezier(.2,.8,.2,1);visibility:hidden}
.ouvert .tiroir{transform:none;visibility:visible}.ouvert{overflow:hidden}.tiroir .haut{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}.tiroir .marque{order:0;flex:1}.ouvert .appel{display:none!important}
.tiroir .fermer{width:44px;height:44px;border:0;background:transparent;color:inherit;display:flex;align-items:center;justify-content:center;cursor:pointer}
.tiroir .lm{display:flex;justify-content:space-between;align-items:center;padding:14px 0;font-size:var(--tz);font-weight:600;color:inherit;text-decoration:none}.tiroir.sep .lm{border-bottom:1px solid var(--ts)}
.tiroir .cta{margin-top:18px;padding:14px 18px;font-size:16px}.tiroir .telm{display:flex;justify-content:center;padding:12px;margin-top:10px;font-weight:700;border:1.5px solid var(--ts);border-radius:var(--rayon);color:inherit;text-decoration:none}
.appel{display:none}
@media (max-width:1023px){.nav .liens,.nav .droite{display:none}.burger{display:inline-flex}.marque{flex:1}.nav .in{padding:var(--nht) var(--px);gap:10px}.marque img{height:var(--ltt)}.marque .ini{width:var(--ltt);height:var(--ltt)}.telmini.on{display:inline-flex}.ctamini.on{display:inline-flex;order:2}}
@media (max-width:767px){.nav .in{padding:var(--nhm) var(--px)}.marque .nom{font-size:16px}.marque img{height:var(--ltm)}.marque .ini{width:var(--ltm);height:var(--ltm)}.telmini.on,.ctamini.on{display:none}
.appel.on{display:grid;grid-template-columns:1fr 1.4fr;gap:10px;position:fixed;left:0;right:0;bottom:0;z-index:30;padding:12px 14px;background:white;box-shadow:0 -6px 18px rgba(20,30,40,.14)}body:has(.appel.on){padding-bottom:76px}
.appel a{display:flex;align-items:center;justify-content:center;gap:8px;min-height:50px;border-radius:var(--rayon);font-weight:700;font-size:16px;text-decoration:none}.appel .a1{border:2px solid var(--primaire);color:var(--primaire)}.appel .a2{background:var(--cb);color:var(--ct)}}
@media (prefers-reduced-motion:reduce){.tiroir{transition:none}}`;

const fondCss = (c: Parameters<typeof css>[0], t?: Theme) =>
  t ? resoudreCouleur(c!, t.palette) : null;

/** Navigation globale (SITE-11) : barre, menu mobile plein écran et barre d'appel du mobile. */
export function rendreNavigation(nav: Navigation, ctx: ContexteRendu, slugActif: string): string {
  const n = navigationComplete(nav);
  const t = ctx.theme;
  const fonce = estFonce(fondCss(n.fond, t));
  const texte = css(n.texte) || (fonce ? 'white' : 'var(--sombre)');
  const ctaFond = css(n.cta.couleur) || 'var(--primaire)';
  const ctaTexte =
    css(n.cta.texteCouleur) ||
    (texteSur(fondCss(n.cta.couleur, t)) === 'blanc' ? 'white' : 'var(--sombre)');
  const logoFond = css(n.logo.fond) || 'var(--primaire)';
  const logoTexte = texteSur(fondCss(n.logo.fond, t)) === 'blanc' ? 'white' : 'var(--sombre)';
  const tiroirFonce = estFonce(fondCss(n.mobile.fond, t));
  const style =
    `--nf:${css(n.fond) || 'white'};--nt:${texte};--na:${FLECHE[n.align]};--cb:${ctaFond};--ct:${ctaTexte};--lf:${logoFond};--lt:${logoTexte};` +
    parAppareil('nh', n.hauteur) +
    parAppareil('lt', n.logo.taille) +
    `--bt:${css(n.mobile.traits) || 'inherit'};--bo:${n.mobile.burger === 'gauche' ? 0 : 4};`;
  const image = n.logo.image ? ctx.media(n.logo.image) : null;
  const logo =
    n.logo.mode === 'nom'
      ? ''
      : image
        ? `<img src="${esc(image)}" alt="">`
        : `<span class="ini">${esc(n.logo.initiales || n.nom.slice(0, 2).toUpperCase())}</span>`;
  const nom = n.logo.mode === 'logo' ? '' : `<span class="nom">${esc(n.nom)}</span>`;
  const actif = (h: string) => (h === `/${slugActif}` ? ' aria-current="page"' : '');
  const liens = n.liens
    .map((l) => {
      const h = balise(l.action, ctx.pages, '', esc(l.label));
      return h.replace(/^<a /, `<a${actif(h.match(/href="([^"]*)"/)?.[1] ?? '')} `);
    })
    .join('');
  const numero = n.tel.numero.replace(/[^\d+]/g, '');
  const tel =
    n.tel.visible && numero
      ? `<a class="tel" href="tel:${esc(numero)}">${esc(n.tel.numero)}</a>`
      : '';
  const cta = n.cta.visible ? balise(n.cta.action, ctx.pages, 'cta', esc(n.cta.texte)) : '';
  const mini = `${n.mobile.cta && n.cta.visible ? balise(n.cta.action, ctx.pages, `cta ctamini on`, esc(n.cta.texte)) : ''}${n.mobile.tel && tel ? `<a class="telmini on" href="tel:${esc(numero)}" aria-label="Appeler le ${esc(n.tel.numero)}">${icone(TEL, 18)}</a>` : ''}`;
  const tiroirStyle = `--tf:${css(n.mobile.fond) || 'white'};--tt:${tiroirFonce ? 'white' : 'var(--sombre)'};--ts:${tiroirFonce ? 'rgba(255,255,255,.16)' : 'rgba(20,30,40,.1)'};--tz:${n.mobile.taille}px;${n.mobile.sens === 'gauche' ? '--sens:-100%;' : ''}`;
  const liensMobiles = n.liens
    .map((l) =>
      balise(
        l.action,
        ctx.pages,
        'lm',
        `<span>${esc(l.label)}</span><span aria-hidden="true">›</span>`,
      ),
    )
    .join('');
  const tiroir = `<nav id="menu" class="tiroir${n.mobile.separateurs ? ' sep' : ''}" aria-label="Menu principal" style="${esc(tiroirStyle)}"><div class="haut"><span class="marque">${logo}${nom}</span><button type="button" class="fermer" aria-label="Fermer le menu" data-fermer>${icone(CROIX)}</button></div>${liensMobiles}${n.mobile.ctaMenu && n.cta.visible ? balise(n.cta.action, ctx.pages, 'cta', esc(n.cta.texte)) : ''}${tel ? `<a class="telm" href="tel:${esc(numero)}">Appeler le ${esc(n.tel.numero)}</a>` : ''}</nav>`;
  const classes = [
    'nav',
    n.fixe ? 'fixe' : '',
    n.ombre ? 'ombre' : '',
    n.transparente ? 'transp' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const barre = `<header class="${classes}" style="${esc(style)}"><div class="in"><a class="marque" href="/">${logo}${nom}</a><div class="liens">${liens}</div><div class="droite">${tel}${cta}</div>${mini}<button type="button" class="burger" aria-label="Ouvrir le menu" aria-expanded="false" aria-controls="menu" data-burger>${icone(BURGER)}</button></div>${tiroir}</header>`;
  const appel =
    n.mobile.barreAppel && (tel || n.cta.visible)
      ? `<div class="appel on" style="${esc(`--cb:${ctaFond};--ct:${ctaTexte};`)}">${tel ? `<a class="a1" href="tel:${esc(numero)}">${icone(TEL, 18)}Appeler</a>` : ''}${n.cta.visible ? balise(n.cta.action, ctx.pages, 'a2', esc(n.cta.texte)) : ''}</div>`
      : '';
  return (ctx.edition ? marquerEdition(barre, 'nav', 'nav') : barre) + appel;
}
