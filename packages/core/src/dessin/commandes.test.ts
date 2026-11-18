import { describe, expect, it } from 'vitest';
import type { Ouverture } from '../schemas/dessinScene';
import { contexteTest, niveauMaquette, ok } from './aidesTest';
import {
  ajouterMur,
  appliquerRevetement,
  deplacerExtremite,
  deplacerMur,
  fusionnerMurs,
  modifierLongueurMur,
  renommerPiece,
  scinderMur,
  supprimerMur,
} from './commandes';
import { aire } from './geometrie';
import { contourMur, jonction, longueurMur, surfaceFaceNette } from './murs';

const porte = (murId: string, position: number, largeur = 830): Ouverture => ({
  id: `o_${murId.slice(2)}x${position}`,
  murId,
  position,
  largeur,
  hauteur: 2040,
  allege: 0,
  type: 'porte',
  sens: 'gauche',
  cote: 'interieur',
  volet: null,
});

describe('murs', () => {
  const n = niveauMaquette();
  const [haut, droite] = n.murs;

  it('la forme crée 4 murs jointifs en L, une pièce de 80 m²', () => {
    expect(n.murs).toHaveLength(4);
    expect(jonction(haut!, droite!)).toBe('L');
    expect(n.pieces).toHaveLength(1);
    expect(n.pieces[0]!.nom).toBe('Pièce 1');
  });

  it('contour et surface nette d’un mur', () => {
    expect(contourMur(haut!)).toHaveLength(4);
    expect(contourMur({ ...haut!, alignement: 'gauche' })[3]).toEqual(haut!.a);
    expect(contourMur({ ...haut!, alignement: 'droite' })[0]).toEqual(haut!.a);
    expect(surfaceFaceNette(haut!, [])).toBe(10_300 * 2_500);
    expect(surfaceFaceNette({ ...haut!, hauteurB: 1_500 }, [porte(haut!.id, 1000)])).toBe(
      10_300 * 2_000 - 830 * 2_000,
    );
  });

  it('jonctions T, X et aucune', () => {
    const ctx = contexteTest();
    const avecT = ok(
      ajouterMur(n, { a: { x: 150, y: 4000 }, b: { x: 5000, y: 4000 }, type: 'cloison' }, ctx),
    );
    const t = avecT.murs.at(-1)!;
    expect(jonction(t, n.murs[3]!)).toBe('T');
    const avecX = ok(
      ajouterMur(avecT, { a: { x: 3000, y: 1000 }, b: { x: 3000, y: 6000 }, type: 'cloison' }, ctx),
    );
    expect(jonction(t, avecX.murs.at(-1)!)).toBe('X');
    expect(jonction(t, haut!)).toBeNull();
  });
});

describe('commandes', () => {
  it('ajouter une cloison coupe la pièce en deux, valeurs par défaut du type', () => {
    const ctx = contexteTest();
    const r = ok(
      ajouterMur(
        niveauMaquette(ctx),
        { a: { x: 150, y: 4300 }, b: { x: 10450, y: 4300 }, type: 'cloison' },
        ctx,
      ),
    );
    expect(r.murs.at(-1)).toMatchObject({ epaisseur: 72, hauteur: 2500 });
    expect(r.pieces).toHaveLength(2);
    const muret = ok(
      ajouterMur(r, { a: { x: 1000, y: 1000 }, b: { x: 2000, y: 1000 }, type: 'muret' }, ctx),
    );
    expect(muret.murs.at(-1)!.hauteur).toBe(600);
  });

  it('refuse un mur de longueur nulle', () => {
    const ctx = contexteTest();
    const r = ajouterMur(
      niveauMaquette(ctx),
      { a: { x: 0, y: 0 }, b: { x: 0, y: 0 }, type: 'mur' },
      ctx,
    );
    expect(r).toMatchObject({ ok: false, code: 'ENTREE_INVALIDE' });
  });

  it('modifier une cote déplace le mur et les murs joints suivent', () => {
    const ctx = contexteTest();
    const n = niveauMaquette(ctx);
    const haut = n.murs[0]!;
    const r = ok(modifierLongueurMur(n, haut.id, 8_300, ctx));
    expect(longueurMur(r.murs[0]!)).toBe(8_300);
    expect(r.murs[1]!.a).toEqual(r.murs[0]!.b);
    expect(r.pieces[0]!.contour).toHaveLength(4);
    // 8,00 × 8,00 m intérieurs.
    expect(r.pieces).toHaveLength(1);
    const depuisB = ok(modifierLongueurMur(n, haut.id, 8_300, ctx, 'b'));
    expect(depuisB.murs[0]!.a.x).toBe(2_150);
    expect(modifierLongueurMur(n, haut.id, 0, ctx)).toMatchObject({ ok: false });
    expect(modifierLongueurMur(n, 'm_absent', 1000, ctx)).toMatchObject({ code: 'INTROUVABLE' });
  });

  it('tirer sur une cote garde la pièce d’équerre (le mur voisin suit parallèlement)', () => {
    const ctx = contexteTest();
    const n = niveauMaquette(ctx);
    const r = ok(modifierLongueurMur(n, n.murs[0]!.id, 8_300, ctx));
    expect(r.murs[1]!.a.x).toBe(8_450);
    expect(r.murs[1]!.b.x).toBe(8_450);
    expect(aire(r.pieces[0]!.contour)).toBe(8_000 * 8_000);
    // Mur prolongé par un mur aligné (après une coupe) : seule l'extrémité bouge.
    const coupe = ok(scinderMur(n, n.murs[0]!.id, 5_000, ctx));
    const r2 = ok(modifierLongueurMur(coupe, n.murs[0]!.id, 4_000, ctx));
    expect(r2.murs[0]!.b).toEqual({ x: 4_150, y: 150 });
    expect(r2.murs[1]!.a).toEqual({ x: 4_150, y: 150 });
  });

  it('déplacer un mur parallèlement', () => {
    const ctx = contexteTest();
    const n = niveauMaquette(ctx);
    const r = ok(deplacerMur(n, n.murs[1]!.id, { x: -1000, y: 0 }, ctx));
    expect(r.murs[1]!.a.x).toBe(9_450);
    expect(r.murs[0]!.b.x).toBe(9_450);
    expect(deplacerMur(n, 'm_absent', { x: 1, y: 0 }, ctx)).toMatchObject({ ok: false });
  });

  it('déplacer une extrémité, refus si verrouillé, nul ou ouverture hors du mur', () => {
    const ctx = contexteTest();
    const n = niveauMaquette(ctx);
    const haut = n.murs[0]!;
    expect(ok(deplacerExtremite(n, haut.id, 'b', { x: 11_000, y: 150 }, ctx)).murs[1]!.a.x).toBe(
      11_000,
    );
    const verrou = { ...n, murs: n.murs.map((m, i) => (i === 1 ? { ...m, verrouille: true } : m)) };
    expect(deplacerExtremite(verrou, haut.id, 'b', { x: 11_000, y: 150 }, ctx)).toMatchObject({
      ok: false,
    });
    expect(deplacerExtremite(n, haut.id, 'b', haut.a, ctx)).toMatchObject({ ok: false });
    const avecPorte = { ...n, ouvertures: [porte(haut.id, 9_000)] };
    expect(modifierLongueurMur(avecPorte, haut.id, 5_000, ctx)).toMatchObject({
      ok: false,
      code: 'PRECONDITION',
    });
    expect(deplacerExtremite(n, 'm_absent', 'a', haut.a, ctx)).toMatchObject({ ok: false });
  });

  it('scinder puis fusionner, les ouvertures suivent', () => {
    const ctx = contexteTest();
    const n = niveauMaquette(ctx);
    const haut = n.murs[0]!;
    const avec = { ...n, ouvertures: [porte(haut.id, 1_000), porte(haut.id, 7_000)] };
    const coupe = ok(scinderMur(avec, haut.id, 5_000, ctx));
    expect(coupe.murs).toHaveLength(5);
    const second = coupe.murs[1]!;
    expect(coupe.ouvertures[1]).toMatchObject({ murId: second.id, position: 2_000 });
    expect(coupe.pieces).toHaveLength(1);
    const refait = ok(fusionnerMurs(coupe, haut.id, second.id, ctx));
    expect(refait.murs).toHaveLength(4);
    expect(refait.ouvertures[1]).toMatchObject({ murId: haut.id, position: 7_000 });

    const inverse = {
      ...coupe,
      murs: coupe.murs.map((m) => (m.id === second.id ? { ...m, a: m.b, b: m.a } : m)),
    };
    const refaitInverse = ok(fusionnerMurs(inverse, haut.id, second.id, ctx));
    expect(refaitInverse.murs[0]!.b.x).toBe(10_450);
    expect(refaitInverse.ouvertures[1]!.position).toBe(5_000 + (5_300 - 2_000 - 830));

    expect(scinderMur(avec, haut.id, 1_200, ctx)).toMatchObject({
      ok: false,
      code: 'PRECONDITION',
    });
    expect(scinderMur(avec, haut.id, 0, ctx)).toMatchObject({ ok: false });
    expect(scinderMur(avec, 'm_absent', 10, ctx)).toMatchObject({ ok: false });
  });

  it('fusion refusée : murs différents, non jointifs, non alignés, absents', () => {
    const ctx = contexteTest();
    const n = niveauMaquette(ctx);
    const [haut, droite, bas] = n.murs;
    expect(fusionnerMurs(n, haut!.id, droite!.id, ctx)).toMatchObject({ ok: false });
    expect(fusionnerMurs(n, haut!.id, bas!.id, ctx)).toMatchObject({ ok: false });
    const autre = {
      ...n,
      murs: n.murs.map((m, i) => (i === 1 ? { ...m, type: 'cloison' as const } : m)),
    };
    expect(fusionnerMurs(autre, haut!.id, droite!.id, ctx)).toMatchObject({ ok: false });
    expect(fusionnerMurs(n, haut!.id, 'm_absent', ctx)).toMatchObject({ code: 'INTROUVABLE' });
  });

  it('supprimer un mur retire ses ouvertures et la pièce', () => {
    const ctx = contexteTest();
    const n = niveauMaquette(ctx);
    const r = ok(
      supprimerMur({ ...n, ouvertures: [porte(n.murs[0]!.id, 100)] }, n.murs[0]!.id, ctx),
    );
    expect(r.ouvertures).toHaveLength(0);
    expect(r.pieces).toHaveLength(0);
    const verrou = { ...n, murs: n.murs.map((m) => ({ ...m, verrouille: true })) };
    expect(supprimerMur(verrou, n.murs[0]!.id, ctx)).toMatchObject({ ok: false });
    expect(supprimerMur(n, 'm_absent', ctx)).toMatchObject({ ok: false });
  });

  it('renommer une pièce et poser des revêtements', () => {
    const n = niveauMaquette();
    const p = n.pieces[0]!;
    expect(ok(renommerPiece(n, p.id, '  Séjour ')).pieces[0]!.nom).toBe('Séjour');
    expect(renommerPiece(n, p.id, ' ')).toMatchObject({ ok: false });
    expect(renommerPiece(n, 'p_absent', 'X')).toMatchObject({ code: 'INTROUVABLE' });
    const sol = ok(
      appliquerRevetement(
        n,
        { genre: 'piece', pieceId: p.id, surface: 'sol' },
        { famille: 'parquet' },
      ),
    );
    expect(sol.pieces[0]!.sol.famille).toBe('parquet');
    const mur = ok(
      appliquerRevetement(
        n,
        { genre: 'mur', murId: n.murs[0]!.id, face: 'b' },
        { famille: 'peinture', couleur: '#b7c4b1' },
      ),
    );
    expect(mur.murs[0]!.faceB.couleur).toBe('#b7c4b1');
    const faceA = ok(
      appliquerRevetement(
        n,
        { genre: 'mur', murId: n.murs[0]!.id, face: 'a' },
        { famille: 'faience' },
      ),
    );
    expect(faceA.murs[0]!.faceA.famille).toBe('faience');
    expect(
      appliquerRevetement(n, { genre: 'mur', murId: 'm_absent', face: 'a' }, { famille: 'aucun' }),
    ).toMatchObject({ ok: false });
    expect(
      appliquerRevetement(
        n,
        { genre: 'piece', pieceId: 'p_absent', surface: 'sol' },
        { famille: 'aucun' },
      ),
    ).toMatchObject({ ok: false });
  });
});
