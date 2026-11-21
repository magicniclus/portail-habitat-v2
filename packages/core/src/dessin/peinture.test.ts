import { describe, expect, it } from 'vitest';
import { revetement as schema } from '../schemas/dessinScene';
import { LIBELLES_FINITION, peinture } from './revetements';

const BLANC = '#fafaf8';

describe('peinture libre et finition (DES-25)', () => {
  it('couleur saisie, finition gardée ; finition seule, couleur et matériau gardés', () => {
    const catalogue = { famille: 'peinture' as const, couleur: '#b7c4b1', materiauId: 'pe-sauge' };
    expect(peinture(catalogue, { finition: 'satin' }, BLANC)).toEqual({
      ...catalogue,
      finition: 'satin',
    });
    const libre = peinture({ ...catalogue, finition: 'brillant' }, { couleur: '#AA3355' }, BLANC);
    expect(libre).toEqual({ famille: 'peinture', couleur: '#aa3355', finition: 'brillant' });
    expect(schema.safeParse(libre).success).toBe(true);
  });

  it('autre revêtement ou rien : peinture blanche mate par défaut ; couleur illisible refusée', () => {
    expect(peinture({ famille: 'parquet', couleur: '#d9b98c' }, {}, BLANC)).toEqual({
      famille: 'peinture',
      couleur: BLANC,
      finition: 'mat',
    });
    expect(peinture(null, { couleur: 'rouge' }, BLANC)).toBeNull();
    expect(Object.keys(LIBELLES_FINITION)).toEqual(['mat', 'satin', 'brillant']);
  });
});
