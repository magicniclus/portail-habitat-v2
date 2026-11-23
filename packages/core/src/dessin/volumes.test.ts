import { describe, expect, it } from 'vitest';
import { CATALOGUE_OBJETS } from './catalogue';
import { contexteTest, niveauMaquette, ok } from './aidesTest';
import { formeObjet3D } from './formes3d';
import { emprise, poserEscalier } from './escaliers';
import { poserOuverture } from './ouvertures';
import { directionSoleil } from './soleil';
import { marchesEscalier } from './escaliers3d';
import { contoursRaccordes } from './raccords';
import { dallesDuNiveau, decouperConvexe, morceauxDeMur, solSousLesMurs } from './volumes';
const ctx = contexteTest();
const n = niveauMaquette(ctx);

describe('géométrie 3D (DES-33)', () => {
  it('mur plein : un pavé débordant d’une demi-épaisseur à chaque bout', () => {
    const m = n.murs[0]!;
    const [p] = morceauxDeMur(m, n);
    expect(p!.taille).toEqual({ l: 10_300 + 300, p: 300, h: 2_500 });
    expect(p!.centre.z).toBe(1_250);
  });

  it('niveau au-dessus : le mur traverse le plancher, la façade ne fait pas de ressaut', () => {
    const m = n.murs[0]!;
    const [p] = morceauxDeMur(m, n, undefined, 200);
    expect(p!.taille.h).toBe(2_700);
    expect(p!.centre.z).toBe(1_350);
  });

  it('fenêtre : pavés sur une grille autour de la baie ; aucun volume dans la baie', () => {
    const m = n.murs[0]!;
    const avec = ok(poserOuverture(n, { murId: m.id, type: 'fenetre', centre: 5000 }, ctx));
    const o = avec.ouvertures[0]!;
    const morceaux = morceauxDeMur(m, avec);
    // 3 colonnes × 3 rangées, moins la baie.
    expect(morceaux).toHaveLength(8);
    const surface = morceaux.reduce((s, x) => s + x.taille.l * x.taille.h, 0);
    expect(surface).toBe((10_300 + 300) * 2_500 - o.largeur * o.hauteur);
    const allege = morceaux.find((x) => x.centre.z < o.allege && x.taille.l === o.largeur)!;
    expect(allege.taille).toMatchObject({ l: o.largeur, h: o.allege });
    // Tous les morceaux du mur partagent le même milieu (maison de poupée : décision d'un bloc).
    expect(new Set(morceaux.map((p) => JSON.stringify(p.milieuMur))).size).toBe(1);
    // Aucune jonction en T : chaque sommet d'un pavé est sur la grille commune.
    const xs = new Set(
      morceaux.flatMap((p) => [p.centre.x - p.taille.l / 2, p.centre.x + p.taille.l / 2]),
    );
    expect(xs.size).toBe(4);
    // Côtés collés à un voisin : non dessinés ; tableaux de la baie : dessinés.
    expect(allege.visibles).toEqual({ debut: false, fin: false });
    const tableaux = morceaux.filter(
      (p) => p.centre.z > o.allege && p.centre.z < o.allege + o.hauteur,
    );
    expect(tableaux.map((p) => p.visibles)).toEqual([
      { debut: true, fin: true },
      { debut: true, fin: true },
    ]);
    // Porte : pas d'allège.
    const porte = ok(poserOuverture(n, { murId: m.id, type: 'porte', centre: 2000 }, ctx));
    expect(morceauxDeMur(m, porte)).toHaveLength(5);
    expect(morceauxDeMur({ ...m, type: 'separation' }, n)).toEqual([]);
  });

  it('deux baies triées ; poteau sans débord ; poutre sous le plafond ; mur rampant', () => {
    const m = n.murs[0]!;
    let avec = ok(poserOuverture(n, { murId: m.id, type: 'fenetre', centre: 7000 }, ctx));
    avec = ok(poserOuverture(avec, { murId: m.id, type: 'fenetre', centre: 2000 }, ctx));
    expect(morceauxDeMur(m, avec)).toHaveLength(13);
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

  it('escalier ouvert : marches minces au même niveau (sol de la visite)', () => {
    const avec = ok(
      poserEscalier(
        n,
        { type: 'quart_bas', position: { x: 1000, y: 1000 }, hauteurAMonter: 2_700 },
        ctx,
      ),
    );
    const plein = avec.escaliers[0]!;
    const ouvert = { ...plein, structure: 'ouverte' as const, materiau: 'metal' as const };
    const [pleines, minces] = [marchesEscalier(plein, 0), marchesEscalier(ouvert, 0)];
    minces.forEach((m, i) => {
      expect(m.taille.h).toBe(30);
      // Même dessus de marche qu'en plein.
      expect(m.centre.z + m.taille.h / 2).toBeCloseTo(
        pleines[i]!.centre.z + pleines[i]!.taille.h / 2,
      );
    });
    // Béton : marches plus épaisses.
    expect(marchesEscalier({ ...ouvert, materiau: 'beton' }, 0)[3]!.taille.h).toBe(80);
  });

  it('emprise exacte : angles en onglet aux extrémités, coupes droites autour des baies', () => {
    const contours = contoursRaccordes(n.murs);
    const m = n.murs[0]!;
    const avec = ok(poserOuverture(n, { murId: m.id, type: 'fenetre', centre: 3000 }, ctx));
    const morceaux = morceauxDeMur(m, avec, contours.get(m.id));
    const c = contours.get(m.id)!;
    expect(morceaux[0]!.empreinte[0]).toEqual(c[0]);
    expect(morceaux[0]!.empreinte[3]).toEqual(c[3]);
    expect(morceaux.at(-1)!.empreinte[1]).toEqual(c[1]);
    // Sans contour : rectangle débordant d'une demi-épaisseur (comportement d'origine).
    const brut = morceauxDeMur(m, n);
    expect(brut).toHaveLength(1);
    expect(brut[0]!.empreinte).toHaveLength(4);
  });

  it('chaque meuble du catalogue a un volume dans ses dimensions', () => {
    for (const o of CATALOGUE_OBJETS) {
      const formes = formeObjet3D(o.symbole, o.dimensions, o.style);
      expect(formes.length).toBeGreaterThan(0);
      for (const f of formes) {
        expect(Math.abs(f.centre.x) + f.taille.l / 2).toBeLessThanOrEqual(o.dimensions.l / 2 + 1);
        expect(f.taille.h).toBeGreaterThan(0);
      }
    }
  });

  it('sol prolongé sous les murs jusqu’à leur axe : pas de trou sous une porte', () => {
    const n = niveauMaquette(contexteTest());
    const p = n.pieces[0]!;
    const sol = solSousLesMurs(n, p.contour);
    const xs = sol.map((q) => q.x);
    const ys = sol.map((q) => q.y);
    // Maison 10,60 × 8,60 m, murs de 30 cm : axe des murs à 15 cm du nu extérieur.
    expect(Math.min(...xs)).toBe(150);
    expect(Math.max(...xs)).toBe(10_450);
    expect(Math.min(...ys)).toBe(150);
    expect(Math.max(...ys)).toBe(8_450);
    expect(dallesDuNiveau(n).sols[0]!.contour).toEqual(sol);
  });

  it('trémie : plafond percé au-dessus de l’escalier, sol de l’étage percé aussi', () => {
    const ctx = contexteTest();
    const n = ok(
      poserEscalier(
        niveauMaquette(ctx),
        { type: 'droit', position: { x: 2_000, y: 2_000 }, hauteurAMonter: 2_700 },
        ctx,
      ),
    );
    const d = dallesDuNiveau(n);
    const trous = d.plafonds.flatMap((p) => p.trous ?? []);
    expect(trous).toHaveLength(1);
    // Le trou reste dans la pièce (découpé), aire non nulle.
    for (const q of trous[0]!) expect(q.x >= 150 && q.y >= 150).toBe(true);
    const etage = dallesDuNiveau(niveauMaquette(ctx), [emprise(n.escaliers[0]!)]);
    expect(etage.sols.flatMap((s) => s.trous ?? [])).toHaveLength(1);
    // Une trémie à cheval sur le mur extérieur est coupée au contour.
    const dehors = decouperConvexe(n.pieces[0]!.contour, [
      { x: -1_000, y: 1_000 },
      { x: 1_000, y: 1_000 },
      { x: 1_000, y: 2_000 },
      { x: -1_000, y: 2_000 },
    ]);
    expect(Math.min(...dehors.map((q) => q.x))).toBeGreaterThanOrEqual(150);
    // Escalier quart tournant (trémie en L) : le trou garde sa forme en L.
    const quart = ok(
      poserEscalier(
        niveauMaquette(ctx),
        { type: 'quart_bas', position: { x: 3_000, y: 3_000 }, hauteurAMonter: 2_700 },
        ctx,
      ),
    );
    const enL = dallesDuNiveau(quart).plafonds.flatMap((p) => p.trous ?? []);
    expect(enL).toHaveLength(1);
    expect(enL[0]!.length).toBe(emprise(quart.escaliers[0]!).length);
    // Escalier en L contre l'angle de la maison (il déborde sur les murs) : le plafond reste
    // percé, découpé à la pièce, au lieu de ne plus l'être du tout.
    const angle = ok(
      poserEscalier(
        niveauMaquette(ctx),
        { type: 'quart_bas', position: { x: 100, y: 100 }, hauteurAMonter: 2_700 },
        ctx,
      ),
    );
    const coupe = dallesDuNiveau(angle).plafonds.flatMap((p) => p.trous ?? []);
    expect(coupe).toHaveLength(1);
    expect(Math.min(...coupe[0]!.map((q) => q.x))).toBeGreaterThanOrEqual(300);
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
