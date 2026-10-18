'use client';

import { useGSAP } from '@gsap/react';
import { evenementLanding, type OutilLanding } from '@ph/core/landings';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect } from 'react';
import { pousserEvenement } from '@/lib/dataLayer';

gsap.registerPlugin(ScrollTrigger, useGSAP);

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

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.utils.toArray<HTMLElement>('main section h2').forEach((h) => {
        if (h.closest('[data-scrolly], [data-formulaire-landing]')) return;
        gsap.from(h, {
          y: 28,
          autoAlpha: 0,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: { trigger: h, start: 'top 88%', once: true },
        });
      });
    });
    return () => mm.revert();
  });
  return null;
}
