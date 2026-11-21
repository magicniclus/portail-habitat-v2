import { describe, expect, it } from 'vitest';
import { RYTHME_MAX_MS, verifierRythme, type PlanMontage } from './index';

const plan = (plans: PlanMontage['plans']): PlanMontage => ({
  format: 'vertical',
  titre: 'T',
  plans,
  captures: [{ id: 'c1', scene: 'demandes_recues' }],
  artisan: null,
  sousTitres: true,
  musique: false,
});
const texte = (debut: number, fin: number) =>
  ({ type: 'texte', texte: 'Stop', style: 'accroche', position: 'haut', debut, fin }) as const;

describe('rythme du montage', () => {
  it('un changement visuel toutes les 3 s au plus', () => {
    expect(RYTHME_MAX_MS).toBe(3_000);
    const r = verifierRythme(
      plan([
        {
          id: 'a',
          source: { debut: 0, fin: 2_500 },
          visuel: 'carton',
          carton: 'Stop',
          camera: 'cachee',
          calques: [],
        },
        {
          id: 'b',
          source: { debut: 2_500, fin: 10_000 },
          visuel: 'capture',
          captureId: 'c1',
          camera: 'cachee',
          calques: [texte(4_000, 5_000)],
        },
      ]),
    );
    // b commence à 2,5 s, calque à 6,5 s (2,5 + 4), fin à 10 s : 4 s puis 3,5 s sans rien.
    expect(r.lents).toEqual([
      { debut: 2_500, fin: 6_500 },
      { debut: 6_500, fin: 10_000 },
    ]);
    expect(r.accroche).toBe(true);
  });

  it('un rythme serré passe, et le texte dès la première image est exigé', () => {
    const r = verifierRythme(
      plan([
        {
          id: 'a',
          source: { debut: 0, fin: 2_000 },
          visuel: 'capture',
          captureId: 'c1',
          camera: 'cachee',
          calques: [],
        },
        {
          id: 'b',
          source: { debut: 2_000, fin: 4_500 },
          visuel: 'capture',
          captureId: 'c1',
          camera: 'cachee',
          calques: [texte(0, 1_000)],
        },
      ]),
    );
    expect(r.lents).toEqual([]);
    expect(r.accroche).toBe(false);
    expect(r.messages.join(' ')).toMatch(/première image/);
  });

  it('texte posé à 0 sur le premier plan : accroche visible', () => {
    const r = verifierRythme(
      plan([
        {
          id: 'a',
          source: { debut: 0, fin: 2_000 },
          visuel: 'ecran',
          camera: 'cachee',
          calques: [texte(0, 1_500)],
        },
      ]),
    );
    expect(r.accroche).toBe(true);
    expect(r.messages).toEqual([]);
  });
});
