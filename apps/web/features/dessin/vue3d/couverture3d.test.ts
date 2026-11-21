import { describe, expect, it } from 'vitest';
import { geometrieCouverture } from './couverture3d';

describe('couverture en volume', () => {
  it('pas de chant sur une arête partagée par deux pans (faîtage) : pas de pointillé', () => {
    // Deux pans d'un toit à deux pentes, qui se rejoignent au faîtage (y = 2 000, z = 1 000).
    const nord = [
      { x: 0, y: 0, z: 0 },
      { x: 4_000, y: 0, z: 0 },
      { x: 4_000, y: 2_000, z: 1_000 },
      { x: 0, y: 2_000, z: 1_000 },
    ];
    const sud = [
      { x: 0, y: 4_000, z: 0 },
      { x: 4_000, y: 4_000, z: 0 },
      { x: 4_000, y: 2_000, z: 1_000 },
      { x: 0, y: 2_000, z: 1_000 },
    ];
    const seul = geometrieCouverture([nord], 0, 50).rives.getAttribute('position').count;
    const deux = geometrieCouverture([nord, sud], 0, 50).rives.getAttribute('position').count;
    // Seul : sous-face (2 triangles) + 4 chants (8 triangles). À deux : le faîtage sans chant.
    expect(seul).toBe(30);
    expect(deux).toBe(2 * 30 - 2 * 6);
  });
});
