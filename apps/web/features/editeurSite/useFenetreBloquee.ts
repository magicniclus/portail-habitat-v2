'use client';

import { useEffect } from 'react';

/**
 * Éditeur sur ordinateur : la fenêtre elle-même ne défile jamais (seules les colonnes défilent),
 * même quand un focus ou un défilement de l'aperçu tente de la faire bouger.
 */
export function useFenetreBloquee() {
  useEffect(() => {
    const html = document.documentElement;
    const avant = html.style.overflow;
    const mq = window.matchMedia('(min-width: 900px)');
    const maj = () => {
      html.style.overflow = mq.matches ? 'hidden' : avant;
      if (mq.matches) window.scrollTo(0, 0);
    };
    maj();
    mq.addEventListener('change', maj);
    return () => {
      mq.removeEventListener('change', maj);
      html.style.overflow = avant;
    };
  }, []);
}
