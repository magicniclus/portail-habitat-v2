import { describe, expect, it } from 'vitest';
import type { Action } from './etat';
import { MoteurCamera } from './moteurCamera';

/** Zone du plan de 800 × 600 px placée en (100, 50) à l'écran. */
const moteur = (zoom = 50) => {
  const m = new MoteurCamera(zoom);
  const envois: Action[] = [];
  m.relier(
    (a) => void envois.push(a),
    () => undefined,
  );
  m.el = {
    getBoundingClientRect: () => ({ left: 100, top: 50, width: 800, height: 600 }),
  } as HTMLElement;
  m.taille = { w: 800, h: 600 };
  return { m, envois };
};
const ecran = (x: number, y: number) => ({ clientX: x, clientY: y });

describe('caméra du plan 2D', () => {
  it('molette : le point sous le pointeur reste exactement sous le pointeur', () => {
    const { m, envois } = moteur();
    m.appliquer({ cx: 5000, cy: 4000, zoom: 50 });
    const avant = m.versMm(ecran(250, 120))!;
    m.zoomerVers(83.7, ecran(250, 120));
    const apres = m.versMm(ecran(250, 120))!;
    expect(apres.x).toBeCloseTo(avant.x, 6);
    expect(apres.y).toBeCloseTo(avant.y, 6);
    expect(m.cam.zoom).toBe(83.7);
    expect(envois.at(-1)).toEqual({ type: 'zoom', zoom: 83.7 });
  });

  it('zoom borné ; glisser la vue ; « Ajuster » cadre tout, au-dessus de la feuille', () => {
    const { m } = moteur();
    m.zoomerVers(1e6, ecran(500, 350));
    expect(m.cam.zoom).toBe(200);
    m.appliquer({ cx: 0, cy: 0, zoom: 100 });
    m.deplacer(50, -20); // 50 px à droite : la vue recule de 0,5 m
    expect(m.cam).toEqual({ cx: -500, cy: 200, zoom: 100 });
    m.ajuster({ x: 0, y: 0, l: 16_000, h: 12_000 }, 0, false);
    expect(m.cam).toEqual({ cx: 8000, cy: 6000, zoom: 50 });
    // Feuille de 300 px en bas : 300 px visibles, le dessin centré dans cette partie.
    m.ajuster({ x: 0, y: 0, l: 16_000, h: 12_000 }, 300, false);
    expect(m.cam.zoom).toBe(25);
    expect(m.versMm(ecran(500, 50 + 150))!.y).toBeCloseTo(6000, 6);
  });

  it('un zoom venu des boutons ne revient pas en boucle vers l’état', () => {
    const { m, envois } = moteur(50);
    // Animations réduites : le zoom est appliqué tout de suite.
    globalThis.window = { matchMedia: () => ({ matches: true }) } as never;
    globalThis.cancelAnimationFrame = () => undefined;
    m.zoomExterne(50);
    expect(m.cam.zoom).toBe(50);
    m.zoomExterne(80);
    expect(m.cam.zoom).toBe(80);
    expect(envois).toEqual([]);
    expect(m.versMm({ clientX: 0, clientY: 0 })).not.toBeNull();
  });
});
