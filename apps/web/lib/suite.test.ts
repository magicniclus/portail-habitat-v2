import { describe, expect, it } from 'vitest';
import { suiteSure } from './suite';

describe('suiteSure', () => {
  it('garde un chemin interne', () => {
    expect(suiteSure('/mon-espace/demandes/abc')).toBe('/mon-espace/demandes/abc');
  });
  it.each(['//evil.com', 'https://evil.com', '/\\evil.com', 'javascript:alert(1)', '', null])(
    'refuse « %s »',
    (s) => expect(suiteSure(s)).toBe('/mon-espace'),
  );
});
