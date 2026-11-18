import { describe, expect, it } from 'vitest';
import type { Niveau } from '../schemas/dessinScene';
import { contexteTest, niveauMaquette } from './aidesTest';
import { poserEscalier } from './escaliers';
import { nouvelleScene } from './migrations';
import { pointDansPolygone } from './geometrie';
import { ajouterNiveau } from './niveaux';
import { poserObjet } from './objets';
import { poserOuverture } from './ouvertures';
import {
  departVisite,
  deplacerVisiteur,
  niveauALaHauteur,
  obstaclesVisite,
  RAYON_VISITEUR,
  solSousLesPieds,
} from './visite';

const ok = <T>(r: { ok: true; data: T } | { ok: false; message: string }): T => {
  if (!r.ok) throw new Error(r.message);
  return r.data;
};
// Pièce de la maquette : intérieur de 300 à 10 300 (x) et de 300 à 8 300 (y), mur du haut à y = 150.
const ctx = contexteTest();
const n = niveauMaquette(ctx);

describe('visite (DES-34)', () => {
  it('départ au centre de la pièce ; on avance librement, on glisse le long d’un mur', () => {
    const depart = departVisite(n);
    expect(depart).toEqual({ x: 5300, y: 4300 });
    const obs = obstaclesVisite(n);
    expect(deplacerVisiteur(depart, { x: 100, y: 0 }, obs)).toEqual({ x: 5400, y: 4300 });
    // Contre le mur du haut, en biais : on glisse le long en x.
    const pres = { x: 5000, y: 300 + RAYON_VISITEUR + 10 };
    expect(deplacerVisiteur(pres, { x: 100, y: -100 }, obs)).toEqual({ x: 5100, y: pres.y });
    // Dans un angle : bloqué.
    const coin = { x: 300 + RAYON_VISITEUR + 10, y: 300 + RAYON_VISITEUR + 10 };
    expect(deplacerVisiteur(coin, { x: -100, y: -100 }, obs)).toEqual(coin);
  });

  it('on passe une porte, pas une fenêtre ; un lit bloque, un tapis non', () => {
    const m = n.murs[0]!;
    let avec = ok(poserOuverture(n, { murId: m.id, type: 'porte', centre: 3000 }, ctx));
    avec = ok(poserOuverture(avec, { murId: m.id, type: 'fenetre', centre: 7000 }, ctx));
    const obs = obstaclesVisite(avec);
    const porte = avec.ouvertures[0]!;
    const x = m.a.x + porte.position + porte.largeur / 2;
    // Traverser le mur du haut (axe y = 150) dans l'axe de la porte.
    expect(deplacerVisiteur({ x, y: 600 }, { x: 0, y: -900 }, obs).y).toBe(-300);
    expect(deplacerVisiteur({ x: 7000, y: 600 }, { x: 0, y: -900 }, obs).y).toBe(600);
    const meuble = (id: string) =>
      obstaclesVisite(ok(poserObjet(n, { catalogueId: id, position: { x: 5000, y: 4000 } }, ctx)));
    expect(meuble('lit-160').length).toBe(obstaclesVisite(n).length + 1);
    expect(meuble('tapis').length).toBe(obstaclesVisite(n).length);
  });

  it('escalier praticable : on monte marche à marche jusqu’à l’étage', () => {
    let scene = { ...nouvelleScene(ctx.nouvelId), niveaux: [{ ...n, id: 'n_rdc0' }] as Niveau[] };
    const rdc = ok(
      poserEscalier(
        scene.niveaux[0]!,
        { type: 'droit', position: { x: 1000, y: 1000 }, hauteurAMonter: 2_700 },
        ctx,
      ),
    );
    scene = { ...scene, niveaux: [rdc] };
    scene = ok(ajouterNiveau(scene, { type: 'etage', copierMurs: true }, ctx));
    const e = rdc.escaliers[0]!;
    let z = 0;
    // On monte dans l'axe de l'escalier (y croissant depuis le bas de la volée).
    for (let y = e.position.y + 50; y < e.position.y + 4_500; y += 100)
      z = solSousLesPieds(scene, { x: e.position.x + e.largeur / 2, y }, z);
    expect(z).toBe(2_700);
    expect(niveauALaHauteur(scene, z).altitude).toBe(2_700);
    // Sans escalier, impossible de « sauter » à l'étage : on reste au sol.
    expect(solSousLesPieds(scene, { x: 5000, y: 4000 }, 0)).toBe(0);
    expect(niveauALaHauteur(scene, -50).altitude).toBe(0);
    // Hors de toute pièce et de toute marche : on garde son altitude.
    expect(solSousLesPieds(scene, { x: -5000, y: -5000 }, 0)).toBe(0);
  });

  it('départ décalé si un meuble occupe le centre de la pièce', () => {
    const avec = ok(poserObjet(n, { catalogueId: 'lit-160', position: { x: 5300, y: 4300 } }, ctx));
    const d = departVisite(avec);
    expect(d).not.toEqual({ x: 5300, y: 4300 });
    expect(obstaclesVisite(avec).every((o) => !pointDansPolygone(d, o))).toBe(true);
    // Libre : on peut faire un pas dans au moins une direction.
    const pas = [
      { x: 100, y: 0 },
      { x: -100, y: 0 },
      { x: 0, y: 100 },
      { x: 0, y: -100 },
    ];
    expect(pas.some((v) => deplacerVisiteur(d, v, obstaclesVisite(avec)) !== d)).toBe(true);
  });

  it('départ sans pièce : au milieu des murs, ou à l’origine', () => {
    expect(departVisite({ ...n, pieces: [] })).toEqual({ x: 5300, y: 4300 });
    expect(departVisite({ ...n, pieces: [], murs: [] })).toEqual({ x: 0, y: 0 });
  });
});
