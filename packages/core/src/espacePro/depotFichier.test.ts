import { describe, expect, it } from 'vitest';
import { regleDepot, typeReel } from './depotFichier';

const octets = (...n: number[]) => new Uint8Array([...n, ...new Array(16).fill(0)]);
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));

describe('regleDepot (mêmes limites que storage.rules)', () => {
  it('bannière : fiche.modifier, image de 5 Mo, remplaçable', () => {
    expect(regleDepot('artisans/a1/banniere/photo.jpg')).toEqual({
      artisanId: 'a1',
      permission: 'fiche.modifier',
      types: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
      maxMo: 5,
      creationSeule: false,
    });
  });

  it('logo, cachet, médiathèque, réalisation, document', () => {
    expect(regleDepot('artisans/a1/logo/l.png')).toMatchObject({
      maxMo: 2,
      permission: 'fiche.modifier',
    });
    expect(regleDepot('artisans/a1/tampon/t.png')).toMatchObject({
      maxMo: 2,
      permission: 'factures.emettre',
      creationSeule: true,
    });
    expect(regleDepot('sites/a1/medias/m.pdf')).toMatchObject({
      permission: 'site.gerer',
      creationSeule: true,
      types: expect.arrayContaining(['application/pdf']),
    });
    expect(regleDepot('artisans/a1/realisations/r1/p.jpg')).toMatchObject({
      permission: 'realisations.modifier',
      maxMo: 8,
    });
    expect(regleDepot('artisans/a1/documents/d1/kbis.pdf')).toMatchObject({
      permission: 'documents.televerser',
      maxMo: 10,
      creationSeule: true,
      types: ['application/pdf', 'image/jpeg', 'image/png'],
    });
  });

  it('refuse tout autre chemin', () => {
    for (const c of [
      'artisans/a1/video/v.mp4',
      'artisans/a1/banniere/../logo/x.png',
      'artisans/a1/banniere/',
      'artisans/a1/banniere/sous/x.png',
      'artisans/a 1/banniere/x.png',
      'demandes/d1/photos/p.jpg',
      'artisans/a1/banniere/..',
      '/artisans/a1/banniere/x.png',
    ])
      expect(regleDepot(c), c).toBeNull();
  });
});

describe('typeReel (signature du contenu)', () => {
  it('reconnaît JPEG, PNG, WebP, AVIF et PDF', () => {
    expect(typeReel(octets(0xff, 0xd8, 0xff))).toBe('image/jpeg');
    expect(typeReel(octets(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe('image/png');
    expect(typeReel(octets(...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WEBP')))).toBe('image/webp');
    expect(typeReel(octets(0, 0, 0, 0x1c, ...ascii('ftypavif')))).toBe('image/avif');
    expect(typeReel(octets(...ascii('%PDF-1.7')))).toBe('application/pdf');
  });

  it('null pour le reste (SVG, exécutable, vide)', () => {
    expect(typeReel(octets(...ascii('<svg')))).toBeNull();
    expect(typeReel(octets(0x4d, 0x5a))).toBeNull();
    expect(typeReel(new Uint8Array())).toBeNull();
  });
});
