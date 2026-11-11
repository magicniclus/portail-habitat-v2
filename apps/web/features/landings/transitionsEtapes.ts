import type { gsap as Gsap } from 'gsap';

/** Part de chaque tranche de défilement où l'étape reste immobile, avant et après le passage. */
const PALIER = 0.12;

/**
 * Chorégraphie des passages d'étape, liée au défilement : le temps i correspond à l'étape i
 * affichée ; le passage i → i+1 occupe [i + PALIER, i + 1 - PALIER], et chaque étape reste
 * immobile un instant de part et d'autre. Seules l'opacité et les transformations bougent
 * (animées par la carte graphique) : rien n'est recalculé pendant le défilement.
 */
export function construireTransitions(gsap: typeof Gsap, racine: HTMLElement, derniere: number) {
  const tous = (sel: string) => [...racine.querySelectorAll<HTMLElement>(sel)];
  const scenes = tous('[data-scene]');
  const textes = tous('[data-texte]');
  const ligne = racine.querySelector<HTMLElement>('[data-ligne]');
  const tl = gsap.timeline({ paused: true });
  const d = 1 - 2 * PALIER; // durée d'un passage
  for (let i = 0; i < derniere; i++) {
    const t = i + PALIER;
    const [scA, scB, txA, txB] = [scenes[i], scenes[i + 1], textes[i], textes[i + 1]];
    // Sortie : pastilles et légende partent d'abord ; la capture recule et s'éteint pendant que
    // la suivante, opaque, glisse par-dessus (jamais deux images floues mêlées).
    if (scA) {
      tl.to(
        scA.querySelectorAll('[data-puce], [data-legende]'),
        { autoAlpha: 0, y: -10, duration: d * 0.25, stagger: d * 0.03, ease: 'none' },
        t,
      );
      tl.to(scA, { autoAlpha: 0, y: -40, scale: 0.9, duration: d, ease: 'power1.inOut' }, t);
    }
    if (scB) {
      tl.fromTo(scB, { y: 220 }, { y: 0, duration: d * 0.8, ease: 'power2.out' }, t + d * 0.08);
      tl.fromTo(
        scB,
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: d * 0.15, ease: 'none' },
        t + d * 0.08,
      );
      tl.fromTo(
        scB.querySelectorAll('[data-puce]'),
        { autoAlpha: 0, y: 18, scale: 0.9 },
        { autoAlpha: 1, y: 0, scale: 1, duration: d * 0.3, stagger: d * 0.08, ease: 'power2.out' },
        t + d * 0.6,
      );
      const legende = scB.querySelector('[data-legende]');
      if (legende)
        tl.fromTo(
          legende,
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: d * 0.2, ease: 'none' },
          t + d * 0.75,
        );
    }
    // Textes : l'un sort, puis l'autre entre (jamais superposés).
    if (txA) tl.to(txA, { autoAlpha: 0, y: -16, duration: d * 0.3, ease: 'power1.in' }, t);
    if (txB)
      tl.fromTo(
        txB,
        { autoAlpha: 0, y: 18 },
        { autoAlpha: 1, y: 0, duration: d * 0.45, ease: 'power2.out' },
        t + d * 0.35,
      );
    // Ligne de progression : elle suit exactement le défilement.
    if (ligne)
      tl.fromTo(
        ligne,
        { scaleY: i / derniere },
        { scaleY: (i + 1) / derniere, duration: 1, ease: 'none', immediateRender: false },
        i,
      );
  }
  tl.set({}, {}, derniere); // la frise dure exactement `derniere`
  return tl;
}

/** Arrivée de la section à l'écran : la plaque et les pastilles de l'étape 1 se posent, une fois. */
export function animerEntree(gsap: typeof Gsap, racine: HTMLElement) {
  const scene = racine.querySelector<HTMLElement>('[data-plaque]');
  const puces = racine.querySelectorAll<HTMLElement>('[data-scene="0"] [data-puce]');
  if (!scene) return;
  gsap
    .timeline({ scrollTrigger: { trigger: scene, start: 'top 85%', once: true } })
    .from(scene, { autoAlpha: 0, y: 70, duration: 0.9, ease: 'power3.out' })
    .from(
      puces,
      { autoAlpha: 0, y: 14, scale: 0.92, duration: 0.4, stagger: 0.08, ease: 'back.out(1.7)' },
      0.45,
    );
}
