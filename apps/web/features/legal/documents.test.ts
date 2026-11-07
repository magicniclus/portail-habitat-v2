import { describe, expect, it } from 'vitest';
import { documentLegal, sommaire, tousLesDocuments } from './documents';

describe('pages légales', () => {
  it('6 documents par public, 12 pages au total', () => {
    expect(sommaire('particuliers').map((d) => d.slug)).toEqual([
      'cgu',
      'avis',
      'mentions',
      'confidentialite',
      'cookies',
      'securite',
    ]);
    expect(sommaire('pro').map((d) => d.slug)).toEqual([
      'cgv',
      'charte',
      'mentions',
      'confidentialite',
      'securite',
      'cookies',
    ]);
    expect(tousLesDocuments()).toHaveLength(12);
  });
  it('sécurité pro : document distinct de la sécurité particuliers', () => {
    expect(documentLegal('pro', 'securite')!.doc.titre).not.toBe(
      documentLegal('particuliers', 'securite')!.doc.titre,
    );
  });
  it('précédent / suivant', () => {
    const d = documentLegal('particuliers', 'cgu')!;
    expect(d.precedent).toBeNull();
    expect(d.suivant?.slug).toBe('avis');
  });
  it('inconnu : null (404)', () => {
    expect(documentLegal('particuliers', 'cgv')).toBeNull();
    expect(documentLegal('admin', 'cgu')).toBeNull();
    expect(documentLegal('pro', 'securitePro')).toBeNull();
  });
});
