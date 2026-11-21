import { describe, expect, it } from 'vitest';
import { contexteTest, niveauMaquette, ok } from './aidesTest';
import { ouvertureTiree, poserOuvertureTiree } from './poseOuverture';

const ctx = contexteTest();
// Maquette : mur du haut de (150, 150) à (10 450, 150), intérieur côté y > 150.
const n = niveauMaquette(ctx);
const mur = n.murs[0]!;
const premier = { x: 1150, y: 150 }; // 1 000 mm depuis le début du mur

describe('menuiserie tirée en deux clics (DES-14)', () => {
  it('largeur entre les deux clics, charnière au premier, ouvrant du côté de la souris', () => {
    // Vers la droite, souris côté pièce : 90 cm, charnière au début, vers l'intérieur.
    expect(ouvertureTiree(n, 'porte', premier, { x: 2050, y: 400 })).toMatchObject({
      murId: mur.id,
      position: 1000,
      largeur: 900,
      sens: 'gauche',
      cote: 'interieur',
    });
    // Vers la gauche, souris dehors : charnière à la fin (côté du premier clic), vers l'extérieur.
    expect(ouvertureTiree(n, 'porte', premier, { x: 350, y: -200 })).toMatchObject({
      position: 200,
      largeur: 800,
      sens: 'droite',
      cote: 'exterieur',
    });
  });

  it('deux clics au même endroit : largeur du catalogue, centrée ; hors mur : rien', () => {
    expect(ouvertureTiree(n, 'porte', premier, { x: 1160, y: 300 })).toMatchObject({
      position: 1000 - 415,
      largeur: 830,
    });
    expect(ouvertureTiree(n, 'porte', { x: 5000, y: 5000 }, premier)).toBeNull();
  });

  it('largeur arrondie au centimètre et bornée au mur', () => {
    const o = ouvertureTiree(n, 'fenetre', premier, { x: 99_999, y: 200 })!;
    expect(o.position + o.largeur).toBe(10_300);
    expect(ouvertureTiree(n, 'fenetre', premier, { x: 2_234, y: 200 })!.largeur).toBe(1_080);
  });

  it('pose : l’ouverture prend la largeur, le sens et le côté tirés', () => {
    const r = ok(poserOuvertureTiree(n, 'porte', premier, { x: 2050, y: -300 }, ctx));
    expect(r.ouvertures.at(-1)).toMatchObject({
      position: 1000,
      largeur: 900,
      sens: 'gauche',
      cote: 'exterieur',
    });
    expect(poserOuvertureTiree(n, 'porte', { x: 5000, y: 5000 }, premier, ctx).ok).toBe(false);
  });
});
