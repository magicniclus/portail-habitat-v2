import { describe, expect, it } from 'vitest';
import { contexteTest, niveauMaquette, ok } from './aidesTest';
import {
  etirerOuverture,
  glisserOuverture,
  ouvertureTiree,
  poserOuvertureTiree,
} from './poseOuverture';

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

describe('déplacer une menuiserie posée (DES-14)', () => {
  it('glisse le long de son mur, bornée aux extrémités, sans chevaucher une autre', () => {
    let r = ok(poserOuvertureTiree(n, 'porte', premier, { x: 1150, y: 300 }, ctx));
    const id = r.ouvertures.at(-1)!.id;
    r = ok(glisserOuverture(r, id, { x: 5150, y: 400 }));
    expect(r.ouvertures.at(-1)!.position).toBe(5000 - 415);
    // Au-delà du bout du mur : arrêtée contre l'extrémité.
    r = ok(glisserOuverture(r, id, { x: 99_000, y: 150 }));
    const o = r.ouvertures.at(-1)!;
    expect(o.position + o.largeur).toBe(10_300);
    // Sur une autre ouverture : refusé.
    const deux = ok(
      poserOuvertureTiree(r, 'fenetre', { x: 3150, y: 150 }, { x: 3150, y: 300 }, ctx),
    );
    expect(glisserOuverture(deux, id, { x: 3150, y: 150 }).ok).toBe(false);
    expect(glisserOuverture(deux, 'o_absente', { x: 0, y: 0 }).ok).toBe(false);
  });

  it('s’agrandit ou rétrécit par un bord, l’autre bord restant en place', () => {
    // Porte de 90 cm de 1 000 à 1 900 mm depuis le début du mur.
    let r = ok(poserOuvertureTiree(n, 'porte', premier, { x: 2050, y: 400 }, ctx));
    const id = r.ouvertures.at(-1)!.id;
    r = ok(etirerOuverture(r, id, 'fin', { x: 2354, y: 300 }));
    expect(r.ouvertures.at(-1)).toMatchObject({ position: 1000, largeur: 1200 });
    r = ok(etirerOuverture(r, id, 'debut', { x: 1450, y: 0 }));
    expect(r.ouvertures.at(-1)).toMatchObject({ position: 1300, largeur: 900 });
    // Jamais moins de 30 cm, jamais au-delà du mur.
    r = ok(etirerOuverture(r, id, 'debut', { x: 9000, y: 150 }));
    expect(r.ouvertures.at(-1)).toMatchObject({ position: 1900, largeur: 300 });
    r = ok(etirerOuverture(r, id, 'fin', { x: 99_000, y: 150 }));
    expect(r.ouvertures.at(-1)).toMatchObject({ position: 1900, largeur: 10_300 - 1900 });
    r = ok(etirerOuverture(r, id, 'debut', { x: -5000, y: 150 }));
    expect(r.ouvertures.at(-1)).toMatchObject({ position: 0, largeur: 10_300 });
    expect(etirerOuverture(r, 'o_absente', 'fin', { x: 0, y: 0 }).ok).toBe(false);
  });
});
