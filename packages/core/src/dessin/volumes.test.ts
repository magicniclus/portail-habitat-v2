import { describe, expect, it } from 'vitest';
import { CATALOGUE_OBJETS } from './catalogue';
import { contexteTest, niveauMaquette, ok } from './aidesTest';
import { formeObjet3D } from './formes3d';
import { poserEscalier } from './escaliers';
import { poserOuverture } from './ouvertures';
import { directionSoleil } from './soleil';
import { limonsEscalier, marchesEscalier } from './escaliers3d';
import { dallesDuNiveau, morceauxDeMur } from './volumes';
const ctx = contexteTest();
const n = niveauMaquette(ctx);

describe('géométrie 3D (DES-33)', () => {
  it('mur plein : un pavé débordant d’une demi-épaisseur à chaque bout', () => {
    const m = n.murs[0]!;
    const [p] = morceauxDeMur(m, n);
    expect(p!.taille).toEqual({ l: 10_300 + 300, p: 300, h: 2_500 });
    expect(p!.centre.z).toBe(1_250);
  });

  it('fenêtre : trumeaux, allège et linteau ; aucun volume dans la baie', () => {
    const m = n.murs[0]!;
    const avec = ok(poserOuverture(n, { murId: m.id, type: 'fenetre', centre: 5000 }, ctx));
    const o = avec.ouvertures[0]!;
    const morceaux = morceauxDeMur(m, avec);
    expect(morceaux).toHaveLength(4);
    const surface = morceaux.reduce((s, x) => s + x.taille.l * x.taille.h, 0);
    expect(surface).toBe((10_300 + 300) * 2_500 - o.largeur * o.hauteur);
    const allege = morceaux.find((x) => x.centre.z < o.allege)!;
    expect(allege.taille).toMatchObject({ l: o.largeur, h: o.allege });
    // Porte : pas d'allège.
    const porte = ok(poserOuverture(n, { murId: m.id, type: 'porte', centre: 2000 }, ctx));
    expect(morceauxDeMur(m, porte)).toHaveLength(3);
    expect(morceauxDeMur({ ...m, type: 'separation' }, n)).toEqual([]);
  });

  it('deux baies triées ; poteau sans débord ; poutre sous le plafond ; mur rampant', () => {
    const m = n.murs[0]!;
    let avec = ok(poserOuverture(n, { murId: m.id, type: 'fenetre', centre: 7000 }, ctx));
    avec = ok(poserOuverture(avec, { murId: m.id, type: 'fenetre', centre: 2000 }, ctx));
    expect(morceauxDeMur(m, avec)).toHaveLength(7);
    const [poteau] = morceauxDeMur({ ...m, type: 'poteau' }, n);
    expect(poteau!.taille.l).toBe(10_300);
    const [poutre] = morceauxDeMur({ ...m, type: 'poutre', hauteur: 300 }, n);
    expect(poutre!.centre.z).toBe(n.hauteurSousPlafond - 300 + 150);
    expect(morceauxDeMur({ ...m, hauteurB: 3_000 }, n)[0]!.taille.h).toBe(3_000);
  });

  it('sols et plafonds de chaque pièce', () => {
    const { sols, plafonds } = dallesDuNiveau(n);
    expect(sols).toHaveLength(1);
    expect(plafonds[0]!.z).toBe(n.hauteurSousPlafond);
  });

  it('marches : autant que l’escalier, montantes, dans l’emprise', () => {
    for (const type of ['droit', 'quart_bas', 'deux_quarts', 'helicoidal'] as const) {
      const avec = ok(
        poserEscalier(n, { type, position: { x: 1000, y: 1000 }, hauteurAMonter: 2_700 }, ctx),
      );
      const e = avec.escaliers[0]!;
      const marches = marchesEscalier(e, 0);
      expect(marches).toHaveLength(e.nbMarches);
      expect(marches.at(-1)!.taille.h).toBeCloseTo(2_700, 0);
      expect(marches[1]!.taille.h).toBeGreaterThan(marches[0]!.taille.h);
      for (const m of marches) expect(m.centre.x).toBeGreaterThan(900);
    }
  });

  it('escalier ouvert : marches minces au même niveau, limon du sol à la dernière marche', () => {
    const avec = ok(
      poserEscalier(
        n,
        { type: 'quart_bas', position: { x: 1000, y: 1000 }, hauteurAMonter: 2_700 },
        ctx,
      ),
    );
    const plein = avec.escaliers[0]!;
    expect(limonsEscalier(plein, 0)).toEqual([]);
    const ouvert = { ...plein, structure: 'ouverte' as const, materiau: 'metal' as const };
    const [pleines, minces] = [marchesEscalier(plein, 0), marchesEscalier(ouvert, 0)];
    minces.forEach((m, i) => {
      expect(m.taille.h).toBe(30);
      // Même dessus de marche qu'en plein.
      expect(m.centre.z + m.taille.h / 2).toBeCloseTo(
        pleines[i]!.centre.z + pleines[i]!.taille.h / 2,
      );
    });
    const limons = limonsEscalier(ouvert, 0);
    expect(limons).toHaveLength(plein.nbMarches);
    expect(limons[0]!.pente).toBeGreaterThan(0);
    expect(limons.every((l) => l.taille.l > 0 && l.taille.h === 160)).toBe(true);
    // Le haut du dernier tronçon arrive sous la dernière marche.
    const dernier = limons.at(-1)!;
    expect(dernier.centre.z + dernier.taille.h / 2).toBeLessThan(2_700);
    // Béton : marches plus épaisses.
    expect(marchesEscalier({ ...ouvert, materiau: 'beton' }, 0)[3]!.taille.h).toBe(80);
  });

  it('chaque meuble du catalogue a un volume dans ses dimensions', () => {
    for (const o of CATALOGUE_OBJETS) {
      const formes = formeObjet3D(o.symbole, o.dimensions);
      expect(formes.length).toBeGreaterThan(0);
      for (const f of formes) {
        expect(Math.abs(f.centre.x) + f.taille.l / 2).toBeLessThanOrEqual(o.dimensions.l / 2 + 1);
        expect(f.taille.h).toBeGreaterThan(0);
      }
    }
  });

  it('soleil : à l’est le matin, au sud et haut à midi, tourne avec le nord', () => {
    const matin = directionSoleil(7, 0);
    expect(matin.x).toBeGreaterThan(0.5);
    const midi = directionSoleil(12, 0);
    // Sud = bas du plan (y positif).
    expect(midi.y).toBeGreaterThan(0.4);
    expect(midi.z).toBeGreaterThan(0.8);
    // Nord vers la droite du plan : le sud est à gauche.
    expect(directionSoleil(12, 900).x).toBeLessThan(-0.4);
    expect(directionSoleil(3, 0).z).toBeCloseTo(Math.sin((5 * Math.PI) / 180), 5);
  });
});
