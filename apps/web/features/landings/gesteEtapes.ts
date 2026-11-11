import type { gsap as Gsap } from 'gsap';

/** Pause sans molette qui marque la fin d'un geste (l'élan du pavé tactile envoie encore). */
const CALME_MS = 160;
const MARGE = 2;
const TOUCHES_BAS = new Set(['ArrowDown', 'PageDown', ' ']);
const TOUCHES_HAUT = new Set(['ArrowUp', 'PageUp']);

/**
 * Un geste = une étape, quelle que soit sa force (LAND-03). Dans la zone des étapes, la molette,
 * le doigt et le clavier sont interceptés : la page glisse jusqu'à l'étape suivante (ou
 * précédente), puis le reste du geste (élan) est ignoré. Avant la 1re en montant et après la 3e
 * en descendant, rien n'est intercepté : on sort librement.
 */
export function brancherGestes(o: {
  gsap: typeof Gsap;
  /** Position de défilement de l'étape 1, et écart entre deux étapes (lus à chaque geste). */
  debut: () => number;
  pas: () => number;
  derniere: number;
  /** Appelé dès le début d'une glissade : l'animation part tout de suite, sans attendre la page. */
  surEtape: (i: number) => void;
  /** Durée commune de la glissade et de la transition (s). */
  duree: number;
}) {
  const proxy = { y: 0 };
  let animation = false;
  let dernierGeste = 0;
  let derniereForce = 0;
  /** Vrai depuis qu'un geste a déclenché une glissade, jusqu'à la fin de ce geste. */
  let enElan = false;

  const position = (i: number) => Math.round(o.debut() + i * o.pas());
  const aller = (i: number) => {
    animation = true;
    o.surEtape(i);
    proxy.y = window.scrollY;
    o.gsap.killTweensOf(proxy);
    o.gsap.to(proxy, {
      y: position(i),
      duration: o.duree,
      ease: 'power2.inOut',
      onUpdate: () => window.scrollTo(0, proxy.y),
      onComplete: () => {
        animation = false;
      },
    });
  };

  /** Étape visée par un geste dans ce sens, ou `null` si le geste doit passer librement. */
  const cible = (sens: 1 | -1, delta: number): number | null => {
    const y = window.scrollY;
    const debut = position(0);
    const fin = position(o.derniere);
    const rang = (y - debut) / o.pas();
    if (sens > 0) {
      if (y < debut - MARGE) return y + delta >= debut ? 0 : null;
      if (y >= fin - MARGE) return null;
      return Math.min(o.derniere, Math.floor(rang + MARGE / o.pas()) + 1);
    }
    if (y > fin + MARGE) return y + delta <= fin ? o.derniere : null;
    if (y <= debut + MARGE) return null;
    return Math.max(0, Math.ceil(rang - MARGE / o.pas()) - 1);
  };

  /** Traite un geste ; renvoie vrai s'il est absorbé (l'événement doit être annulé). */
  const geste = (delta: number, continu: boolean) => {
    const maintenant = performance.now();
    const force = Math.abs(delta);
    // Même geste qui se prolonge (élan) : absorbé tant qu'il ne repart pas plus fort.
    const memeGeste =
      enElan &&
      continu &&
      maintenant - dernierGeste < CALME_MS &&
      !(force > derniereForce * 1.6 && force > 20);
    dernierGeste = maintenant;
    derniereForce = force;
    if (!memeGeste) enElan = false;
    const sens = delta > 0 ? 1 : -1;
    const i = cible(sens, delta);
    if (i === null) return animation || memeGeste; // libre, sauf pendant une glissade ou son élan
    if (animation || memeGeste) return true;
    enElan = true;
    aller(i);
    return true;
  };

  const molette = (e: WheelEvent) => {
    if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.deltaY === 0) return;
    if (geste(e.deltaY, true)) e.preventDefault();
  };

  let doigtY: number | null = null;
  const toucher = (e: TouchEvent) => {
    doigtY = e.touches[0]?.clientY ?? null;
  };
  const glisser = (e: TouchEvent) => {
    const y = e.touches[0]?.clientY;
    if (doigtY === null || y === undefined) return;
    const delta = doigtY - y;
    const sens = delta > 0 ? 1 : -1;
    if (animation || cible(sens, delta) !== null) {
      e.preventDefault();
      if (Math.abs(delta) > 24) {
        doigtY = null; // un seul passage par glissé de doigt
        geste(delta, false);
      }
    }
  };

  const clavier = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    if (
      e.altKey ||
      e.ctrlKey ||
      e.metaKey ||
      t?.closest('input, textarea, select, [contenteditable]')
    )
      return;
    const bas = TOUCHES_BAS.has(e.key) && !(e.key === ' ' && e.shiftKey);
    const haut = TOUCHES_HAUT.has(e.key) || (e.key === ' ' && e.shiftKey);
    if (!bas && !haut) return;
    if (e.key === ' ' && t?.closest('button, a')) return;
    if (geste(bas ? o.pas() : -o.pas(), false)) e.preventDefault();
  };

  window.addEventListener('wheel', molette, { passive: false });
  window.addEventListener('touchstart', toucher, { passive: true });
  window.addEventListener('touchmove', glisser, { passive: false });
  window.addEventListener('keydown', clavier);
  return {
    aller,
    /** Vrai pendant une glissade : la position de la page ne décide pas de l'étape. */
    enCours: () => animation,
    arreter: () => {
      o.gsap.killTweensOf(proxy);
      window.removeEventListener('wheel', molette);
      window.removeEventListener('touchstart', toucher);
      window.removeEventListener('touchmove', glisser);
      window.removeEventListener('keydown', clavier);
    },
  };
}
