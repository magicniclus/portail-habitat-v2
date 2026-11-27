import { describe, expect, it } from 'vitest';
import { encoderGeohash } from './geohash';

describe('geohash', () => {
  it.each([
    [57.64911, 10.40744, 11, 'u4pruydqqvj'],
    [37.7749, -122.4194, 5, '9q8yy'],
    [48.8566, 2.3522, 6, 'u09tvw'],
    [-33.8688, 151.2093, 5, 'r3gx2'],
  ])('%f, %f → %s', (lat, lng, p, h) => expect(encoderGeohash(lat, lng, p)).toBe(h));
  it('précision 10 par défaut', () => expect(encoderGeohash(0, 0)).toHaveLength(10));
  it('hors limites', () => expect(() => encoderGeohash(91, 0)).toThrow(RangeError));
});
