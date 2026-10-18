import type { Navigation, PageSite, Section, Theme } from '@ph/core/sites';
import { balise } from './actions';
import { css, masques, parAppareil, rendreElement, type ContexteRendu } from './elements';
import { STYLE_BLOG } from './blog';
import { esc } from './html';

const POLICES: Record<Theme['polices'], { titre: string; texte: string; poids: number }> = {
  archivo: {
    titre: 'Archivo, Arial, sans-serif',
    texte: '"Source Sans 3", Arial, sans-serif',
    poids: 800,
  },
  dmserif: {
    titre: '"DM Serif Display", Georgia, serif',
    texte: '"Source Sans 3", Arial, sans-serif',
    poids: 400,
  },
  barlow: {
    titre: '"Barlow Condensed", Arial, sans-serif',
    texte: 'Barlow, Arial, sans-serif',
    poids: 700,
  },
};
const SOMBRES = new Set(['primaire', 'sombre', 'accent']);

/** Feuille de style unique : grille à 12 colonnes, réglages par appareil, menu mobile plein écran. */
function feuilleDeStyle(t: Theme): string {
  const p = POLICES[t.polices];
  return `:root{--primaire:${css(t.palette.primaire)};--accent:${css(t.palette.accent)};--clair:${css(t.palette.clair)};--sombre:${css(t.palette.sombre)};--rayon:${t.rayonBoutons}px}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}body{margin:0;font-family:${p.texte};color:var(--sombre);line-height:1.55;background:white}
h1,h2,h3{font-family:${p.titre};font-weight:${p.poids};line-height:1.15;margin:0}p{margin:0}img{max-width:100%;display:block}
.ts{font-size:var(--fd)}.espace{height:var(--hd)}.s{position:relative;padding:var(--pd) 0;background:var(--fond,transparent)}.s.img{background-size:cover}
.s.img::before{content:"";position:absolute;inset:0;background:var(--voile);opacity:var(--vo)}.s>.boite{position:relative;max-width:1180px;margin:0 auto;padding:0 20px}.s>.plein{position:relative;padding:0 20px}
.s.fonce{color:white}.r{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:var(--gap);margin-bottom:24px;align-items:var(--va,stretch)}.c{grid-column:span var(--w);min-width:0}
.btn{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 22px;border:2px solid;border-radius:var(--rayon);font-weight:700;text-decoration:none}.btn.plein{width:100%}
.bouton.enligne{display:inline-block;margin-right:12px}.lien{color:var(--accent);text-decoration:underline}.sur{text-transform:uppercase;letter-spacing:.06em;font-weight:700}
.image{margin:0}.image img,.vide{width:100%}.vide{display:block;background:var(--clair)}.liste{padding:0;list-style:none}.liste li{margin:.3em 0}
.avis{margin:0;padding:20px;border-radius:12px;background:white;color:var(--sombre)}.etoiles{color:var(--accent)}.avis footer{font-weight:700;margin-top:8px}
.chiffre strong{display:block;font-family:${p.titre};font-weight:${p.poids}}.video iframe{width:100%;aspect-ratio:16/9;border:0}hr{border:0;border-top:1px solid currentColor;opacity:.2}hr.court{width:80px}
.formulaire p{margin-bottom:12px}.formulaire label{display:block;font-weight:600;margin-bottom:4px}.formulaire input,.formulaire select,.formulaire textarea{width:100%;min-height:48px;padding:10px 12px;font:inherit;font-size:16px;border:1px solid rgba(0,0,0,.35);border-radius:8px;background:white;color:var(--sombre)}
.rgpd{font-size:13px;opacity:.75}.nav{position:sticky;top:0;z-index:20;background:var(--navfond,white);color:var(--sombre)}.nav.ombre{box-shadow:0 2px 12px rgba(0,0,0,.08)}
.nav .boite{max-width:1180px;margin:0 auto;padding:12px 20px;display:flex;align-items:center;gap:20px}.nav .marque{font-family:${p.titre};font-weight:${p.poids};font-size:20px;text-decoration:none;color:inherit;margin-right:auto}
.nav .liens{display:flex;gap:18px;align-items:center}.nav .liens a{color:inherit;text-decoration:none;font-weight:600}.burger,.fermer{display:none;min-width:44px;min-height:44px;border:0;background:none;font-size:26px;color:inherit;cursor:pointer}
.menu{display:contents}.om{display:none}.pied{padding:24px 20px;text-align:center;font-size:14px;opacity:.8}.pied a{color:inherit}
@media (max-width:1023px){.ts{font-size:var(--ft)}.espace{height:var(--ht)}.s{padding:var(--pt) 0}}
@media (min-width:768px) and (max-width:1023px){.ht{display:none!important}}
@media (min-width:1024px){.hd{display:none!important}}
@media (max-width:767px){.ts{font-size:var(--fm)}.espace{height:var(--hm)}.s{padding:var(--pm) 0}.hm{display:none!important}
.r.e{grid-template-columns:1fr}.r.e>.c{grid-column:auto}.r.e.i{display:flex;flex-direction:column-reverse}.nm{display:none}.om{display:inline}
.burger{display:inline-flex;align-items:center;justify-content:center}.menu{display:block;position:fixed;inset:0;z-index:30;background:white;padding:72px 24px 24px;transform:translateX(var(--sens,100%));transition:transform .25s ease;visibility:hidden}
.ouvert .menu{transform:none;visibility:visible}.menu .liens{flex-direction:column;align-items:flex-start;font-size:20px}.fermer{display:inline-flex;position:absolute;top:12px;right:16px}.ouvert{overflow:hidden}}
@media (prefers-reduced-motion:reduce){.menu{transition:none}}`;
}

function rendreSection(s: Section, ctx: ContexteRendu): string {
  const image = s.p.fondType === 'image' && ctx.media(s.p.fondImage);
  const style =
    parAppareil('p', s.p.padY) +
    (css(s.p.fond) ? `--fond:${css(s.p.fond)};` : '') +
    (image
      ? `background-image:url("${encodeURI(image)}");background-position:${s.p.fondPos};--voile:${css(s.p.voile) || 'black'};--vo:${s.p.voileOpacite / 100};`
      : '');
  const fonce =
    s.p.texteCouleur === 'clair' ||
    (s.p.texteCouleur === 'auto' && (image || SOMBRES.has(s.p.fond)));
  const classes = [
    's',
    image ? 'img' : '',
    fonce ? 'fonce' : '',
    masques(s.p.masque),
    ctx.surligner?.has(s.id) ? 'ia-modifie' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const lignes = s.rows
    .map((r) => {
      const cr = ['r', r.p.empile ? 'e' : '', r.p.inverse ? 'i' : '', masques(r.p.masque)]
        .filter(Boolean)
        .join(' ');
      const cols = r.cols
        .map((c) => {
          const cs = `--w:${c.w};${c.p.pad ? `padding:${c.p.pad}px;` : ''}${c.p.arrondi ? `border-radius:${c.p.arrondi}px;` : ''}${css(c.p.fond) ? `background:${css(c.p.fond)};` : ''}`;
          return `<div class="c ${masques(c.p.masque)}"${c.p.htmlId ? ` id="${esc(c.p.htmlId)}"` : ''} style="${esc(cs)}">${c.els.map((e) => rendreElement(e, ctx)).join('')}</div>`;
        })
        .join('');
      return `<div class="${cr}"${r.p.htmlId ? ` id="${esc(r.p.htmlId)}"` : ''} style="${esc(`--gap:${r.p.gap}px;--va:${r.p.valign}`)}">${cols}</div>`;
    })
    .join('');
  return `<section class="${classes}"${s.p.ancre ? ` id="${esc(s.p.ancre)}"` : ''} style="${esc(style)}"><div class="${s.p.largeur === 'plein' ? 'plein' : 'boite'}">${lignes}</div></section>`;
}

function rendreNavigation(n: Navigation, ctx: ContexteRendu): string {
  const liens = n.liens.map((l) => balise(l.action, ctx.pages, 'lien-nav', esc(l.label))).join('');
  const cta = n.cta.visible
    ? balise(
        n.cta.action,
        ctx.pages,
        'btn',
        esc(n.cta.texte),
        `background:${css(n.cta.couleur) || 'var(--primaire)'};border-color:${css(n.cta.couleur) || 'var(--primaire)'};color:white`,
      )
    : '';
  const tel =
    n.tel.visible && n.tel.numero
      ? `<a href="tel:${esc(n.tel.numero.replace(/[^\d+]/g, ''))}">${esc(n.tel.numero)}</a>`
      : '';
  return `<header class="nav${n.ombre ? ' ombre' : ''}" style="${esc(css(n.fond) ? `--navfond:${css(n.fond)}` : '')}"><div class="boite"><a class="marque" href="/">${esc(n.nom)}</a><button type="button" class="burger" aria-label="Ouvrir le menu" aria-expanded="false" aria-controls="menu" data-burger>☰</button><nav id="menu" class="menu" aria-label="Menu principal" style="${n.mobile.sens === 'gauche' ? '--sens:-100%' : ''}"><button type="button" class="fermer" aria-label="Fermer le menu" data-fermer>×</button><div class="liens">${liens}${tel}${cta}</div></nav></div></header>`;
}

/**
 * Comportements : mesure d'audience sans cookie (une balise par page vue), menu mobile (SITE-10)
 * et envoi du formulaire vers l'API du même domaine.
 */
export const SCRIPT_SITE = `(function(){try{navigator.sendBeacon('/api/sites/t',JSON.stringify({p:location.pathname}));}catch(e){}var d=document,h=d.documentElement,b=d.querySelector('[data-burger]');function m(o){h.classList.toggle('ouvert',o);b&&b.setAttribute('aria-expanded',String(o));}
if(b){b.addEventListener('click',function(){m(true);});d.querySelector('[data-fermer]').addEventListener('click',function(){m(false);});d.querySelectorAll('#menu a').forEach(function(a){a.addEventListener('click',function(){m(false);});});d.addEventListener('keydown',function(e){if(e.key==='Escape')m(false);});}
d.querySelectorAll('[data-formulaire]').forEach(function(f){f.addEventListener('submit',function(e){e.preventDefault();var s=f.querySelector('.statut'),v={},t='';new FormData(f).forEach(function(x,k){if(k==='cf-turnstile-response')t=String(x);else v[k]=String(x);});
s.textContent='Envoi en cours…';fetch('/api/sites/demande',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({valeurs:v,jeton:t,page:location.pathname})}).then(function(r){return r.json();}).then(function(r){if(r&&r.ok){f.reset();s.textContent='Merci, votre demande est envoyée. Nous vous recontactons rapidement.';}else{s.textContent=(r&&r.erreur&&r.erreur.message)||'Envoi impossible, vérifiez les champs.';}}).catch(function(){s.textContent='Envoi impossible, réessayez.';});});});})();`;

export interface DocumentSite {
  hote: string;
  offre: 'gratuit' | 'site_pro';
  theme: Theme;
  navigation: Navigation;
  page: Pick<PageSite, 'slug' | 'nom' | 'seo' | 'sections' | 'sansNavigation'>;
  pages: Record<string, PageSite>;
  nomEntreprise: string;
  urlFiche?: string;
  /** Pages du blog : contenu déjà rendu à la place des sections (BLOG §7). */
  contenu?: string;
  /** Données structurées propres à la page (`BlogPosting`), sinon l'entreprise. */
  jsonLd?: object;
  /** Pages de tag : hors index. */
  noindex?: boolean;
}

/**
 * Page complète d'un site publié : HTML statique, aucun cookie (SITE-07), aucun script tiers hors
 * Turnstile. Canonique sur l'hôte servi ; mention Portail Travaux sur les sites gratuits.
 */
/** Contour des changements proposés par l'IA (aperçu de l'éditeur, jamais en ligne). */
const SURLIGNAGE =
  '.ia-modifie{outline:3px dashed var(--accent);outline-offset:3px;scroll-margin:80px}';

export function rendreDocument(d: DocumentSite, ctx: ContexteRendu): string {
  const canonique = `https://${d.hote}/${d.page.slug}`;
  const sections = d.contenu ?? d.page.sections.map((s) => rendreSection(s, ctx)).join('');
  const jsonLd = JSON.stringify(
    d.jsonLd ?? {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: d.nomEntreprise,
      url: `https://${d.hote}/`,
    },
  ).replace(/</g, '\\u003c');
  const mention =
    d.offre === 'gratuit'
      ? `<p>Site créé avec <a href="https://portailtravaux.fr/pro/site-internet-artisan" rel="noopener">Portail Travaux</a>${d.urlFiche ? ` · <a href="${esc(d.urlFiche)}">Voir la fiche Portail Travaux</a>` : ''}</p>`
      : '';
  const mentions = Object.entries(d.pages).find(([, p]) => p.type === 'mentions');
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(d.page.seo.title || d.page.nom)}</title><meta name="description" content="${esc(d.page.seo.meta)}"><link rel="canonical" href="${esc(canonique)}">${d.noindex ? '<meta name="robots" content="noindex">' : ''}<meta property="og:title" content="${esc(d.page.seo.title || d.page.nom)}"><meta property="og:description" content="${esc(d.page.seo.meta)}"><meta property="og:url" content="${esc(canonique)}"><style>${feuilleDeStyle(d.theme)}${STYLE_BLOG}${ctx.surligner?.size ? SURLIGNAGE : ''}</style><script type="application/ld+json">${jsonLd}</script>${ctx.turnstileSiteKey ? '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>' : ''}</head><body>${d.page.sansNavigation ? '' : rendreNavigation(d.navigation, ctx)}<main>${sections}</main><footer class="pied">${mentions ? `<p><a href="/${esc(mentions[1].slug)}">Mentions légales</a></p>` : ''}${mention}</footer><script>${SCRIPT_SITE}</script></body></html>`;
}
