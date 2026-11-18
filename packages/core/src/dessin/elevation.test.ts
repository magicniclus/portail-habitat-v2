import { describe, expect, it } from 'vitest';
import type { Resultat } from '../resultat';
import type { Scene } from '../schemas/dessinScene';
import { contexteTest, niveauMaquette } from './aidesTest';
import { definirToiture } from './commandesToit';
import { elevation, regardCoupe, regardFacade } from './elevation';
import { nouvelleScene } from './migrations';
import { poserOuverture } from './ouvertures';

const ok = <T>(r: Resultat<T>): T => {
  if (!r.ok) throw new Error(r.message);
  return r.data;
};
const ctx = contexteTest();
/** Maison de la maquette (10,60 × 8,60 m), une fenêtre au nord, toit deux pans. */
function maison(toit = true): Scene {
  let n = niveauMaquette(ctx);
  const haut = [...n.murs].sort((a, b) => a.a.y + a.b.y - (b.a.y + b.b.y))[0]!;
  n = ok(poserOuverture(n, { murId: haut.id, type: 'fenetre', centre: 5_000 }, ctx));
  if (toit) n = ok(definirToiture(n, 'deux_pans'));
  return { ...nouvelleScene(ctx.nouvelId), niveaux: [n] };
}
const largeur = (e: { cadre: { x0: number; x1: number } }) => e.cadre.x1 - e.cadre.x0;

describe('façades (DES-36)', () => {
  it('regards : façade sud vue depuis le sud (regard vers le nord, est à droite)', () => {
    expect(regardFacade('sud', 0).d).toEqual({ x: 0, y: -1 });
    expect(regardFacade('sud', 0).r).toEqual({ x: 1, y: 0 });
    const est = regardFacade('est', 0);
    expect(est.d.x).toBeCloseTo(-1);
    expect(est.r.y).toBeCloseTo(-1); // regard vers l'ouest : le nord (haut du plan) à droite
    expect(regardFacade('nord', 900).d.x).toBeCloseTo(-1);
    expect(regardCoupe({ x: 0, y: 0 }, { x: 50, y: 0 })).toBeNull();
  });

  it('façades nord et est : largeur hors tout, baie, toit jusqu’au faîtage', () => {
    const s = maison();
    const nord = elevation(s, 'nord')!;
    expect(largeur(nord)).toBeGreaterThanOrEqual(10_600);
    expect(nord.traces.filter((t) => t.genre === 'baie')).toHaveLength(1);
    expect(nord.traces.some((t) => t.genre === 'toit')).toBe(true);
    expect(nord.cadre.y0).toBe(0);
    const faitage = nord.reperes.find((r) => r.libelle === 'Faîtage')!.z;
    expect(Math.abs(nord.cadre.y1 - faitage)).toBeLessThan(5);
    // Sur la façade sud, la fenêtre nord est cachée derrière : dessinée avant le mur sud.
    const sud = elevation(s, 'sud')!;
    const iBaie = sud.traces.findIndex((t) => t.genre === 'baie');
    const iMurAvant = sud.traces.findLastIndex((t) => t.genre === 'mur');
    expect(iBaie).toBeLessThan(iMurAvant);
    const est = elevation(s, 'est')!;
    expect(largeur(est)).toBeGreaterThanOrEqual(8_600);
    expect(est.traces.some((t) => t.genre === 'pignon')).toBe(true);
    expect(est.reperes.map((r) => r.libelle)).toEqual(['RDC', 'Égout', 'Faîtage']);
  });

  it('coupe en travers : murs tranchés (épaisseur), toit tranché, la moitié avant ôtée', () => {
    const s = maison();
    const ys = s.niveaux[0]!.murs.flatMap((m) => [m.a.y, m.b.y]);
    const y = (Math.min(...ys) + Math.max(...ys)) / 2;
    const xs = s.niveaux[0]!.murs.flatMap((m) => [m.a.x, m.b.x]);
    const c = elevation(s, {
      a: { x: Math.min(...xs) - 1_000, y },
      b: { x: Math.max(...xs) + 1_000, y },
    })!;
    const coupes = c.traces.filter((t) => t.genre === 'coupe');
    expect(coupes.length).toBeGreaterThanOrEqual(3); // deux murs + le toit
    const murs = coupes.filter((t) => t.pts[0]!.y === 0);
    expect(murs).toHaveLength(2);
    for (const m of murs) expect(Math.round(m.pts[1]!.x - m.pts[0]!.x)).toBe(300);
    // Le regard va vers le nord : la fenêtre nord se voit, le mur sud a disparu.
    expect(c.traces.some((t) => t.genre === 'baie')).toBe(true);
    expect(c.traces.at(-1)!.genre === 'coupe').toBe(true);
  });

  it('porte au sud : vue en façade sud, ôtée de la coupe qui regarde le nord ; toit hors champ', () => {
    let n = maison().niveaux[0]!;
    const bas = [...n.murs].sort((a, b) => b.a.y + b.b.y - (a.a.y + a.b.y))[0]!;
    n = ok(poserOuverture(n, { murId: bas.id, type: 'porte', centre: 3_000 }, ctx));
    const s = { ...maison(), niveaux: [n] };
    expect(elevation(s, 'sud')!.traces.some((t) => t.genre === 'porte')).toBe(true);
    const ys = n.murs.flatMap((m) => [m.a.y, m.b.y]);
    // Trait au ras de la façade sud, côté extérieur : la porte est devant, donc ôtée.
    const y = Math.max(...ys) - 100;
    const c = elevation(s, { a: { x: -20_000, y }, b: { x: 30_000, y } })!;
    expect(c.traces.some((t) => t.genre === 'porte')).toBe(false);
    // Trait au-delà du faîtage côté nord : seul ce qui est derrière reste, le toit est tronqué.
    const loin = elevation(s, {
      a: { x: -20_000, y: Math.min(...ys) + 50 },
      b: { x: 30_000, y: Math.min(...ys) + 50 },
    })!;
    expect(loin.traces.some((t) => t.genre === 'toit')).toBe(true);
  });

  it('coupe d’un étage : plancher tranché ; maison vide : rien', () => {
    const base = maison(false);
    const rdc = base.niveaux[0]!;
    const etage = {
      ...rdc,
      id: 'n_etage1',
      nom: 'Étage',
      type: 'etage' as const,
      altitude: 2_700,
      ouvertures: [],
    };
    const s: Scene = { ...base, niveaux: [rdc, etage] };
    const xs = rdc.murs.flatMap((m) => [m.a.x, m.b.x]);
    const c = elevation(s, {
      a: { x: Math.min(...xs) - 500, y: 4_000 },
      b: { x: Math.max(...xs) + 500, y: 4_000 },
    })!;
    expect(c.traces.some((t) => t.genre === 'plancher')).toBe(true);
    expect(c.reperes.map((r) => r.libelle)).toEqual(['RDC', 'Étage']);
    expect(elevation(nouvelleScene(ctx.nouvelId), 'sud')).toBeNull();
    expect(elevation(base, { a: { x: 0, y: 0 }, b: { x: 10, y: 0 } })).toBeNull();
  });
});
