import type { Point } from '@ph/core/dessin';
import type { Dispatch } from 'react';
import type { Action } from './etat';
import { ZOOM_MAX, ZOOM_MIN } from './etatBase';

/** Caméra du plan : point du plan (mm) au centre de la zone, et zoom (px par mètre). */
export interface Camera {
  cx: number;
  cy: number;
  zoom: number;
}
export type Cadre = { x: number; y: number; l: number; h: number };
type Ecran = { clientX: number; clientY: number };

const borner = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
/** Durée d'un mouvement de caméra (zoom aux boutons, « Ajuster »), en ms. */
const DUREE = 260;
const adoucir = (t: number) => 1 - (1 - t) ** 3;

/**
 * Caméra du plan 2D, hors de React : tout calcul part de l'état courant (jamais d'une mesure du
 * DOM ni d'une transformation CSS en cours), le rendu suit par `rendre`. Le zoom n'est envoyé à
 * l'état qu'une fois le geste ou l'animation posé sur sa valeur.
 */
export class MoteurCamera {
  cam: Camera;
  taille = { w: 0, h: 0 };
  el: HTMLElement | null = null;
  /** Dernier zoom envoyé à l'état : un autre zoom vient des boutons ou du clavier. */
  envoye: number;
  dispatch: Dispatch<Action> = () => undefined;
  rendre: (c: Camera) => void = () => undefined;
  private image = 0;

  constructor(zoom: number) {
    this.cam = { cx: 0, cy: 0, zoom };
    this.envoye = Math.round(zoom);
  }

  /** Branche le moteur sur l'éditeur : envoi du zoom, rendu de la vue. */
  relier = (dispatch: Dispatch<Action>, rendre: (c: Camera) => void) => {
    this.dispatch = dispatch;
    this.rendre = rendre;
  };

  appliquer = (c: Camera, envoyer = true) => {
    const suite = { ...c, zoom: borner(c.zoom) };
    this.cam = suite;
    this.rendre(suite);
    if (envoyer && Math.round(suite.zoom) !== this.envoye) {
      this.envoye = Math.round(suite.zoom);
      this.dispatch({ type: 'zoom', zoom: suite.zoom });
    }
  };

  /** Position d'un point de l'écran par rapport au centre de la zone (px). */
  private ecart(e: Ecran) {
    const r = this.el?.getBoundingClientRect();
    if (!r) return null;
    return { x: e.clientX - r.left - this.taille.w / 2, y: e.clientY - r.top - this.taille.h / 2 };
  }

  /** Point du plan (mm) sous un point de l'écran. */
  versMm = (e: Ecran): Point | null => {
    const s = this.ecart(e);
    if (!s) return null;
    const k = 1000 / this.cam.zoom;
    return { x: this.cam.cx + s.x * k, y: this.cam.cy + s.y * k };
  };

  /** Zoom autour d'un point de l'écran : le point du plan sous lui ne bouge pas. */
  zoomerVers = (zoom: number, e: Ecran, depuis: Camera = this.cam) => {
    const s = this.ecart(e);
    if (!s) return;
    const z = borner(zoom);
    const [k0, k] = [1000 / depuis.zoom, 1000 / z];
    this.appliquer({ cx: depuis.cx + s.x * (k0 - k), cy: depuis.cy + s.y * (k0 - k), zoom: z });
  };

  /** Fait glisser la vue de (dx, dy) pixels, comme si l'on tirait le papier. */
  deplacer = (dx: number, dy: number) => {
    const k = 1000 / this.cam.zoom;
    this.appliquer({ ...this.cam, cx: this.cam.cx - dx * k, cy: this.cam.cy - dy * k }, false);
  };

  arreter = () => {
    cancelAnimationFrame(this.image);
    this.image = 0;
  };

  /** Mouvement doux vers une cible (zoom en proportion, centre en ligne droite). */
  animer = (cible: Camera) => {
    this.arreter();
    const depart = this.cam;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
      return this.appliquer(cible);
    const debut = performance.now();
    const pas = (maintenant: number) => {
      const t = Math.min(1, (maintenant - debut) / DUREE);
      if (t >= 1) {
        this.image = 0;
        return this.appliquer(cible);
      }
      const e = adoucir(t);
      this.appliquer(
        {
          cx: depart.cx + (cible.cx - depart.cx) * e,
          cy: depart.cy + (cible.cy - depart.cy) * e,
          zoom: depart.zoom * (cible.zoom / depart.zoom) ** e,
        },
        false,
      );
      this.image = requestAnimationFrame(pas);
    };
    this.image = requestAnimationFrame(pas);
  };

  /** Zoom venu des boutons ou du clavier : zoom doux autour du centre de la vue. */
  zoomExterne = (zoom: number) => {
    if (Math.round(zoom) === this.envoye) return;
    this.envoye = Math.round(zoom);
    this.animer({ ...this.cam, zoom });
  };

  /** « Ajuster » : tout le cadre dans la zone, au-dessus de `reserveBas` px masqués en bas. */
  ajuster = (c: Cadre, reserveBas: number, anime: boolean) => {
    const { w, h } = this.taille;
    const zoom = borner(Math.min((w / c.l) * 1000, (Math.max(80, h - reserveBas) / c.h) * 1000));
    const k = 1000 / zoom;
    const cible = { cx: c.x + c.l / 2, cy: c.y + c.h / 2 + (reserveBas / 2) * k, zoom };
    if (anime) this.animer(cible);
    else this.appliquer(cible);
  };

  /**
   * Suit la zone du plan : sa taille (panneaux, rotation de l'écran) et la molette — zoom autour
   * du pointeur, crans d'une même image additionnés ; défilement horizontal : la vue glisse.
   */
  observer = (el: HTMLElement, surTaille: (t: { w: number; h: number }) => void) => {
    this.el = el;
    const mesurer = () => {
      const r = el.getBoundingClientRect();
      this.taille = { w: Math.round(r.width), h: Math.round(r.height) };
      surTaille(this.taille);
    };
    mesurer();
    const obs = new ResizeObserver(mesurer);
    obs.observe(el);
    let cumul = 0;
    let dernier: Ecran = { clientX: 0, clientY: 0 };
    let image = 0;
    const appliquerCumul = () => {
      image = 0;
      const facteur = Math.exp(-Math.max(-300, Math.min(300, cumul)) * 0.0022);
      cumul = 0;
      this.zoomerVers(this.cam.zoom * facteur, dernier);
    };
    const molette = (ev: WheelEvent) => {
      ev.preventDefault();
      this.arreter();
      const ligne = ev.deltaMode === 1 ? 16 : 1;
      if (!ev.ctrlKey && Math.abs(ev.deltaX) > Math.abs(ev.deltaY))
        return this.deplacer(-ev.deltaX * ligne, -ev.deltaY * ligne);
      // Pincement du pavé tactile (Ctrl) : petits écarts, plus sensibles.
      cumul += ev.deltaY * ligne * (ev.ctrlKey ? 4 : 1);
      dernier = { clientX: ev.clientX, clientY: ev.clientY };
      if (!image) image = requestAnimationFrame(appliquerCumul);
    };
    el.addEventListener('wheel', molette, { passive: false });
    return () => {
      obs.disconnect();
      cancelAnimationFrame(image);
      this.arreter();
      el.removeEventListener('wheel', molette);
    };
  };
}
