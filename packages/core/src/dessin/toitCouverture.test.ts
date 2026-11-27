import { expect, it } from 'vitest';
import { niveau as schemaNiveau, type Scene } from '../schemas/dessinScene';
import { contexteTest, ok } from './aidesTest';
import { murPlein } from './ailesToit';
import { toitureAutomatique } from './commandesToit';
import { mursDepuisForme, type Forme } from './formes';
import { pointDansPolygone } from './geometrie';
import { nouvelleScene } from './migrations';
import { niveauSuperieur } from './niveaux';
import { detecterPieces, synchroniserPieces } from './pieces';
import { toit3D } from './toits3d';
import type { TypeToiture } from './toitures';

const ctx = contexteTest();
const forme = (f: Forme, dx = 0, dy = 0) =>
  ok(mursDepuisForme(f, { epaisseur: 200, hauteur: 2_500, nouvelId: ctx.nouvelId })).map((m) => ({
    ...m,
    a: { x: m.a.x + dx, y: m.a.y + dy },
    b: { x: m.b.x + dx, y: m.b.y + dy },
  }));
const rect = (l: number, p: number, dx = 0, dy = 0) =>
  forme({ forme: 'rectangle', largeur: l, profondeur: p }, dx, dy);
type M = ReturnType<typeof rect>;
const niv = (id: string, type: 'rdc' | 'etage', altitude: number, murs: M) => ({
  ...schemaNiveau.parse({ id, nom: id, type, altitude }),
  murs,
  pieces: synchroniserPieces([], detecterPieces(murs), () => ctx.nouvelId('p')),
});
const scene = (rdc: M, etage: M | null): Scene => ({
  ...nouvelleScene(ctx.nouvelId),
  niveaux: [niv('n_rdc0', 'rdc', 0, rdc), ...(etage ? [niv('n_et01', 'etage', 2_700, etage)] : [])],
});
const L = () =>
  forme({
    forme: 'L',
    largeur: 12_000,
    profondeur: 10_000,
    decoupe: { largeur: 5_000, profondeur: 4_000 },
  });
const S: [string, () => Scene][] = [
  ['rect', () => scene(rect(10_910, 6_250), null)],
  ['rect+etage', () => scene(rect(10_910, 6_250), rect(10_910, 6_250))],
  ['rect+aile', () => scene([...rect(10_910, 6_250), ...rect(3_000, 4_000, 10_910, 1_000)], null)],
  [
    'etage rect+aile',
    () =>
      scene(
        [...rect(10_910, 6_250), ...rect(3_000, 4_000, 10_910, 1_000)],
        [...rect(10_910, 6_250), ...rect(3_000, 4_000, 10_910, 1_000)],
      ),
  ],
  [
    'etage partiel',
    () =>
      scene([...rect(10_910, 6_250), ...rect(3_000, 4_000, 10_910, 1_000)], rect(10_910, 6_250)),
  ],
  ['L', () => scene(L(), null)],
  ['L etage', () => scene(L(), L())],
  ['aile bout', () => scene([...rect(8_000, 6_000), ...rect(3_000, 6_000, 8_000, 0)], null)],
  ['aile decalee', () => scene([...rect(8_000, 6_000), ...rect(4_000, 3_000, 8_000, 3_000)], null)],
];
const TYPES: TypeToiture[] = [
  'deux_pans',
  'quatre_pans',
  'croupe',
  'monopente',
  'plate',
  'mansarde',
];
/**
 * Toits de toutes formes (DES-16) : tout le dessus de la maison est couvert, et chaque pan est
 * plan (un pan plié se voit comme une barre sur le toit).
 */
it('toits : aucun trou, pans plans, pour chaque forme de maison et chaque type', () => {
  const out: string[] = [];
  for (const [nom, f] of S)
    for (const type of TYPES) {
      const s = ok(toitureAutomatique(f(), type));
      for (const n of s.niveaux) {
        const dessus = niveauSuperieur(s, n.id);
        const t = n.toiture ? toit3D(n, dessus) : null;
        if (!t) continue;
        const polys = [...n.pieces.map((p) => p.contour), ...n.murs.map(murPlein)];
        const haut = dessus
          ? [...dessus.pieces.map((p) => p.contour), ...dessus.murs.map(murPlein)]
          : [];
        const xs = polys.flat().map((p) => p.x),
          ys = polys.flat().map((p) => p.y);
        let trous = 0,
          ex = '';
        for (let x = Math.min(...xs) + 37; x < Math.max(...xs); x += 100)
          for (let y = Math.min(...ys) + 37; y < Math.max(...ys); y += 100) {
            const p = { x, y };
            if (
              !polys.some((q) => pointDansPolygone(p, q)) ||
              haut.some((q) => pointDansPolygone(p, q))
            )
              continue;
            if (
              !t.pans.some((pan) =>
                pointDansPolygone(
                  p,
                  pan.map((q) => ({ x: q.x, y: q.y })),
                ),
              )
            ) {
              trous++;
              ex ||= `${x},${y}`;
            }
          }
        if (trous)
          out.push(`${nom} ${type} ${n.id}: ${trous} trous ex ${ex} ailes ${t.ailes.length}`);
      }
    }
  expect(out).toEqual([]);
}, 60_000);
