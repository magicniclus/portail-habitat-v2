import { describe, expect, it } from 'vitest';
import { accrochePrincipale, appliquerVariante, verifierPlan, type PlanMontage } from './index';

const plan = (premier: PlanMontage['plans'][number]): PlanMontage => ({
  format: 'vertical',
  titre: 'T',
  plans: [
    premier,
    {
      id: 'b',
      source: { debut: 5_000, fin: 14_000 },
      visuel: 'ecran',
      camera: 'cachee',
      calques: [],
    },
  ],
  captures: [],
  artisan: null,
  sousTitres: true,
  musique: false,
  miniature: { texte: 'Gratuit ?', accent: 'Gratuit', tempsMs: 1_000 },
  variantes: [
    { id: 'v1', accroche: 'Arrête de payer', miniature: { texte: 'Stop', accent: 'Stop' } },
  ],
});

describe('variantes d’accroche', () => {
  it('remplace le premier texte et la miniature, garde le reste', () => {
    const p = plan({
      id: 'a',
      source: { debut: 0, fin: 5_000 },
      visuel: 'ecran',
      camera: 'cachee',
      calques: [
        {
          type: 'texte',
          texte: '10 demandes',
          style: 'accroche',
          position: 'haut',
          debut: 0,
          fin: 2_000,
        },
      ],
    });
    expect(accrochePrincipale(p)).toBe('10 demandes');
    const v = appliquerVariante(p, p.variantes![0]!);
    expect(accrochePrincipale(v)).toBe('Arrête de payer');
    expect(v.miniature).toEqual({ texte: 'Stop', accent: 'Stop', tempsMs: 1_000 });
    expect(v.variantes).toBeUndefined();
    expect(v.plans[1]).toBe(p.plans[1]);
    expect(verifierPlan(v, { dureePriseMs: 20_000, camera: false })).toEqual([]);
  });

  it('carton : son texte change', () => {
    const p = plan({
      id: 'a',
      source: { debut: 0, fin: 5_000 },
      visuel: 'carton',
      carton: 'Avant',
      camera: 'cachee',
      calques: [],
    });
    expect(accrochePrincipale(appliquerVariante(p, { id: 'v', accroche: 'Après' }))).toBe('Après');
  });

  it('sans texte au début : l’accroche est ajoutée, dans le plan', () => {
    const p = plan({
      id: 'a',
      source: { debut: 0, fin: 1_500 },
      visuel: 'ecran',
      camera: 'cachee',
      calques: [],
    });
    expect(accrochePrincipale(p)).toBeNull();
    const v = appliquerVariante(p, { id: 'v', accroche: 'Nouveau' });
    expect(v.plans[0]!.calques[0]).toMatchObject({ texte: 'Nouveau', debut: 0, fin: 1_500 });
    expect(verifierPlan(v, { dureePriseMs: 20_000, camera: false })).toEqual([]);
  });
});
