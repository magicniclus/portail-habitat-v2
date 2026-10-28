import { niveauxEditeur, nuancierEditeur } from '@ph/ui/tokens';

/**
 * Script de l'aperçu de l'éditeur (maquette Editeur de Site) : clic = sélection, survol, cadre et
 * barre d'actions sur la sélection, « + Zone » / « + Section », menu mobile, position de
 * défilement. Le cadre est isolé (`sandbox="allow-scripts"`, origine opaque) et ne parle à
 * l'éditeur que par `postMessage` ; autorisé par son empreinte dans la CSP de l'espace pro.
 * Jamais servi sur un site publié.
 */
export const SCRIPT_EDITION = `(function(){var d=document,h=d.documentElement,sel=null,survol=null,calque=null,m0=null;
var C=${JSON.stringify(niveauxEditeur)};
var I={haut:'M12 19V5M5 12l7-7 7 7',bas:'M12 5v14M5 12l7 7 7-7',gauche:'M19 12H5M12 5l-7 7 7 7',droite:'M5 12h14M12 5l7 7-7 7',dupliquer:'M9 9h11v11H9zM5 15H4V4h11v1',supprimer:'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',bloc:'M12 5v14M5 12h14'};
function post(m){m.source='ph-editeur';parent.postMessage(m,'*');}
function cible(t){return t&&t.closest?t.closest('[data-ed]'):null;}
var ed=null;
function finEdition(){if(!ed)return;var x=ed;ed=null;x.t.removeAttribute('contenteditable');post({type:'texte',id:x.el.getAttribute('data-ed'),html:x.t.innerHTML,texte:x.t.textContent,simple:x.simple});}
d.addEventListener('dblclick',function(e){var el=e.target.closest&&e.target.closest('[data-ed-texte]');if(!el||(ed&&ed.el===el))return;e.preventDefault();finEdition();
var t=el.classList.contains('bouton')?el.querySelector('.btn'):el;if(!t)return;var simple=el.getAttribute('data-ed-texte')==='simple';ed={el:el,t:t,simple:simple};
t.setAttribute('contenteditable',simple?'plaintext-only':'true');t.focus();
var r=d.caretRangeFromPoint?d.caretRangeFromPoint(e.clientX,e.clientY):null,s=getSelection();if(r&&s){s.removeAllRanges();s.addRange(r);}
t.addEventListener('blur',finEdition,{once:true});post({type:'edition',id:el.getAttribute('data-ed')});},true);
d.addEventListener('paste',function(e){if(!ed)return;e.preventDefault();d.execCommand('insertText',false,(e.clipboardData||{getData:function(){return '';}}).getData('text/plain'));},true);
d.addEventListener('click',function(e){if(ed&&ed.t.contains(e.target)){e.preventDefault();return;}var b=e.target.closest&&e.target.closest('[data-ed-op]');e.preventDefault();e.stopPropagation();
if(b){post({type:'action',op:b.getAttribute('data-ed-op')});return;}
if(e.target.closest&&e.target.closest('[data-burger],[data-fermer]')){h.classList.toggle('ouvert');}
var c=cible(e.target);post({type:'choisir',id:c?c.getAttribute('data-ed'):null});},true);
d.addEventListener('submit',function(e){e.preventDefault();},true);
d.addEventListener('mouseover',function(e){var c=cible(e.target);if(c===survol)return;if(survol)survol.classList.remove('ed-survol');survol=c;if(c&&c!==sel)c.classList.add('ed-survol');});
d.addEventListener('keydown',function(e){var k=e.key;if(ed){if(k==='Escape'||(k==='Enter'&&ed.simple)){e.preventDefault();ed.t.blur();}else if(k==='Enter'){e.preventDefault();d.execCommand('insertLineBreak');}return;}if(k==='Escape'||k==='Delete'||k==='Backspace'||((e.ctrlKey||e.metaKey)&&/^[zyd]$/i.test(k))){e.preventDefault();post({type:'touche',key:k,ctrl:e.ctrlKey||e.metaKey,shift:e.shiftKey});}});
var t=0;addEventListener('scroll',function(){clearTimeout(t);t=setTimeout(function(){post({type:'defilement',y:scrollY});},80);},{passive:true});
function svg(p){return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+p+'"/></svg>';}
function placer(){if(!sel||!calque)return;var r=sel.getBoundingClientRect(),y=r.top+scrollY,x=r.left+scrollX,haut=y>26;
calque.style.cssText='position:absolute;pointer-events:none;z-index:2147483000;left:'+x+'px;top:'+y+'px;width:'+r.width+'px;height:'+r.height+'px;outline:2px solid '+C[m0.niveau]+';outline-offset:-2px';
var b=calque.firstChild,o=b.nextSibling;b.style.top=o.style.top=haut?'-22px':'0';b.style.borderRadius=haut?'4px 4px 0 0':'0 0 4px 0';o.style.borderRadius=haut?'4px 4px 0 0':'0 0 0 4px';}
function marquer(m){if(calque){calque.remove();calque=null;}if(sel)sel.classList.remove('ed-sel');sel=null;m0=m;if(!m||!m.id)return;
sel=d.querySelector('[data-ed="'+m.id.replace(/["\\\\]/g,'')+'"]');if(!sel)return;sel.classList.add('ed-sel');sel.classList.remove('ed-survol');
var c=C[m.niveau]||C.element,f='font:700 11px/16px system-ui,sans-serif;color:${nuancierEditeur.texteSelection};background:'+c+';';
calque=d.createElement('div');calque.setAttribute('data-ed-calque','');
var badge=d.createElement('span');badge.textContent=m.badge||'';badge.style.cssText='position:absolute;left:0;padding:3px 8px;white-space:nowrap;'+f;calque.appendChild(badge);
var outils=d.createElement('span');outils.style.cssText='position:absolute;right:0;display:flex;pointer-events:auto;'+f;
(m.actions||[]).forEach(function(a){var b=d.createElement('button');b.type='button';b.title=a.label;b.setAttribute('aria-label',a.label);b.setAttribute('data-ed-op',a.op);b.innerHTML=svg(I[a.op]||I.bloc);b.style.cssText='display:flex;align-items:center;justify-content:center;width:26px;height:22px;border:0;background:none;color:inherit;cursor:pointer;padding:0';outils.appendChild(b);});
calque.appendChild(outils);
if(m.ajout){var p=d.createElement('button');p.type='button';p.textContent=m.ajout.label;p.setAttribute('data-ed-op',m.ajout.op);p.style.cssText='position:absolute;left:50%;bottom:-12px;transform:translateX(-50%);pointer-events:auto;border:0;border-radius:999px;padding:3px 10px;cursor:pointer;'+f;calque.appendChild(p);}
d.body.appendChild(calque);placer();if(m.defiler)sel.scrollIntoView({block:'nearest',behavior:'smooth'});}
addEventListener('resize',placer);if(window.ResizeObserver)new ResizeObserver(placer).observe(d.body);
addEventListener('message',function(e){var m=e.data;if(!m||m.source!=='ph-editeur')return;if(m.type==='selection')marquer(m.selection);if(m.type==='defiler')scrollTo(0,m.y||0);if(m.type==='menu')h.classList.toggle('ouvert',!!m.ouvert);});
post({type:'pret'});})();`;

/** Survol et contenus sans rendu propre (menu, vidéo sans lien) visibles dans l'éditeur seulement. */
export const STYLE_EDITION = `[data-ed]{cursor:pointer}[contenteditable]{cursor:text;outline:2px dashed currentColor;outline-offset:4px}.ed-survol{outline:1px dashed ${niveauxEditeur.element};outline-offset:-1px}.ed-vide{padding:10px;border:1px dashed rgba(0,0,0,.25);border-radius:6px;font:600 13px system-ui,sans-serif;color:rgba(0,0,0,.6);text-align:center}.r:empty,.c:empty{min-height:56px;outline:1px dashed rgba(0,0,0,.18);outline-offset:-1px}`;

/**
 * Ajoute `data-ed` (et le niveau) à la balise ouvrante d'un fragment HTML ; `texte` : modifiable
 * au double-clic directement sur la page (texte riche ou simple).
 */
export function marquerEdition(
  html: string,
  id: string,
  niveau: string,
  texte?: 'riche' | 'simple',
): string {
  const attr = ` data-ed="${id.replace(/[^\w-]/g, '')}" data-ed-niveau="${niveau}"${texte ? ` data-ed-texte="${texte}"` : ''}`;
  return html.replace(/^<([a-z][a-z0-9]*)/, `<$1${attr}`);
}
