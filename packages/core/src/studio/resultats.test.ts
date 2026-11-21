import { describe, expect, it } from 'vitest';
import { decrochage, diagnosticVideo, resumeVosVideos } from './index';

describe('résultats de vos vidéos', () => {
  it('point de décrochage : la plus forte chute après l’accroche', () => {
    // 100 points : on perd 40 % entre 3 % et 6 % de la vidéo.
    const courbe = Array.from({ length: 100 }, (_, i) =>
      i < 3 ? 1 : i < 6 ? 1 - (i - 2) * 0.13 : 0.55 - i * 0.002,
    );
    const d = decrochage(courbe, 30);
    expect(d).toMatchObject({ seconde: 1.1, perte: 0.39 });
    expect(decrochage(null, 30)).toBeNull();
    expect(decrochage([1, 1], 30)).toBeNull();
  });

  it('diagnostic simple, sans chiffre inventé', () => {
    expect(
      diagnosticVideo({ retention: 0.35, dureeS: 40, courbe: null, vues: 1_000, abonnesGagnes: 2 }),
    ).toEqual(['Les gens regardent 35 % de la vidéo : raccourcissez ou resserrez le milieu.']);
    expect(
      diagnosticVideo({ retention: 0.9, dureeS: 20, courbe: null, vues: 1_000, abonnesGagnes: 0 }),
    ).toEqual([
      'Très bien regardée (90 %) mais aucun abonné : finissez par une raison de s’abonner.',
    ]);
    const courbe = Array.from({ length: 100 }, (_, i) => (i < 5 ? 1 - i * 0.12 : 0.5));
    expect(
      diagnosticVideo({ retention: 0.55, dureeS: 30, courbe, vues: 10, abonnesGagnes: 1 })[0],
    ).toMatch(/décrochent à 0,5 s : l’accroche ne retient pas/);
    expect(
      diagnosticVideo({ retention: null, dureeS: 30, courbe: null, vues: 10, abonnesGagnes: null }),
    ).toEqual([]);
  });

  it('résumé pour Claude : meilleures et moins bonnes vidéos, avec leurs chiffres réels', () => {
    const r = resumeVosVideos([
      {
        titre: 'A',
        reseau: 'youtube',
        vues: 12_000,
        retention: 0.7,
        abonnesGagnes: 40,
        accroche: 'Stop',
      },
      { titre: 'B', reseau: 'tiktok', vues: 300, retention: 0.2, abonnesGagnes: 0, accroche: null },
      {
        titre: 'C',
        reseau: 'instagram',
        vues: 5_000,
        retention: null,
        abonnesGagnes: null,
        accroche: null,
      },
    ]);
    expect(r.split('\n')[0]!.replace(/\s/g, ' ')).toBe(
      '- « A » (youtube) : 12 000 vues, 70 % regardé, +40 abonnés, accroche « Stop »',
    );
    expect(r).toContain('- « B » (tiktok) : 300 vues, 20 % regardé, +0 abonnés');
    expect(resumeVosVideos([])).toBe('');
  });
});
