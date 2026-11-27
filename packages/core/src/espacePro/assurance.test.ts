import { describe, expect, it } from 'vitest';
import { echeanceDecennale, messageEcheance } from './assurance';

const J = 86_400_000;
const T = Date.UTC(2026, 9, 9, 6);

describe('fin de l’attestation décennale (EMAILS assurance-expire)', () => {
  it('rappels à J-30, J-7 et J0, chacun une seule fois', () => {
    expect(echeanceDecennale(T + 40 * J, T, {})).toBeNull();
    expect(echeanceDecennale(T + 30 * J, T, {})).toEqual({ palier: 'j30', suspendre: false });
    expect(echeanceDecennale(T + 20 * J, T, { j30: true })).toBeNull();
    expect(echeanceDecennale(T + 7 * J, T, { j30: true })).toEqual({
      palier: 'j7',
      suspendre: false,
    });
    expect(echeanceDecennale(T + 3 * J, T, { j30: true, j7: true })).toBeNull();
  });
  it('à l’échéance (ou après) : dernier rappel et fiche retirée', () => {
    expect(echeanceDecennale(T, T, { j30: true, j7: true })).toEqual({
      palier: 'j0',
      suspendre: true,
    });
    expect(echeanceDecennale(T - 2 * J, T, {})).toEqual({ palier: 'j0', suspendre: true });
    expect(echeanceDecennale(T - 2 * J, T, { j0: true })).toBeNull();
  });
  it('un rappel manqué ne part pas en retard : on passe au palier courant', () => {
    expect(echeanceDecennale(T + 5 * J, T, {})).toEqual({ palier: 'j7', suspendre: false });
  });
  it('message clair selon le palier', () => {
    expect(messageEcheance('j30', '8 novembre 2026')).toContain('8 novembre 2026');
    expect(messageEcheance('j0', '9 octobre 2026')).toContain('n’est plus visible');
  });
});
