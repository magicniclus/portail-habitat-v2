import type { Navigation, PageSite, Theme } from '@ph/core/sites';
import { SCRIPT_APERCU } from './apercu';
import { STYLE_BLOG } from './blog';
import { SCRIPT_EDITION, STYLE_EDITION } from './edition';
import type { ContexteRendu } from './elements';
import { fenetreFormulaire } from './formulaire';
import { esc } from './html';
import { faviconSite, rendreNavigation, STYLE_NAV } from './navigation';
import { rendreSection } from './sections';
import { feuilleDeStyle } from './styles';

/**
 * Comportements : mesure d'audience sans cookie (une balise par page vue), menu mobile (SITE-10),
 * fenêtre du formulaire et envoi du formulaire vers l'API du même domaine.
 */
export const SCRIPT_SITE = `(function(){try{navigator.sendBeacon('/api/sites/t',JSON.stringify({p:location.pathname}));}catch(e){}var d=document,h=d.documentElement,b=d.querySelector('[data-burger]');function m(o){h.classList.toggle('ouvert',o);b&&b.setAttribute('aria-expanded',String(o));}
if(b){b.addEventListener('click',function(){m(true);});d.querySelector('[data-fermer]').addEventListener('click',function(){m(false);});d.querySelectorAll('#menu a').forEach(function(a){a.addEventListener('click',function(){m(false);});});d.addEventListener('keydown',function(e){if(e.key==='Escape')m(false);});}
var w=d.getElementById('fenetre-formulaire');if(w){d.querySelectorAll('[data-fenetre]').forEach(function(a){a.addEventListener('click',function(e){e.preventDefault();m(false);w.showModal();});});w.querySelector('[data-fermer-fenetre]').addEventListener('click',function(){w.close();});w.addEventListener('click',function(e){if(e.target===w)w.close();});}
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

/** Éditeur : page vierge, invitation à ajouter la première zone, section ou contenu. */
const PAGE_VIERGE =
  '<div class="ed-vierge"><button type="button" class="plus" data-ed-op="zone" aria-label="Ajouter une zone">+</button><strong>Commencez votre page</strong><p>Choisissez une zone prête à remplir, une section de colonnes ou un simple contenu.</p><div class="ed-choix"><button type="button" data-ed-op="zone">Zone prête<small>Bandeau, avis, contact…</small></button><button type="button" data-ed-op="section">Section<small>1 à 6 colonnes vides</small></button><button type="button" data-ed-op="contenu">Contenu<small>Titre, texte, image…</small></button></div></div>';

export function rendreDocument(d: DocumentSite, contexte: ContexteRendu): string {
  const ctx: ContexteRendu = { ...contexte, theme: d.theme, navigation: d.navigation };
  const canonique = `https://${d.hote}/${d.page.slug}`;
  const sections =
    d.contenu ??
    (d.page.sections.length || !ctx.edition
      ? d.page.sections.map((s) => rendreSection(s, ctx)).join('')
      : PAGE_VIERGE);
  const nav =
    d.page.sansNavigation || d.navigation.masquee
      ? ''
      : rendreNavigation(d.navigation, ctx, d.page.slug);
  // Un bouton « Formulaire » en fenêtre sur la page : la fenêtre est ajoutée une fois.
  const fenetre = /data-fenetre="formulaire"/.test(sections + nav) ? fenetreFormulaire(ctx) : '';
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
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(d.page.seo.title || d.page.nom)}</title>${faviconSite(d.navigation, ctx)}<meta name="description" content="${esc(d.page.seo.meta)}"><link rel="canonical" href="${esc(canonique)}">${d.noindex ? '<meta name="robots" content="noindex">' : ''}<meta property="og:title" content="${esc(d.page.seo.title || d.page.nom)}"><meta property="og:description" content="${esc(d.page.seo.meta)}"><meta property="og:url" content="${esc(canonique)}"><style>${feuilleDeStyle(d.theme)}${STYLE_NAV}${STYLE_BLOG}${ctx.surligner?.size ? SURLIGNAGE : ''}${ctx.edition ? STYLE_EDITION : ''}</style><script type="application/ld+json">${jsonLd}</script>${ctx.turnstileSiteKey ? '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>' : ''}</head><body>${nav}<main>${sections}</main>${fenetre}<footer class="pied">${mentions ? `<p><a href="/${esc(mentions[1].slug)}">Mentions légales</a></p>` : ''}${mention}</footer><script>${ctx.edition ? SCRIPT_EDITION : ctx.apercu ? SCRIPT_APERCU : SCRIPT_SITE}</script></body></html>`;
}
