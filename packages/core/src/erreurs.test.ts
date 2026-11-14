import { describe, expect, it } from 'vitest';
import { CODES_ERREUR, ErreurMetier, estErreurMetier, messageErreur } from './erreurs';

describe('erreurs', () => {
  it('chaque code a un message français, un statut HTTP et un code callable', () => {
    for (const def of Object.values(CODES_ERREUR)) {
      expect(def.message.length).toBeGreaterThan(10);
      expect(def.http).toBeGreaterThanOrEqual(400);
      expect(def.callable).toMatch(/^[a-z-]+$/);
    }
  });
  it('ErreurMetier porte son code et le message par défaut', () => {
    const e = new ErreurMetier('INTROUVABLE');
    expect(e.code).toBe('INTROUVABLE');
    expect(e.message).toBe(messageErreur('INTROUVABLE'));
    expect(e).toBeInstanceOf(Error);
    expect(estErreurMetier(e)).toBe(true);
    expect(estErreurMetier(new Error('x'))).toBe(false);
  });
  it('accepte un message précis', () => {
    expect(new ErreurMetier('CONFLIT', 'Déjà débloqué.').message).toBe('Déjà débloqué.');
  });
});
