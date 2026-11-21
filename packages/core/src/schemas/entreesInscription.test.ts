import { describe, expect, it } from 'vitest';
import { entreeFinaliserInscription } from './entreesInscription';

const cle = 'cle-123456';

describe('entreeFinaliserInscription (étape 3)', () => {
  it('entreprise trouvée au répertoire : son SIREN suffit', () => {
    expect(
      entreeFinaliserInscription.safeParse({ cleIdempotence: cle, siren: '552100554' }).success,
    ).toBe(true);
    expect(
      entreeFinaliserInscription.safeParse({ cleIdempotence: cle, siren: '5521' }).success,
    ).toBe(false);
  });

  it('« Je ne trouve pas mon entreprise » : SIRET valide, nom et adresse du siège', () => {
    const manuelle = {
      siret: '552 100 554 00013',
      raisonSociale: 'Bertrand Rénovation',
      adresse: { ligne1: '14 rue des Faures', codePostal: '33800', ville: 'Bordeaux' },
    };
    const r = entreeFinaliserInscription.safeParse({ cleIdempotence: cle, manuelle });
    expect(r.success).toBe(true);
    if (r.success && 'manuelle' in r.data) expect(r.data.manuelle.siret).toBe('55210055400013');
    expect(
      entreeFinaliserInscription.safeParse({
        cleIdempotence: cle,
        manuelle: { ...manuelle, siret: '55210055400014' },
      }).success,
    ).toBe(false);
    expect(
      entreeFinaliserInscription.safeParse({
        cleIdempotence: cle,
        manuelle: { ...manuelle, raisonSociale: '' },
      }).success,
    ).toBe(false);
  });

  it('jamais les deux à la fois', () => {
    expect(
      entreeFinaliserInscription.safeParse({
        cleIdempotence: cle,
        siren: '552100554',
        manuelle: {
          siret: '55210055400013',
          raisonSociale: 'X',
          adresse: { ligne1: 'a', codePostal: '33000', ville: 'B' },
        },
      }).success,
    ).toBe(false);
  });
});
