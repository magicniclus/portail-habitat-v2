import { describe, expect, it } from 'vitest';
import { lireRoutage, SCHEMA_JSON_ROUTEUR } from './routeur';

describe('routeur de l’IA du site (IA_SITE §1, §5)', () => {
  it('lit un routage valide', () => {
    expect(lireRoutage('{"mode":"page","portee":"page"}', { selection: false })).toEqual({
      mode: 'page',
      portee: 'page',
    });
  });

  it('sans sélection, la portée « selection » devient « page »', () => {
    expect(lireRoutage('{"mode":"textes","portee":"selection"}', { selection: false })).toEqual({
      mode: 'textes',
      portee: 'page',
    });
  });

  it('sortie illisible ou hors liste : repli sur les textes (le moins coûteux)', () => {
    for (const t of ['pas du json', '{"mode":"tout","portee":"page"}', '{}'])
      expect(lireRoutage(t, { selection: true })).toEqual({ mode: 'textes', portee: 'selection' });
    expect(lireRoutage('{', { selection: false })).toEqual({ mode: 'textes', portee: 'page' });
  });

  it('schéma strict, sans propriété libre', () => {
    expect(SCHEMA_JSON_ROUTEUR).toMatchObject({ additionalProperties: false });
  });
});
