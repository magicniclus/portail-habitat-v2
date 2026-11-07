'use client';

import { evenementLanding, type OutilLanding } from '@ph/core/landings';
import { useEffect } from 'react';
import { pousserEvenement } from '@/lib/dataLayer';

/**
 * Comportements de page des landings : `landing_site_view`, `pricing_section_viewed` (section
 * « gratuit » vue), `final_cta_clicked`, et apparition des titres de section (y: 28 → 0, une fois,
 * jamais avec `prefers-reduced-motion`).
 */
export function SuiviLanding({ outil }: { outil: OutilLanding }) {
  useEffect(() => {
    if (outil === 'site') pousserEvenement(evenementLanding('landing_site_view', outil));
    const gratuit = document.querySelector('[data-section-gratuit]');
    const io =
      gratuit && typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(
            (es) => {
              if (!es[0]?.isIntersecting) return;
              pousserEvenement(evenementLanding('pricing_section_viewed', outil));
              io?.disconnect();
            },
            { threshold: 0.3 },
          )
        : null;
    if (gratuit) io?.observe(gratuit);
    const final = (e: MouseEvent) => {
      if ((e.target as Element | null)?.closest('[data-cta-final]'))
        pousserEvenement(evenementLanding('final_cta_clicked', outil));
    };
    document.addEventListener('click', final);
    return () => {
      io?.disconnect();
      document.removeEventListener('click', final);
    };
  }, [outil]);

  // Apparition des titres de section (y: 28 → 0, opacité 0 → 1, 0,8 s, courbe « power3.out »),
  // une fois, quand le titre atteint 88 % de l'écran : animation native, sans bibliothèque.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (typeof IntersectionObserver === 'undefined') return;
    const titres = Array.from(document.querySelectorAll<HTMLElement>('main section h2')).filter(
      (h) => !h.closest('[data-scrolly], [data-formulaire-landing]'),
    );
    const vus = new Set<Element>();
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) {
          if (!e.isIntersecting || vus.has(e.target)) continue;
          vus.add(e.target);
          io.unobserve(e.target);
          const h = e.target as HTMLElement;
          h.style.visibility = '';
          h.animate(
            [
              { transform: 'translateY(28px)', opacity: 0 },
              { transform: 'none', opacity: 1 },
            ],
            { duration: 800, easing: 'cubic-bezier(0.215, 0.61, 0.355, 1)' },
          );
        }
      },
      { rootMargin: '0px 0px -12% 0px' },
    );
    for (const h of titres) {
      // Déjà passés (page rechargée plus bas) : laissés tels quels.
      if (h.getBoundingClientRect().top < window.innerHeight * 0.88) continue;
      h.style.visibility = 'hidden';
      io.observe(h);
    }
    return () => {
      io.disconnect();
      for (const h of titres) h.style.visibility = '';
    };
  }, []);
  return null;
}
