import { describe, expect, it } from 'vitest';
import { entreeContactFiche, filtresAnnuaireUrl } from './entreesAnnuaire';

describe('entreeContactFiche', () => {
  const ok = {
    artisanId: 'a1',
    prenom: 'Claire',
    nom: 'Martin',
    email: 'Claire@Exemple.fr',
    telephone: '06 12 34 56 78',
    codePostal: '33360',
    miseEnRelation: true,
    cleIdempotence: 'cle-12345678',
  };

  it('coordonnées valides : email en minuscules, description facultative', () => {
    const r = entreeContactFiche.parse(ok);
    expect(r).toMatchObject({ email: 'claire@exemple.fr', description: '' });
  });

  it('refuse sans accord de mise en relation, code postal ou téléphone invalides', () => {
    expect(entreeContactFiche.safeParse({ ...ok, miseEnRelation: false }).success).toBe(false);
    expect(entreeContactFiche.safeParse({ ...ok, codePostal: '3336' }).success).toBe(false);
    expect(entreeContactFiche.safeParse({ ...ok, telephone: '12' }).success).toBe(false);
  });
});

describe('filtresAnnuaireUrl : position de la commune choisie', () => {
  it('lat et lon lus en nombres ; absents ou invalides : ignorés', () => {
    expect(
      filtresAnnuaireUrl.parse({ ville: 'Carignan-de-Bordeaux', lat: '44.81', lon: '-0.48' }),
    ).toMatchObject({
      lat: 44.81,
      lon: -0.48,
    });
    const r = filtresAnnuaireUrl.parse({ ville: 'Bordeaux', lat: 'abc', lon: '999' });
    expect(r.lat).toBeUndefined();
    expect(r.lon).toBeUndefined();
  });
});
