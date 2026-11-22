import { describe, expect, it } from 'vitest';
import { niveau as schemaNiveau, type Scene } from '../schemas/dessinScene';
import { contexteTest, ok } from './aidesTest';
import { toitureAutomatique } from './commandesToit';
import { mursDepuisForme, type Forme } from './formes';
import { nouvelleScene } from './migrations';
import { niveauSuperieur } from './niveaux';
import { detecterPieces, synchroniserPieces } from './pieces';
import { toit3D } from './toits3d';
import type { TypeToiture } from './toitures';

const ctx = contexteTest();
type Murs = ReturnType<typeof forme>;
function forme(f: Forme, dx = 0, dy = 0) {
  const r = mursDepuisForme(f, { epaisseur: 200, hauteur: 2_500, nouvelId: ctx.nouvelId });
  if (!r.ok) throw new Error(r.message);
  return r.data.map((m) => ({
    ...m,
    a: { x: m.a.x + dx, y: m.a.y + dy },
    b: { x: m.b.x + dx, y: m.b.y + dy },
  }));
}
const rect = (l: number, p: number, dx = 0, dy = 0) =>
  forme({ forme: 'rectangle', largeur: l, profondeur: p }, dx, dy);
const niv = (id: string, type: 'rdc' | 'etage', altitude: number, murs: Murs) => ({
  ...schemaNiveau.parse({ id, nom: id, type, altitude }),
  murs,
  pieces: synchroniserPieces([], detecterPieces(murs), () => ctx.nouvelId('p')),
});
const scene = (rdc: Murs, etage: Murs | null): Scene => ({
  ...nouvelleScene(ctx.nouvelId),
  niveaux: [niv('n_rdc0', 'rdc', 0, rdc), ...(etage ? [niv('n_et01', 'etage', 2_700, etage)] : [])],
});

const principal = () => rect(8_050, 9_400);
const aile = () => rect(3_810, 5_920, 8_050, 3_480);
const SITUATIONS: [string, () => Scene][] = [
  ['plain-pied', () => scene([...principal(), ...aile()], null)],
  ['étage complet', () => scene([...principal(), ...aile()], [...principal(), ...aile()])],
  ['étage sur une partie', () => scene([...principal(), ...aile()], principal())],
  [
    'annexe séparée sans étage',
    () => scene([...principal(), ...rect(3_800, 3_200, 12_000, 0)], principal()),
  ],
  [
    'maison en L, étage partiel',
    () =>
      scene(
        forme({
          forme: 'L',
          largeur: 12_000,
          profondeur: 10_000,
          decoupe: { largeur: 5_000, profondeur: 4_000 },
        }),
        rect(7_000, 10_000),
      ),
  ],
];
const TYPES: TypeToiture[] = [
  'deux_pans',
  'quatre_pans',
  'croupe',
  'monopente',
  'plate',
  'mansarde',
];

describe('toit : toutes les situations de niveaux et de formes (DES-16)', () => {
  for (const [nom, faire] of SITUATIONS)
    for (const type of TYPES)
      it(`${nom} · ${type}`, () => {
        const s = ok(toitureAutomatique(faire(), type));
        const haut = s.niveaux.find((n) => n.id === 'n_et01') ?? s.niveaux[0]!;
        for (const n of s.niveaux) {
          const dessus = niveauSuperieur(s, n.id);
          const t = n.toiture ? toit3D(n, dessus) : null;
          if (!t) continue;
          const z = t.pans.flat().map((p) => p.z);
          // Rien d'absurde : pas de NaN, faîtage au-dessus de l'égout, débords loin du sol.
          expect(z.every(Number.isFinite), `${n.id} NaN`).toBe(true);
          expect(t.faitage).toBeGreaterThanOrEqual(t.egout);
          expect(Math.min(...z)).toBeGreaterThanOrEqual(n.altitude + 1_000);
          // Un appentis contre l'étage s'arrête sous ses fenêtres (légère cassure de pente).
          if (dessus && t.ailes.some((e) => e.cotes.b0 === 'etage' || e.cotes.b1 === 'etage'))
            expect(t.faitage).toBeLessThanOrEqual(dessus.altitude + 800 + 1);
        }
        // Le dernier niveau a toujours son toit ; une partie sans étage est toujours couverte.
        expect(toit3D(haut, null)).not.toBeNull();
        const rdc = s.niveaux.find((n) => n.id === 'n_rdc0')!;
        const etage = s.niveaux.find((n) => n.id === 'n_et01');
        if (etage && nom !== 'étage complet') expect(rdc.toiture).not.toBeNull();
        if (nom === 'étage complet') expect(rdc.toiture).toBeNull();
      });
});
