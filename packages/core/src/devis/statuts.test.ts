import { describe, expect, it } from 'vitest';
import { statutsPossibles, transitionPermise } from './statuts';

describe('statuts du devis', () => {
  it('accepté ou refusé seulement après envoi', () => {
    expect(transitionPermise('envoye', 'accepte')).toBe(true);
    expect(transitionPermise('brouillon', 'accepte')).toBe(false);
    expect(transitionPermise('accepte', 'refuse')).toBe(false);
  });
  it('archivé à tout moment, sauf déjà archivé', () => {
    expect(transitionPermise('expire', 'archive')).toBe(true);
    expect(transitionPermise('archive', 'archive')).toBe(false);
  });
  it('choix proposés dans la liste', () => {
    expect(statutsPossibles('envoye')).toEqual(['accepte', 'refuse', 'archive']);
    expect(statutsPossibles('brouillon')).toEqual(['archive']);
    expect(statutsPossibles('archive')).toEqual([]);
  });
});
