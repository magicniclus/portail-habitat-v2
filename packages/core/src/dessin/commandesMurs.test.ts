import { describe, expect, it } from 'vitest';
import { contexteTest, niveauMaquette, ok } from './aidesTest';
import { couperMurAuMilieu, modifierMur, voisinFusionnable } from './commandesMurs';
import { longueurMur } from './murs';

describe('réglages et découpe d’un mur (DES-07, DES-09)', () => {
  const ctx = contexteTest();
  const n = niveauMaquette(ctx);
  const m = n.murs[0]!;

  it('épaisseur, hauteur, type, porteur ; valeurs hors bornes refusées', () => {
    const r = ok(modifierMur(n, m.id, { epaisseur: 200, hauteur: 2_700, porteur: false }, ctx));
    expect(r.murs[0]).toMatchObject({ epaisseur: 200, hauteur: 2_700, porteur: false });
    expect(ok(modifierMur(n, m.id, { type: 'poteau' }, ctx)).murs[0]!.type).toBe('poteau');
    expect(modifierMur(n, m.id, { epaisseur: 5 }, ctx)).toMatchObject({ code: 'ENTREE_INVALIDE' });
    expect(modifierMur(n, m.id, { hauteur: 50 }, ctx)).toMatchObject({ code: 'ENTREE_INVALIDE' });
    expect(modifierMur(n, 'm_absent', {}, ctx)).toMatchObject({ code: 'INTROUVABLE' });
  });

  it('couper au milieu puis refusionner avec le voisin aligné', () => {
    const coupe = ok(couperMurAuMilieu(n, m.id, ctx));
    expect(coupe.murs).toHaveLength(n.murs.length + 1);
    expect(Math.abs(longueurMur(coupe.murs[0]!) - longueurMur(m) / 2)).toBeLessThanOrEqual(1);
    const voisin = voisinFusionnable(coupe, m.id, ctx);
    expect(voisin).not.toBeNull();
    expect(voisinFusionnable(n, m.id, ctx)).toBeNull(); // angles droits : rien à fusionner
    expect(couperMurAuMilieu(n, 'm_absent', ctx)).toMatchObject({ code: 'INTROUVABLE' });
  });
});
