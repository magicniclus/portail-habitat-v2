import { describe, expect, it } from 'vitest';
import type { Scene } from '../schemas/dessinScene';
import { contexteTest, niveauMaquette, ok } from './aidesTest';
import { batimentEn, batiments, murSousEtage } from './batiments';
import { mursDepuisForme } from './formes';
import { nouvelleScene } from './migrations';
import { ajouterNiveau } from './niveaux';

describe('ajouter un niveau au seul bâtiment choisi (DES-04)', () => {
  const ctx = contexteTest();
  const maison = niveauMaquette(ctx);
  // Annexe séparée : 3,80 × 3,20 m, à 3 m à droite de la maison (10,60 m de large).
  const annexe = mursDepuisForme(
    { forme: 'rectangle', largeur: 3_800, profondeur: 3_200 },
    { epaisseur: 200, hauteur: 2_500, nouvelId: ctx.nouvelId },
  );
  if (!annexe.ok) throw new Error(annexe.message);
  const decale = annexe.data.map((m) => ({
    ...m,
    a: { x: m.a.x + 13_600, y: m.a.y },
    b: { x: m.b.x + 13_600, y: m.b.y },
  }));
  const niveau = { ...maison, murs: [...maison.murs, ...decale] };
  const scene = (): Scene => ({
    ...nouvelleScene(ctx.nouvelId),
    niveaux: [{ ...niveau, id: 'n_rdc0', type: 'rdc', altitude: 0 }],
  });

  it('reconnaît deux bâtiments séparés', () => {
    expect(batiments(niveau.murs)).toHaveLength(2);
    expect(batimentEn(niveau.murs, { x: 15_000, y: 1_500 })).toHaveLength(4);
    expect(batimentEn(niveau.murs, { x: 30_000, y: 30_000 })).toBeNull();
  });

  it('l’étage ne reprend que les murs du bâtiment choisi', () => {
    const tout = ok(ajouterNiveau(scene(), { type: 'etage', copierMurs: true }, ctx));
    expect(tout.niveaux.at(-1)!.murs).toHaveLength(8);
    const seul = ok(
      ajouterNiveau(
        scene(),
        { type: 'etage', copierMurs: true, batiment: { x: 5_000, y: 4_000 } },
        ctx,
      ),
    );
    const etage = seul.niveaux.at(-1)!;
    expect(etage.murs).toHaveLength(4);
    expect(etage.murs.every((m) => m.a.x <= 10_600 && m.b.x <= 10_600)).toBe(true);
    expect(etage.pieces).toHaveLength(1);
  });

  it('seuls les murs qui ont l’étage au-dessus montent jusqu’à son plancher', () => {
    const etage = { murs: maison.murs, pieces: maison.pieces };
    for (const m of maison.murs) expect(murSousEtage(m, etage)).toBe(true);
    for (const m of decale) expect(murSousEtage(m, etage)).toBe(false);
  });
});
