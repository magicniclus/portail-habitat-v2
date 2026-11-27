import { describe, expect, it } from 'vitest';
import { slugifier } from './slug';

describe('slugifier', () => {
  it.each([
    [['Bertrand Rénovation', 'Bordeaux'], 'bertrand-renovation-bordeaux'],
    [['Bâti Pierre & Chaux'], 'bati-pierre-chaux'],
    [
      ['L’Atelier  d’Élise', null, 'Saint-Médard-en-Jalles'],
      'l-atelier-d-elise-saint-medard-en-jalles',
    ],
    [['  --  '], ''],
    [['a'.repeat(79) + ' b'], 'a'.repeat(79)],
  ])('%j → %s', (parties, attendu) => expect(slugifier(...parties)).toBe(attendu));
});
