import { describe, expect, it } from 'vitest';
import { contexteTest, niveauMaquette, ok } from './aidesTest';
import { definirToiture, modifierToiture, orienterToit, reglerPartieToit } from './commandesToit';
import { defautsToit } from './aidesTestToit';
import { nouvelleScene } from './migrations';
import { pieceRectangle } from './piecesDessinees';
import { toit3D } from './toits3d';
import { emprisesToit } from './toitures';

describe('sens du toit choisi sur le plan (DES-16)', () => {
  const ctx = contexteTest();
  // Maison de la maquette : 10,60 m de large (x) sur 8,60 m (y).
  const maison = niveauMaquette(ctx);
  const faitageHorizontal = (e: ReturnType<typeof emprisesToit>[number]) =>
    Math.abs(e.u.x) > Math.abs(e.u.y);

  it('faîtage horizontal ou vertical, automatique par défaut', () => {
    const n = ok(definirToiture(maison, 'deux_pans'));
    expect(faitageHorizontal(emprisesToit(n)[0]!)).toBe(true);
    const v = ok(orienterToit(n, { sens: 'vertical' }));
    expect(v.toiture!.sens).toBe('vertical');
    expect(faitageHorizontal(emprisesToit(v)[0]!)).toBe(false);
    const auto = ok(orienterToit(v, { sens: null }));
    expect('sens' in auto.toiture!).toBe(false);
    expect(faitageHorizontal(emprisesToit(auto)[0]!)).toBe(true);
  });

  it('monopente : le côté bas est celui choisi (gauche, droite, haut, bas)', () => {
    const n = ok(definirToiture(maison, 'monopente'));
    const hauteurEn = (m: typeof n, x: number, y: number) => {
      const t = toit3D(m)!;
      const pan = t.pans[0]!;
      // Sommet du pan le plus proche du point (x, y).
      return [...pan].sort(
        (p, q) => Math.hypot(p.x - x, p.y - y) - Math.hypot(q.x - x, q.y - y),
      )[0]!.z;
    };
    for (const [descente, bas, haut] of [
      ['gauche', [0, 4_300], [10_600, 4_300]],
      ['droite', [10_600, 4_300], [0, 4_300]],
      ['haut', [5_300, 0], [5_300, 8_600]],
      ['bas', [5_300, 8_600], [5_300, 0]],
    ] as const) {
      const m = ok(orienterToit(n, { descente }));
      expect(hauteurEn(m, bas[0], bas[1]), descente).toBeLessThan(hauteurEn(m, haut[0], haut[1]));
    }
  });

  it('une partie peut avoir son propre sens ; revenue au réglage commun, elle n’est plus gardée', () => {
    const n = ok(definirToiture(maison, 'deux_pans'));
    const cle = emprisesToit(n)[0]!.cle;
    const r = ok(reglerPartieToit(n, cle, { sens: 'vertical', descente: 'gauche' }));
    expect(r.toiture!.parties).toEqual([{ cle, sens: 'vertical', descente: 'gauche' }]);
    expect(faitageHorizontal(emprisesToit(r)[0]!)).toBe(false);
    const commun = ok(reglerPartieToit(r, cle, { sens: null, descente: null }));
    expect(commun.toiture!.parties).toEqual([]);
    expect(orienterToit({ ...maison, toiture: null }, { sens: 'vertical' }).ok).toBe(false);
  });

  it('versants confondus (mansarde à 70° : brisis et terrasson de même pente) : un pan chacun', () => {
    const n = ok(modifierToiture(ok(definirToiture(maison, 'mansarde')), { pentes: [700] }));
    expect(toit3D(n)!.pans).toHaveLength(2);
  });

  it('avancée de moins de 60 cm : englobée par l’aile qu’elle longe, toit sans trou', () => {
    const avancee = ok(
      pieceRectangle(maison, { x: 3_000, y: 8_450 }, { x: 7_000, y: 8_850 }, contexteTest()),
    );
    const t = toit3D(ok(definirToiture(avancee, 'deux_pans')))!;
    expect(t.ailes).toHaveLength(1);
    expect(
      defautsToit({
        ...nouvelleScene(contexteTest().nouvelId),
        niveaux: [{ ...avancee, toiture: ok(definirToiture(avancee, 'deux_pans')).toiture }],
      }),
    ).toEqual([]);
  });
});
