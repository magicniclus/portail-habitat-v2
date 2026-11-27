import { describe, expect, it } from 'vitest';
import { signatureDevis } from './signature';

const J = 86_400_000;
const T = Date.UTC(2026, 9, 14, 10);
const devis = {
  statut: 'envoye',
  signatureElectronique: true,
  validiteLe: new Date(T + 30 * J),
};

describe('signature en ligne du devis par le client', () => {
  it('possible sur un devis envoyé, valable, avec la signature en ligne activée', () => {
    expect(signatureDevis(devis, T)).toEqual({ possible: true });
  });

  it('refusée avec une raison claire sinon', () => {
    expect(signatureDevis({ ...devis, signatureElectronique: false }, T)).toEqual({
      possible: false,
      raison: 'Ce devis se signe sur papier : renvoyez-le daté et signé avec « Bon pour accord ».',
    });
    expect(signatureDevis({ ...devis, statut: 'accepte' }, T).possible).toBe(false);
    expect(signatureDevis({ ...devis, statut: 'accepte' }, T)).toMatchObject({
      raison: 'Ce devis a déjà été accepté.',
    });
    expect(signatureDevis({ ...devis, statut: 'refuse' }, T)).toMatchObject({ possible: false });
    expect(signatureDevis(devis, T + 31 * J)).toMatchObject({
      possible: false,
      raison: 'Ce devis n’est plus valable : demandez-en un nouveau à l’artisan.',
    });
    expect(signatureDevis({ ...devis, statut: 'expire' }, T)).toMatchObject({ possible: false });
  });
});
