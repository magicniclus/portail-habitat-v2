import { configSuivi, suiviActif, type SuiviSite } from '@ph/core/sites';
import { esc } from './html';

/**
 * Suivi publicitaire d'un site publié (balise Google, pixel Meta) : rien ne se charge avant
 * « Tout accepter » (CNIL : refuser aussi simple qu'accepter, choix gardé 6 mois, modifiable à
 * tout moment depuis le pied de page). Événements : demande envoyée (generate_lead, Lead,
 * conversion Google Ads) et clic sur un numéro (contact, Contact). Script fixe autorisé par son
 * empreinte dans la CSP des sites ; la configuration est lue en JSON dans la page.
 */
export const SCRIPT_SUIVI = `(function(){var d=document,c,x=d.getElementById('ph-suivi');if(!x)return;try{c=JSON.parse(x.textContent);}catch(e){return;}
var CLE='ph-consentement',b=d.getElementById('ph-bandeau'),actif=false,DUREE=15552000000;
function lire(){try{var v=JSON.parse(localStorage.getItem(CLE)||'null');if(v&&Date.now()-v.t<DUREE)return v.ok===true;}catch(e){}return null;}
function ecrire(ok){try{localStorage.setItem(CLE,JSON.stringify({ok:ok,t:Date.now()}));}catch(e){}}
function charger(src){var s=d.createElement('script');s.async=true;s.src=src;d.head.appendChild(s);}
function activer(){if(actif)return;actif=true;
if(c.gtag||c.gtm||c.ads){window.dataLayer=window.dataLayer||[];window.gtag=function(){window.dataLayer.push(arguments);};window.gtag('js',new Date());
if(c.gtm){window.dataLayer.push({'gtm.start':Date.now(),event:'gtm.js'});charger('https://www.googletagmanager.com/gtm.js?id='+encodeURIComponent(c.gtm));}
var g=c.gtag||(c.ads?c.ads.split('/')[0]:'');if(g){charger('https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(g));if(c.gtag)window.gtag('config',c.gtag);if(c.ads)window.gtag('config',c.ads.split('/')[0]);}}
if(c.meta){var f=window.fbq=function(){f.callMethod?f.callMethod.apply(f,arguments):f.queue.push(arguments);};if(!window._fbq)window._fbq=f;f.push=f;f.loaded=true;f.version='2.0';f.queue=[];charger('https://connect.facebook.net/fr_FR/fbevents.js');f('init',c.meta);f('track','PageView');}}
function evenement(g,m,ads){if(!actif)return;if(window.gtag){window.gtag('event',g);if(ads&&c.ads)window.gtag('event','conversion',{send_to:c.ads});}if(window.fbq)window.fbq('track',m);}
if(c.demande)d.addEventListener('ph:demande',function(){evenement('generate_lead','Lead',true);});
if(c.appel)d.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('a[href^="tel:"]'))evenement('contact','Contact',false);},true);
function montrer(o){if(b)b.hidden=!o;}
function choisir(ok){var avant=actif;ecrire(ok);montrer(false);if(ok)activer();else if(avant)location.reload();}
var v=lire();if(v===true)activer();else if(v===null)montrer(true);
d.querySelectorAll('[data-consentement]').forEach(function(a){a.addEventListener('click',function(e){e.preventDefault();var o=a.getAttribute('data-consentement');if(o==='oui')choisir(true);else if(o==='non')choisir(false);else montrer(true);});});})();`;

export const STYLE_CONSENTEMENT = `.consentement{position:fixed;left:16px;right:16px;bottom:16px;z-index:60;max-width:720px;margin:0 auto;display:grid;gap:12px;padding:18px 20px;border-radius:14px;background:white;color:var(--sombre);box-shadow:0 12px 40px rgba(0,0,0,.18);font-size:14px;line-height:1.5}.consentement[hidden]{display:none}.consentement p{margin:0}.consentement a{color:inherit}.consentement div{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.consentement button{min-height:44px;padding:0 18px;border-radius:var(--rayon);border:1.5px solid var(--sombre);background:white;color:var(--sombre);font:inherit;font-weight:700;cursor:pointer}.consentement button+button{background:var(--sombre);color:white}@media(max-width:640px){.consentement{left:8px;right:8px;bottom:8px}.consentement div{display:grid;grid-template-columns:1fr 1fr}}.appel.on~.consentement{bottom:84px}`;

/**
 * Bandeau de consentement et configuration ; `lien` : « Gestion des cookies » au pied de page.
 * Vide quand aucun suivi n'est configuré (le site reste sans cookie).
 */
export function suiviDocument(
  s: SuiviSite | undefined,
  mentions: string | null,
): { bandeau: string; lien: boolean } {
  const config = configSuivi(s);
  if (!suiviActif(s) || !config) return { bandeau: '', lien: false };
  const noms = [s.google ? 'Google' : '', s.meta ? 'Meta' : ''].filter(Boolean).join(' et ');
  const plus = mentions ? ` <a href="/${esc(mentions)}">En savoir plus</a>` : '';
  const json = JSON.stringify(config).replace(/</g, '\\u003c');
  return {
    bandeau: `<div id="ph-bandeau" class="consentement" role="region" aria-label="Cookies" hidden><p>Avec votre accord, ce site utilise des cookies de mesure d’audience et de publicité (${noms}) pour mieux faire connaître nos services. Vous pouvez accepter ou refuser ; votre choix est gardé 6 mois et modifiable à tout moment.${plus}</p><div><button type="button" data-consentement="non">Tout refuser</button><button type="button" data-consentement="oui">Tout accepter</button></div></div><script type="application/json" id="ph-suivi">${json}</script><script>${SCRIPT_SUIVI}</script>`,
    lien: true,
  };
}
