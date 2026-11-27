import {
  metreScene,
  mursDepuisForme,
  nouvelleScene,
  poserOuverture,
  type Scene,
} from '@ph/core/dessin';
import { describe, expect, it } from 'vitest';
import { genererPdfPlan } from './plan';

let k = 0;
const id = (p: string) => `${p}_pdf${String(k++).padStart(6, '0')}`;
function maison(): Scene {
  const s = nouvelleScene(id);
  const murs = mursDepuisForme(
    { forme: 'rectangle', largeur: 8_000, profondeur: 6_000 },
    { epaisseur: 200, hauteur: 2_500, nouvelId: id },
  );
  if (!murs.ok) throw new Error(murs.message);
  let n = { ...s.niveaux[0]!, murs: murs.data };
  const r = poserOuverture(
    n,
    { murId: murs.data[0]!.id, type: 'porte', centre: 2_000 },
    { nouvelId: id },
  );
  if (r.ok) n = r.data;
  const f = poserOuverture(
    n,
    { murId: murs.data[0]!.id, type: 'fenetre', centre: 5_000 },
    { nouvelId: id },
  );
  if (f.ok) n = f.data;
  return { ...s, niveaux: [n] };
}

describe('PDF du plan à l’échelle (DES-41)', () => {
  it('produit un PDF : plan + annexe du métré', async () => {
    const s = maison();
    const pdf = await genererPdfPlan({
      titre: 'Maison test',
      date: new Date(Date.UTC(2026, 10, 18)),
      scene: s,
      niveauId: s.niveaux[0]!.id,
      echelle: 50,
      format: 'A3',
      metre: metreScene(s),
      menuiseries: [{ libelle: 'Fenêtre', nombre: 1 }],
    });
    expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(pdf.toString('latin1').match(/\/Type \/Page\b/g)).toHaveLength(2);
  });

  it('refus lisibles : plan trop grand pour le format, niveau vide', async () => {
    const s = maison();
    const base = { titre: 'T', date: new Date(), scene: s, metre: [], menuiseries: [] };
    await expect(
      genererPdfPlan({ ...base, niveauId: s.niveaux[0]!.id, echelle: 50, format: 'A4' }),
    ).rejects.toThrow(/ne tient pas en A4/);
    const vide = nouvelleScene(id);
    await expect(
      genererPdfPlan({
        ...base,
        scene: vide,
        niveauId: vide.niveaux[0]!.id,
        echelle: 100,
        format: 'A4',
      }),
    ).rejects.toThrow(/Dessinez/);
  });
});
