// Curseur dessiné dans la page filmée (chargé tel quel par Playwright : pas de TypeScript ici).
// Flèche agrandie sur ordinateur, pastille du doigt sur téléphone, onde orange au clic.
// Couleurs en dur : script injecté dans la page filmée, hors du produit et de ses tokens.
/* global document, window, requestAnimationFrame, addEventListener */
/* eslint-disable no-restricted-syntax */
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  let modales = -1;
  // Construit sans innerHTML (Trusted Types) ; recréé au besoin (l'hydratation de React retire les
  // éléments ajoutés avant elle) ; en « popover » pour rester au-dessus des fenêtres modales.
  const curseur = () => {
    const existant = document.getElementById('vsl-curseur');
    if (existant) return existant;
    const c = document.createElement('div');
    c.id = 'vsl-curseur';
    c.setAttribute('popover', 'manual');
    c.style.cssText =
      'position:fixed;inset:auto;left:0;top:0;margin:0;padding:0;border:0;background:none;overflow:visible;z-index:2147483647;pointer-events:none;will-change:transform;transform:translate(-200px,-200px)';
    if (window.innerWidth < 600) {
      const d = document.createElement('div');
      d.style.cssText =
        'width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;background:rgba(32,30,29,.28);border:2px solid rgba(255,255,255,.9);box-shadow:0 2px 8px rgba(0,0,0,.25)';
      c.appendChild(d);
    } else {
      const s = document.createElementNS(NS, 'svg');
      s.setAttribute('width', '34');
      s.setAttribute('height', '34');
      s.setAttribute('viewBox', '0 0 24 24');
      s.style.cssText = 'display:block;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))';
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', 'M5 2.5v17l4.6-4.3 2.9 6.6 2.7-1.2-2.9-6.5H19z');
      p.setAttribute('fill', '#201e1d');
      p.setAttribute('stroke', '#fff');
      p.setAttribute('stroke-width', '1.4');
      p.setAttribute('stroke-linejoin', 'round');
      s.appendChild(p);
      c.appendChild(s);
    }
    (document.body ?? document.documentElement).appendChild(c);
    modales = -1;
    return c;
  };
  const onde = (x, y) => {
    const o = document.createElement('div');
    o.style.cssText = `position:fixed;left:${x - 22}px;top:${y - 22}px;width:44px;height:44px;border-radius:50%;border:3px solid #e05a10;z-index:2147483646;pointer-events:none;opacity:.9;transition:transform .45s ease-out,opacity .45s ease-out`;
    (
      document.querySelector('dialog:modal') ??
      document.body ??
      document.documentElement
    ).appendChild(o);
    requestAnimationFrame(() => {
      o.style.transform = 'scale(1.9)';
      o.style.opacity = '0';
    });
    setTimeout(() => o.remove(), 500);
  };
  addEventListener(
    'mousemove',
    (e) => {
      const c = curseur();
      const n = document.querySelectorAll(':modal').length;
      if (n !== modales) {
        modales = n;
        try {
          c.hidePopover();
        } catch {
          // pas encore affiché
        }
        c.showPopover();
      }
      c.style.transform = `translate(${e.clientX}px,${e.clientY}px)`;
    },
    true,
  );
  addEventListener('mousedown', (e) => onde(e.clientX, e.clientY), true);
})();
