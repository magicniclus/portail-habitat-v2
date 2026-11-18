import { describe, expect, it } from 'vitest';
import { partagePlan, planDessin, versionPlan } from '../schemas/dessinPlan';
import { piscine, scene, SCENE_VERSION } from '../schemas/dessinScene';
import { contexteTest, niveauMaquette } from './aidesTest';
import { migrerScene, nouvelleScene } from './migrations';

describe('scène', () => {
  it('une scène neuve est valide et relisible', () => {
    const s = nouvelleScene(contexteTest().nouvelId);
    expect(s.niveaux[0]).toMatchObject({ type: 'rdc', hauteurSousPlafond: 2_500 });
    expect(s.calques.cotes).toBe(true);
    expect(migrerScene(JSON.parse(JSON.stringify(s)))).toEqual({ ok: true, data: s });
  });

  it('refuse les identifiants en double et les ouvertures sans mur', () => {
    const n = niveauMaquette();
    const double = { version: SCENE_VERSION, niveaux: [{ ...n, murs: [...n.murs, n.murs[0]] }] };
    expect(scene.safeParse(double).success).toBe(false);
    const orpheline = {
      version: SCENE_VERSION,
      niveaux: [
        {
          ...n,
          ouvertures: [
            {
              id: 'o_seule',
              murId: 'm_absent',
              position: 0,
              largeur: 800,
              hauteur: 2000,
              allege: 0,
              type: 'porte',
            },
          ],
        },
      ],
    };
    expect(scene.safeParse(orpheline).error?.issues[0]?.message).toBe(
      'Ouverture rattachée à un mur absent',
    );
  });

  it('millimètres entiers uniquement', () => {
    const n = niveauMaquette();
    const flottant = { ...n, murs: [{ ...n.murs[0]!, epaisseur: 200.5 }] };
    expect(scene.safeParse({ version: SCENE_VERSION, niveaux: [flottant] }).success).toBe(false);
  });

  it('piscine : profondeur maximale ≥ minimale', () => {
    const p = {
      id: 'pi_test',
      forme: 'rectangle',
      position: { x: 0, y: 0 },
      longueur: 8000,
      largeur: 4000,
    };
    expect(piscine.safeParse({ ...p, profondeurMin: 1500, profondeurMax: 1200 }).success).toBe(
      false,
    );
    expect(piscine.safeParse({ ...p, profondeurMin: 1200, profondeurMax: 1500 }).success).toBe(
      true,
    );
  });
});

describe('migrerScene', () => {
  it('rejette ce qui n’est pas un plan', () => {
    for (const brut of [null, 'x', [], {}, { version: 0 }, { version: 1.5 }])
      expect(migrerScene(brut)).toMatchObject({ ok: false, code: 'ENTREE_INVALIDE' });
    expect(migrerScene({ version: SCENE_VERSION, niveaux: [] })).toMatchObject({ ok: false });
  });

  it('refuse un plan d’une version plus récente', () => {
    expect(migrerScene({ version: SCENE_VERSION + 1 })).toMatchObject({
      ok: false,
      code: 'PRECONDITION',
    });
  });
});

describe('métadonnées', () => {
  const maintenant = new Date('2026-11-18T10:00:00Z');
  it('plan, version et partage', () => {
    expect(
      planDessin.safeParse({
        schemaVersion: 1,
        titre: ' Maison ',
        versionCourante: 0,
        taille: 0,
        creeLe: maintenant,
        majLe: maintenant,
        supprimeLe: null,
      }).data?.titre,
    ).toBe('Maison');
    expect(
      planDessin.safeParse({
        schemaVersion: 1,
        titre: 'X',
        versionCourante: 0,
        taille: 6 * 1024 * 1024,
        creeLe: maintenant,
        majLe: maintenant,
        supprimeLe: null,
      }).success,
    ).toBe(false);
    expect(
      versionPlan.safeParse({
        numero: 1,
        storagePath: 'dessin/x.json.gz',
        auteurUid: 'u1',
        type: 'auto',
        taille: 10,
        creeLe: maintenant,
      }).success,
    ).toBe(true);
    expect(
      partagePlan.safeParse({
        proprietaire: { type: 'particulier', id: 'u1' },
        planId: 'p1',
        versionId: 'courante',
        expireLe: null,
        revoque: false,
      }).success,
    ).toBe(true);
  });
});
