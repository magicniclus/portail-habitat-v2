'use client';

import type { gsap as Gsap } from 'gsap';
import type { ScrollTrigger as ST } from 'gsap/ScrollTrigger';

let charge: Promise<{ gsap: typeof Gsap; ScrollTrigger: typeof ST }> | null = null;

/**
 * GSAP et ScrollTrigger chargés à la demande, après l'affichage de la landing (≈ 45 Ko de
 * JavaScript en moins au premier chargement ; budget EXPLOITATION §1). Un seul chargement.
 */
export function chargerGsap() {
  charge ??= Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([g, s]) => {
    g.gsap.registerPlugin(s.ScrollTrigger);
    return { gsap: g.gsap, ScrollTrigger: s.ScrollTrigger };
  });
  return charge;
}
