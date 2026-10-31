import { describe, expect, it } from 'vitest';
import { decisionInactivite } from './inactivite';

const J = 86_400_000;
const T = Date.UTC(2026, 9, 9);
const ans3 = 1095 * J;

describe('compte particulier inactif (DATABASE §14 : 3 ans, avertissement à J-30)', () => {
  it('actif récemment : rien', () => {
    expect(decisionInactivite(T - 100 * J, T)).toBeNull();
  });
  it('à J-30 de la purge : avertir, une seule fois', () => {
    expect(decisionInactivite(T - ans3 + 30 * J, T)).toBe('avertir');
    expect(decisionInactivite(T - ans3 + 20 * J, T, T - 10 * J)).toBeNull();
  });
  it('30 jours après l’avertissement, toujours inactif : supprimer', () => {
    expect(decisionInactivite(T - ans3 - J, T, T - 30 * J)).toBe('supprimer');
    expect(decisionInactivite(T - ans3 - J, T, T - 29 * J)).toBeNull();
  });
  it('jamais averti : on avertit d’abord, même au-delà de 3 ans', () => {
    expect(decisionInactivite(T - ans3 - 100 * J, T)).toBe('avertir');
  });
  it('revenu après l’avertissement : l’avertissement ne compte plus', () => {
    expect(decisionInactivite(T - 5 * J, T, T - 40 * J)).toBeNull();
  });
});
