import { describe, expect, it } from 'vitest';
import { scene as schemaScene } from '../schemas/dessinScene';
import { contexteTest, ok } from './aidesTest';
import { sceneDemo } from './demo';
import { metreNiveau } from './metre';

describe('maison de démonstration en L', () => {
  it('pièces, ouvertures, meubles, revêtements, extérieur et toit : scène valide', () => {
    const s = ok(sceneDemo(contexteTest()));
    expect(schemaScene.safeParse(s).success).toBe(true);
    const n = s.niveaux[0]!;
    expect(n.pieces.map((x) => x.type).sort()).toEqual([
      'chambre',
      'chambre',
      'cuisine',
      'salle_de_bain',
      'sejour',
      'wc',
    ]);
    expect(n.ouvertures).toHaveLength(12);
    expect(n.objets.length).toBeGreaterThanOrEqual(30);
    expect(n.pieces.find((x) => x.type === 'sejour')!.sol.materiauId).toBe('pa-chene-clair');
    expect(n.exterieur.terrasses).toHaveLength(2);
    expect(n.exterieur.piscines).toHaveLength(1);
    expect(n.exterieur.vegetation).toHaveLength(4);
    expect(n.exterieur.clotures).toHaveLength(1);
    expect(n.exterieur.clotures[0]!.points).toHaveLength(6);
    expect(n.toiture?.type).toBe('deux_pans');
    expect(s.terrain?.parcelle).toHaveLength(4);
    const postes = metreNiveau(n).map((l) => l.poste);
    expect(postes).toEqual(
      expect.arrayContaining([
        'porte_entree',
        'fenetres',
        'terrasse',
        'piscine',
        'plan_de_travail',
      ]),
    );
  });
});
