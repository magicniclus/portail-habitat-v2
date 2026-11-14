import { describe, expect, it } from 'vitest';
import { analyserEntreprise, estNafBatiment } from './analyse';

const MAINTENANT = Date.UTC(2026, 8, 27);

describe('étape SIREN (COMPTES §3.1)', () => {
  it.each([
    ['43.22A', true],
    ['41.20A', true],
    ['42.21Z', true],
    ['71.20B', true],
    ['71.12B', false],
    ['47.52A', false],
    ['4322A', false],
    [undefined, false],
  ])('NAF %s → bâtiment %s', (code, attendu) => expect(estNafBatiment(code)).toBe(attendu));

  it('entreprise active du bâtiment, ancienne', () => {
    expect(
      analyserEntreprise(
        { codeNaf: '43.22A', dateCreation: '2012-05-01', fermee: false },
        'libre',
        MAINTENANT,
      ),
    ).toEqual({
      refusee: false,
      horsBatiment: false,
      recente: false,
      inscription: 'libre',
    });
  });
  it('fermée : refusée', () => {
    expect(
      analyserEntreprise({ codeNaf: '43.22A', fermee: true }, 'libre', MAINTENANT).refusee,
    ).toBe(true);
  });
  it('moins de 3 mois : récente', () => {
    expect(
      analyserEntreprise(
        { codeNaf: '43.22A', dateCreation: '2026-08-01', fermee: false },
        'libre',
        MAINTENANT,
      ).recente,
    ).toBe(true);
    expect(
      analyserEntreprise(
        { codeNaf: '43.22A', dateCreation: '2026-05-01', fermee: false },
        'libre',
        MAINTENANT,
      ).recente,
    ).toBe(false);
  });
  it('hors bâtiment et déjà inscrite', () => {
    const r = analyserEntreprise({ codeNaf: '56.10A', fermee: false }, 'revendiquee', MAINTENANT);
    expect(r).toMatchObject({ horsBatiment: true, inscription: 'revendiquee', recente: false });
  });
});
