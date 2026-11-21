import { describe, expect, it } from 'vitest';
import type { Niveau } from '../schemas/dessinScene';
import { contexteTest, niveauMaquette, ok } from './aidesTest';
import { descriptionSelection, type GenreAnnonce } from './annonces';
import { CATALOGUE_OBJETS } from './catalogue';
import { poserEscalier } from './escaliers';
import { ajouterPiscine, ajouterTerrasse, ajouterVegetal, tracerCloture } from './exterieur';
import { poserObjet } from './objets';
import { poserOuverture } from './ouvertures';
import { ajouterZoneSol } from './revetements';
const ctx = contexteTest();

describe('annonce de l’élément choisi (DES-47)', () => {
  it('nature et mesures de chaque genre ; rien ou élément disparu : chaîne vide', () => {
    let n: Niveau = niveauMaquette(ctx);
    const mur = n.murs[0]!;
    const piece = n.pieces[0]!;
    n = ok(poserOuverture(n, { murId: mur.id, type: 'porte', centre: 2_000 }, ctx));
    n = ok(
      poserObjet(
        n,
        { catalogueId: CATALOGUE_OBJETS[0]!.id, position: { x: 4_000, y: 4_000 } },
        ctx,
      ),
    );
    n = ok(
      poserEscalier(
        n,
        { type: 'droit', position: { x: 2_000, y: 6_000 }, hauteurAMonter: 2_700 },
        ctx,
      ),
    );
    const z = ok(
      ajouterZoneSol(
        n,
        {
          pieceId: piece.id,
          contour: [
            { x: 1_000, y: 1_000 },
            { x: 3_000, y: 1_000 },
            { x: 3_000, y: 3_000 },
            { x: 1_000, y: 3_000 },
          ],
          revetement: { famille: 'aucun' },
        },
        ctx,
      ),
    );
    n = z;
    const t = ok(
      ajouterTerrasse(n, { x: -5_000, y: 0 }, { x: -1_000, y: 4_000 }, ctx, { aimant: false }),
    );
    const p = ok(ajouterPiscine(t, { x: 5_000, y: 20_000 }, 'rectangle', ctx));
    const c = ok(
      tracerCloture(
        p,
        { a: { x: -10_000, y: 30_000 }, b: { x: 10_000, y: 30_000 }, type: 'bois' },
        ctx,
      ),
    );
    const v = ok(ajouterVegetal(c, { x: 20_000, y: 20_000 }, 'arbre', ctx));
    n = v;
    const d = (genre: GenreAnnonce, id: string) => descriptionSelection(n, { genre, id });
    expect(d('mur', mur.id)).toMatch(/^Mur choisi : [\d,]+ m, épaisseur 30 cm, hauteur 2,50 m\.$/);
    expect(d('piece', piece.id)).toMatch(/^Pièce choisie : .+, 80,0 m²\.$/);
    expect(d('ouverture', n.ouvertures[0]!.id)).toBe('Porte choisie : 83 × 204 cm.');
    expect(d('objet', n.objets[0]!.id)).toMatch(/choisi : \d+ × \d+ cm, rotation \d+°\.$/);
    expect(d('escalier', n.escaliers[0]!.id)).toMatch(/^Escalier choisi : /);
    expect(d('zone', z.zoneId)).toBe('Zone choisie : 4,0 m².');
    expect(d('parcelle', 'parcelle')).toMatch(/^Parcelle choisie/);
    expect(d('allee', '0')).toBe('');
    expect(d('terrasse', t.elementId)).toBe('Terrasse choisie : 16,0 m².');
    expect(d('piscine', p.elementId)).toMatch(/^Piscine choisie : .+, [\d,]+ m²\.$/);
    expect(d('cloture', c.elementId)).toBe('Clôture choisie : 20,00 m.');
    expect(d('vegetal', v.elementId)).toMatch(/^Arbre choisi : [\d,]+ m de diamètre\.$/);
    expect(descriptionSelection(n, null)).toBe('');
    for (const g of [
      'mur',
      'piece',
      'ouverture',
      'escalier',
      'objet',
      'zone',
      'terrasse',
      'piscine',
      'cloture',
      'vegetal',
    ] as const)
      expect(d(g, 'absent')).toBe('');
  });
});
