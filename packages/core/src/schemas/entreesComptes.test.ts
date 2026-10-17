import { describe, expect, it } from 'vitest';
import {
  entreeFinaliserOnboarding,
  entreeRepondreDemandeAcces,
  entreeAccepterInvitation,
} from './entreesComptes';

const base = {
  cleIdempotence: 'cle-12345',
  entreprise: {
    siren: '552100554',
    siret: '55210055400013',
    raisonSociale: 'X',
    nomCommercial: 'X',
    adresseSiege: { ligne1: '1 rue A', codePostal: '33000', ville: 'Bordeaux' },
  },
  metierPrincipal: 'plombier',
  metiers: ['plombier'],
  intentions: [],
  zone: { centre: { latitude: 44.8, longitude: -0.5 }, rayonKm: 30 },
  cgvVersion: '2026-09',
};

describe('entrées des comptes', () => {
  it('onboarding valide ; date de création en chaîne ISO acceptée', () => {
    const r = entreeFinaliserOnboarding.parse({
      ...base,
      entreprise: { ...base.entreprise, dateCreationEntreprise: '2015-03-01' },
    });
    expect(r.entreprise.dateCreationEntreprise).toBeInstanceOf(Date);
  });
  it('métier principal absent des métiers : refusé', () => {
    const r = entreeFinaliserOnboarding.safeParse({ ...base, metiers: ['carreleur'] });
    expect(r.success).toBe(false);
  });
  it('SIRET d’une autre entreprise : refusé', () => {
    const r = entreeFinaliserOnboarding.safeParse({
      ...base,
      entreprise: { ...base.entreprise, siret: '73282932000074' },
    });
    expect(r.success).toBe(false);
  });
  it('rayon hors 10–100 km : refusé', () => {
    expect(
      entreeFinaliserOnboarding.safeParse({ ...base, zone: { ...base.zone, rayonKm: 150 } })
        .success,
    ).toBe(false);
  });
  it('accepter une demande d’accès exige un rôle', () => {
    const e = { artisanId: 'a1', demandeId: 'd1' };
    expect(entreeRepondreDemandeAcces.safeParse({ ...e, accepter: true }).success).toBe(false);
    expect(
      entreeRepondreDemandeAcces.safeParse({ ...e, accepter: true, role: 'gerant' }).success,
    ).toBe(true);
    expect(entreeRepondreDemandeAcces.safeParse({ ...e, accepter: false }).success).toBe(true);
  });
  it('jeton d’invitation : 43 caractères base64url', () => {
    expect(entreeAccepterInvitation.safeParse({ jeton: 'a'.repeat(43) }).success).toBe(true);
    expect(entreeAccepterInvitation.safeParse({ jeton: 'a'.repeat(42) + '/' }).success).toBe(false);
  });
});
