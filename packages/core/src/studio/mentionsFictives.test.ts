import { describe, expect, it } from 'vitest';
import {
  calqueSansMention,
  creerFrise,
  friseSansMentionFictive,
  planSansMentionFictive,
  poserClip,
  sansMentionFictive,
  type PlanMontage,
} from './index';

describe('jamais « exemple fictif » à l’image', () => {
  it('textes nettoyés, éléments vides retirés', () => {
    expect(sansMentionFictive('Exemple fictif')).toBe('');
    expect(sansMentionFictive('Martin Plomberie (exemple fictif)')).toBe('Martin Plomberie');
    expect(sansMentionFictive('20 demandes · fictif')).toBe('20 demandes ·');
    const t = { debut: 0, fin: 1_000 };
    expect(
      calqueSansMention({
        type: 'texte',
        texte: 'Exemple fictif',
        style: 'note',
        position: 'bas',
        ...t,
      }),
    ).toBeNull();
    expect(
      calqueSansMention({ type: 'notification', titre: 'Exemple', texte: 'Fictif', ...t }),
    ).toBeNull();
    expect(
      calqueSansMention({
        type: 'liste',
        elements: ['Gratuit', 'Exemple fictif'],
        position: 'centre',
        ...t,
      }),
    ).toMatchObject({ elements: ['Gratuit'] });
    expect(
      calqueSansMention({ type: 'liste', elements: ['Fictif'], position: 'centre', ...t }),
    ).toBeNull();
    expect(
      calqueSansMention({ type: 'barre', libelle: 'Exemple', valeur: 10, position: 'bas', ...t }),
    ).toMatchObject({ libelle: 'Exemple' });
    expect(calqueSansMention({ type: 'fleche', x: 0.5, y: 0.5, ...t })).toMatchObject({
      type: 'fleche',
    });
  });

  it('plan et frise', () => {
    const plan = {
      format: 'vertical',
      titre: 'x',
      sousTitres: false,
      musique: false,
      artisan: null,
      captures: [],
      miniature: { texte: 'Exemple fictif', accent: '', tempsMs: 0 },
      plans: [
        {
          id: 'p1',
          source: { debut: 0, fin: 1_000 },
          visuel: 'carton',
          carton: 'Exemple fictif',
          camera: 'cachee',
          calques: [
            {
              type: 'texte',
              texte: 'Exemple fictif',
              style: 'note',
              position: 'bas',
              debut: 0,
              fin: 500,
            },
          ],
        },
        {
          id: 'p2',
          source: { debut: 1_000, fin: 2_000 },
          visuel: 'ecran',
          camera: 'cachee',
          calques: [],
        },
      ],
    } as PlanMontage;
    const n = planSansMentionFictive(plan);
    expect(n.plans[0]!.carton).toBe('Portail Travaux');
    expect(n.plans[0]!.calques).toEqual([]);
    expect(n.miniature!.texte).toBe('Portail Travaux');
    expect(planSansMentionFictive({ ...plan, miniature: undefined }).miniature).toBeUndefined();
    let f = creerFrise('vertical', 'x');
    f = poserClip(f, 'v1', {
      id: 'a',
      debut: 0,
      duree: 1_000,
      source: { type: 'carton', texte: 'Fictif' },
    });
    f = poserClip(f, 't1', {
      id: 'b',
      debut: 0,
      duree: 1_000,
      source: {
        type: 'effet',
        calque: {
          type: 'texte',
          texte: 'Exemple fictif',
          style: 'note',
          position: 'bas',
          debut: 0,
          fin: 1_000,
        },
      },
    });
    const g = friseSansMentionFictive(f);
    expect(g.pistes.find((p) => p.id === 'v1')!.clips[0]!.source).toEqual({
      type: 'carton',
      texte: 'Portail Travaux',
    });
    expect(g.pistes.find((p) => p.id === 't1')!.clips).toEqual([]);
  });
});
