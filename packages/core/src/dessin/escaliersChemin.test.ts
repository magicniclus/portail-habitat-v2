import { describe, expect, it } from 'vitest';
import { contexteTest, niveauMaquette, ok } from './aidesTest';
import {
  centresChemin,
  deplacerPointEscalier,
  empriseChemin,
  limitesMarchesChemin,
  poserEscalierTrace,
} from './escaliersChemin';
import { MODELES_ESCALIER, modeleDe } from './modelesEscalier';
import { deplacerEscalier, emprise, marchesDroites, modifierEscalier } from './escaliers';
import { habillageEscalier } from './escaliersHabillage';

const ctx = contexteTest();
const n = niveauMaquette(ctx);
const poser = (chemin: { x: number; y: number }[], virage: 'balance' | 'palier' = 'balance') =>
  ok(poserEscalierTrace(n, { chemin, hauteurAMonter: 2_700, virage }, ctx)).escaliers.at(-1)!;

describe('escalier tracé (DES-15)', () => {
  it('droit : la longueur tracée donne le giron ; emprise et marches', () => {
    const e = poser([
      { x: 1_000, y: 1_000 },
      { x: 1_000, y: 4_000 },
    ]);
    expect(e).toMatchObject({ position: { x: 1_000, y: 1_000 }, nbMarches: 15, giron: 200 });
    expect(e.chemin).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 3_000 },
    ]);
    const c = centresChemin(e);
    expect(c).toHaveLength(15);
    expect(c.every((x) => Math.abs(x.sens - Math.PI / 2) < 1e-9 && x.profondeur === 200)).toBe(
      true,
    );
    expect(empriseChemin(e)).toEqual([
      { x: 450, y: 0 },
      { x: 450, y: 3_000 },
      { x: -450, y: 3_000 },
      { x: -450, y: 0 },
    ]);
    expect(limitesMarchesChemin(e)).toHaveLength(14);
  });

  it('balancé : les marches tournent dans l’angle ; emprise en L', () => {
    const e = poser([
      { x: 0, y: 0 },
      { x: 0, y: 2_000 },
      { x: 2_000, y: 2_000 },
    ]);
    const c = centresChemin(e);
    expect(c).toHaveLength(e.nbMarches);
    // Une marche dans le virage a une direction entre les deux volées.
    expect(c.some((x) => x.sens > 0.1 && x.sens < Math.PI / 2 - 0.1)).toBe(true);
    expect(empriseChemin(e)).toHaveLength(6);
  });

  it('palier : un palier carré dans l’angle, les marches sur les volées', () => {
    const e = poser(
      [
        { x: 0, y: 0 },
        { x: 0, y: 2_500 },
        { x: 2_500, y: 2_500 },
      ],
      'palier',
    );
    const c = centresChemin(e);
    const paliers = c.filter((x) => x.palier);
    expect(paliers).toHaveLength(1);
    expect(paliers[0]).toMatchObject({ local: { x: 0, y: 2_500 }, profondeur: 900 });
    expect(c).toHaveLength(e.nbMarches);
    // Les marches ne débordent pas sur le palier.
    expect(c.filter((x) => !x.palier).every((x) => x.local.y < 2_050 || x.local.x > 450)).toBe(
      true,
    );
    expect(limitesMarchesChemin(e).length).toBeGreaterThan(10);
  });

  it('trop court : refusé ; un point déplacé recalcule le giron (rotation comprise)', () => {
    expect(
      poserEscalierTrace(
        n,
        {
          chemin: [
            { x: 0, y: 0 },
            { x: 0, y: 500 },
          ],
          hauteurAMonter: 2_700,
        },
        ctx,
      ).ok,
    ).toBe(false);
    const avec = ok(
      poserEscalierTrace(
        n,
        {
          chemin: [
            { x: 1_000, y: 1_000 },
            { x: 1_000, y: 4_000 },
          ],
          hauteurAMonter: 2_700,
        },
        ctx,
      ),
    );
    const e = avec.escaliers.at(-1)!;
    const tourne = { ...avec, escaliers: [{ ...e, rotation: 900 }] };
    // Tourné d'un quart : le local (0, 3 000) est sur le plan en (-2 000, 1 000).
    const r = ok(deplacerPointEscalier(tourne, e.id, 1, { x: -3_000, y: 1_000 }));
    const f = r.escaliers[0]!;
    expect(f.chemin![1]).toEqual({ x: 0, y: 4_000 });
    expect(f.giron).toBe(267);
    expect(deplacerPointEscalier(tourne, 'esc_absent', 0, { x: 0, y: 0 }).ok).toBe(false);
  });

  it('en 3D et sur le plan : palier sans nez, suspendu sans limon ; emprise placée', () => {
    const e = poser(
      [
        { x: 1_000, y: 1_000 },
        { x: 1_000, y: 3_500 },
        { x: 3_500, y: 3_500 },
      ],
      'palier',
    );
    const pieces = habillageEscalier({ ...e, structure: 'ouverte', limon: 'aucun' }, 0);
    expect(pieces.filter((p) => p.matiere === 'limon')).toHaveLength(0);
    expect(pieces.some((p) => p.matiere === 'marche' && p.taille.p === 900)).toBe(true);
    const lateraux = habillageEscalier({ ...e, structure: 'ouverte', limon: 'lateraux' }, 0);
    expect(lateraux.filter((p) => p.matiere === 'limon').length).toBeGreaterThan(0);
    expect(emprise(e)[0]).toEqual({ x: 1_450, y: 1_000 });
    expect(marchesDroites(e).length).toBeGreaterThan(10);
    // Plus large : le giron suit (paliers plus grands, volées plus courtes).
    const avec = { ...n, escaliers: [e] };
    const large = modifierEscalier(avec, e.id, { largeur: 1_200 });
    expect(large.ok && large.data.escaliers[0]!.giron).toBeLessThan(e.giron);
  });

  it('modèles : chaque escalier posé retrouve son modèle', () => {
    const e = poser([
      { x: 0, y: 0 },
      { x: 0, y: 3_000 },
    ]);
    for (const [id, m] of Object.entries(MODELES_ESCALIER))
      if (m.trace) expect(modeleDe({ ...e, ...m.trace })).toBe(id);
    expect(modeleDe({ ...e, chemin: undefined, type: 'helicoidal' })).toBe('colimacon');
    expect(modeleDe({ ...e, chemin: undefined, type: 'meunier' })).toBe('meunier');
    expect(modeleDe({ ...e, chemin: undefined, type: 'droit' })).toBe('limons');
  });

  it('se déplace d’un bloc, tracé compris', () => {
    const e = poser([
      { x: 1_000, y: 1_000 },
      { x: 1_000, y: 4_000 },
    ]);
    const avec = { ...n, escaliers: [e] };
    const r = ok(deplacerEscalier(avec, e.id, { x: 500, y: -250 }));
    expect(r.escaliers[0]).toMatchObject({ position: { x: 1_500, y: 750 }, chemin: e.chemin });
    expect(deplacerEscalier(avec, 'esc_absent', { x: 0, y: 0 }).ok).toBe(false);
  });

  it('point répété dans le tracé (double-clic, plan déjà enregistré) : emprise et marches valides', () => {
    const tour = [
      { x: 7600, y: 8000 },
      { x: 7600, y: 1000 },
      { x: 5000, y: 1000 },
    ];
    const net = ok(
      poserEscalierTrace(niveauMaquette(ctx), { chemin: tour, hauteurAMonter: 2_700 }, ctx),
    );
    const double = [...tour, tour[2]!];
    const pose = ok(
      poserEscalierTrace(niveauMaquette(ctx), { chemin: double, hauteurAMonter: 2_700 }, ctx),
    );
    expect(pose.escaliers[0]!.chemin).toHaveLength(3);
    // Plan enregistré avant la correction : le doublon est dans le tracé.
    const ancien = {
      ...net.escaliers[0]!,
      chemin: [...net.escaliers[0]!.chemin!, { x: -2600, y: -7000 }],
    };
    for (const e of [
      ancien,
      {
        ...ancien,
        chemin: [ancien.chemin[0]!, ancien.chemin[1]!, ancien.chemin[1]!, ancien.chemin[2]!],
      },
    ]) {
      const pts = [
        ...emprise(e),
        ...centresChemin(e).map((c) => c.local),
        ...limitesMarchesChemin(e).flat(),
      ];
      expect(pts.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);
      expect(emprise(e)).toEqual(emprise(net.escaliers[0]!));
    }
  });
});
