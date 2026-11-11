import type { gsap as Gsap } from 'gsap';

/**
 * Chorégraphie des passages d'étape, sur une frise en pause : l'étiquette `i` (temps i) montre
 * l'étape i, le passage i → i+1 occupe [i, i+1]. Seules l'opacité et les transformations bougent
 * (animées par la carte graphique) : aucune couleur, ombre ou taille recalculée pendant le passage.
 */
export function construireTransitions(gsap: typeof Gsap, racine: HTMLElement, derniere: number) {
  const tous = (sel: string) => [...racine.querySelectorAll<HTMLElement>(sel)];
  const scenes = tous('[data-scene]');
  const textes = tous('[data-texte]');
  const ligne = racine.querySelector<HTMLElement>('[data-ligne]');
  const tl = gsap.timeline({ paused: true });
  for (let i = 0; i < derniere; i++) {
    const [scA, scB, txA, txB] = [scenes[i], scenes[i + 1], textes[i], textes[i + 1]];
    // Sortie : l'étape courante recule et s'efface.
    if (scA)
      tl.to(scA, { autoAlpha: 0, y: -36, scale: 0.97, duration: 0.42, ease: 'power2.in' }, i);
    if (txA) tl.to(txA, { autoAlpha: 0, y: -14, duration: 0.32, ease: 'power2.in' }, i);
    // Entrée : la suivante monte et se pose, puis ses pastilles apparaissent une à une.
    if (scB) {
      tl.fromTo(
        scB,
        { autoAlpha: 0, y: 64, scale: 0.97 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.62, ease: 'power3.out' },
        i + 0.3,
      );
      tl.fromTo(
        scB.querySelectorAll('[data-puce]'),
        { autoAlpha: 0, y: 14, scale: 0.92 },
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 0.36,
          stagger: 0.07,
          ease: 'back.out(1.7)',
        },
        i + 0.55,
      );
    }
    if (txB)
      tl.fromTo(
        txB,
        { autoAlpha: 0, y: 16 },
        { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power3.out' },
        i + 0.36,
      );
    // Ligne de progression : elle avance d'un cran à chaque étape, sans à-coup.
    if (ligne)
      tl.fromTo(
        ligne,
        { scaleY: i / derniere },
        { scaleY: (i + 1) / derniere, duration: 0.9, ease: 'power2.inOut', immediateRender: false },
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
