import { describe, expect, it } from 'vitest';
import { plafondEffectif } from './debit';

// Limite de débit réglable : coupée en développement, multipliée par RATE_LIMIT_FACTEUR ailleurs.
describe('plafondEffectif', () => {
  it('pnpm dev : aucune limite', () => {
    expect(plafondEffectif(10, { NODE_ENV: 'development' })).toBeNull();
  });

  it('sans réglage : plafond prévu', () => {
    expect(plafondEffectif(10, { NODE_ENV: 'production' })).toBe(10);
  });

  it('RATE_LIMIT_FACTEUR multiplie le plafond ; valeur invalide ignorée', () => {
    expect(plafondEffectif(10, { NODE_ENV: 'production', RATE_LIMIT_FACTEUR: '10' })).toBe(100);
    expect(plafondEffectif(10, { NODE_ENV: 'production', RATE_LIMIT_FACTEUR: 'x' })).toBe(10);
    expect(plafondEffectif(10, { NODE_ENV: 'production', RATE_LIMIT_FACTEUR: '0.5' })).toBe(10);
  });
});
