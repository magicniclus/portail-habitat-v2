/**
 * Mode Aperçu de l'éditeur : la page se comporte comme en ligne (menu mobile, fenêtre du
 * formulaire, ancres) ; un lien vers une autre page du site change la page de l'éditeur, les
 * autres liens sont confiés à l'éditeur. Aucune mesure d'audience, aucun envoi de formulaire.
 */
export const SCRIPT_APERCU = `(function(){var d=document,h=d.documentElement,b=d.querySelector('[data-burger]'),w=d.getElementById('fenetre-formulaire');
function post(x){x.source='ph-editeur';parent.postMessage(x,'*');}
function m(o){h.classList.toggle('ouvert',o);b&&b.setAttribute('aria-expanded',String(o));}
function aller(id){var c=id&&d.getElementById(id);if(c)c.scrollIntoView({behavior:'smooth',block:'start'});}
if(b){b.addEventListener('click',function(){m(!h.classList.contains('ouvert'));});var f=d.querySelector('[data-fermer]');f&&f.addEventListener('click',function(){m(false);});}
if(w){w.querySelector('[data-fermer-fenetre]').addEventListener('click',function(){w.close();});w.addEventListener('click',function(e){if(e.target===w)w.close();});}
d.addEventListener('keydown',function(e){if(e.key==='Escape')m(false);});
d.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href]');if(!a)return;e.preventDefault();m(false);
if(a.hasAttribute('data-fenetre')&&w){w.showModal();return;}
var r=a.getAttribute('href')||'';
if(r.charAt(0)==='#'){aller(r.slice(1));return;}
if(r.charAt(0)==='/'){var i=r.indexOf('#');post({type:'page',slug:i<0?r.slice(1):r.slice(1,i),ancre:i<0?'':r.slice(i+1)});return;}
post({type:'lien',href:r});},true);
d.querySelectorAll('[data-formulaire]').forEach(function(f){f.addEventListener('submit',function(e){e.preventDefault();var s=f.querySelector('.statut');if(s)s.textContent='Aperçu : le formulaire enverra les demandes une fois le site publié.';});});
var A=d.querySelectorAll('[data-anim]');if(A.length){if('IntersectionObserver'in window){var io=new IntersectionObserver(function(es){es.forEach(function(x){if(x.isIntersecting){x.target.classList.add('vu');io.unobserve(x.target);}});},{rootMargin:'0px 0px -8% 0px'});A.forEach(function(x){io.observe(x);});}else A.forEach(function(x){x.classList.add('vu');});}
var t;addEventListener('scroll',function(){clearTimeout(t);t=setTimeout(function(){post({type:'defilement',y:scrollY});},120);},{passive:true});
addEventListener('message',function(e){var x=e.data;if(!x||x.source!=='ph-editeur')return;if(x.type==='defiler')scrollTo(0,x.y||0);if(x.type==='ancre')aller(x.ancre);if(x.type==='ping')post({type:'pret'});});
post({type:'pret'});})();`;
