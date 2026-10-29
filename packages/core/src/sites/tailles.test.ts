import { describe, expect, it } from 'vitest';
import { bornerTaille, convertirTaille } from './tailles';

describe('tailles de texte avec unité', () => {
  it('conversion au même rendu : px ↔ em/rem, vw, %', () => {
    expect(convertirTaille(24, 'px', 'em')).toBe(1.5);
    expect(convertirTaille(1.5, 'rem', 'px')).toBe(24);
    expect(convertirTaille(64, 'px', 'vw')).toBe(5);
    expect(convertirTaille(16, 'px', '%')).toBe(100);
  });

  it('bornes : la saisie reste dans la plage de l’unité', () => {
    expect(bornerTaille(500, 'px')).toBe(200);
    expect(bornerTaille(0.1, 'em')).toBe(0.5);
    expect(bornerTaille(Number.NaN, 'vw')).toBe(0.5);
    expect(convertirTaille(2, 'px', 'em')).toBe(0.5);
  });
});
