'use client';

import { useEffect } from 'react';

/**
 * Liens vers une ancre de la même page (« #inscription », « #devis »…) : défilement doux, partout.
 * En JavaScript et non `scroll-behavior: smooth`, qui se bat avec ScrollTrigger (LANDINGS §3.4).
 * Immédiat avec `prefers-reduced-motion`. Depuis une fenêtre (dialog), on attend sa fermeture
 * (le verrou de défilement est levé). La cible reçoit le focus, sans saut.
 */
export function AncresDouces() {
  useEffect(() => {
    const surClic = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const lien = (e.target as Element | null)?.closest?.('a[href*="#"]');
      if (!(lien instanceof HTMLAnchorElement) || lien.target === '_blank') return;
      const url = new URL(lien.href, location.href);
      if (url.origin !== location.origin || url.pathname !== location.pathname || !url.hash) return;
      const cible = document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (!cible) return;
      e.preventDefault();
      const calme = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const aller = () => {
        cible.scrollIntoView({ behavior: calme ? 'auto' : 'smooth', block: 'start' });
        history.pushState(null, '', url.hash);
        if (
          !cible.hasAttribute('tabindex') &&
          !/^(a|button|input|select|textarea)$/i.test(cible.tagName)
        )
          cible.setAttribute('tabindex', '-1');
        cible.focus({ preventScroll: true });
      };
      if (lien.closest('[role="dialog"]')) window.setTimeout(aller, 80);
      else aller();
    };
    document.addEventListener('click', surClic);
    return () => document.removeEventListener('click', surClic);
  }, []);
  return null;
}
