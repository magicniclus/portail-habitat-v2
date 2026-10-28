import type { Navigation, PageSite, Theme } from '@ph/core/sites';
import { STYLE_BLOG } from './blog';
import { SCRIPT_EDITION, STYLE_EDITION } from './edition';
import type { ContexteRendu } from './elements';
import { esc } from './html';
import { rendreNavigation, STYLE_NAV } from './navigation';
import { rendreSection } from './sections';
import { feuilleDeStyle } from './styles';

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

export function rendreDocument(d: DocumentSite, contexte: ContexteRendu): string {
  const ctx: ContexteRendu = { ...contexte, theme: d.theme, navigation: d.navigation };
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
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(d.page.seo.title || d.page.nom)}</title><meta name="description" content="${esc(d.page.seo.meta)}"><link rel="canonical" href="${esc(canonique)}">${d.noindex ? '<meta name="robots" content="noindex">' : ''}<meta property="og:title" content="${esc(d.page.seo.title || d.page.nom)}"><meta property="og:description" content="${esc(d.page.seo.meta)}"><meta property="og:url" content="${esc(canonique)}"><style>${feuilleDeStyle(d.theme)}${STYLE_NAV}${STYLE_BLOG}${ctx.surligner?.size ? SURLIGNAGE : ''}${ctx.edition ? STYLE_EDITION : ''}</style><script type="application/ld+json">${jsonLd}</script>${ctx.turnstileSiteKey ? '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>' : ''}</head><body>${d.page.sansNavigation ? '' : rendreNavigation(d.navigation, ctx, d.page.slug)}<main>${sections}</main><footer class="pied">${mentions ? `<p><a href="/${esc(mentions[1].slug)}">Mentions légales</a></p>` : ''}${mention}</footer><script>${ctx.edition ? SCRIPT_EDITION : SCRIPT_SITE}</script></body></html>`;
}
