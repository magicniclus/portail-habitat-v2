import { describe, expect, it } from 'vitest';
import { agregatVide, type Agregat } from './agregation';
import { cleAlerte, detecterAlertes } from './detection';

const agregat = (surcharge: Partial<Agregat>): Agregat => ({ ...agregatVide(), ...surcharge });
const elem = (e: Partial<Agregat['elements'][string]>) => ({
  clics: 0,
  morts: 0,
  rages: 0,
  hesitations: 0,
  survolTotalMs: 0,
  ...e,
});
const sect = (vues: number, sorties: number) => ({
  vues,
  lues: 0,
  tempsTotalMs: 0,
  sorties,
  conversionsSiLue: 0,
});

describe('detecterAlertes', () => {
  it('ne dit rien sous 200 sessions', () => {
    const a = agregat({ sessions: 199, elements: { x: elem({ morts: 100 }) } });
    expect(detecterAlertes(a, agregatVide())).toEqual([]);
  });

  it('relève clics morts (> 2 %), rages (> 0,5 %) et hésitations (> 10 %)', () => {
    const a = agregat({
      sessions: 1000,
      elements: {
        'prix-premium': elem({ morts: 50, hesitations: 150 }),
        'hero>img:1': elem({ rages: 6 }),
        sain: elem({ morts: 20, rages: 5, hesitations: 100 }),
      },
    });
    expect(detecterAlertes(a, agregatVide())).toEqual([
      { type: 'clic_mort', element: 'prix-premium', gravite: 2, valeur: 0.05, reference: 0.02 },
      { type: 'hesitation', element: 'prix-premium', gravite: 1, valeur: 0.15, reference: 0.1 },
      { type: 'rage', element: 'hero>img:1', gravite: 1, valeur: 0.006, reference: 0.005 },
    ]);
  });

  it('plafonne la gravité à 5', () => {
    const a = agregat({ sessions: 200, elements: { x: elem({ morts: 200 }) } });
    expect(detecterAlertes(a, agregatVide())[0]!.gravite).toBe(5);
  });

  it('signale une section qui fait partir bien plus que les autres', () => {
    const a = agregat({
      sessions: 1000,
      sections: {
        hero: sect(1000, 50),
        offres: sect(600, 300),
        faq: sect(200, 20),
        vide: sect(0, 0),
      },
    });
    const [alerte] = detecterAlertes(a, agregatVide());
    expect(alerte).toMatchObject({ type: 'sortie', element: 'offres', valeur: 0.5 });
    expect(alerte!.reference).toBeCloseTo((0.05 + 0.5 + 0.1) / 3);
  });

  it('ignore une section aux sorties trop peu nombreuses', () => {
    const a = agregat({ sessions: 1000, sections: { a: sect(1000, 1), b: sect(40, 29) } });
    expect(detecterAlertes(a, agregatVide())).toEqual([]);
  });

  it('signale une baisse de conversion de plus de 20 % face aux 28 jours précédents', () => {
    const semaine = agregat({ sessions: 1000, conversions: 30 });
    const avant = agregat({ sessions: 4000, conversions: 200 });
    expect(detecterAlertes(semaine, avant)).toEqual([
      { type: 'baisse_conversion', gravite: 2, valeur: 0.03, reference: 0.05 },
    ]);
    expect(detecterAlertes(agregat({ sessions: 1000, conversions: 45 }), avant)).toEqual([]);
    expect(detecterAlertes(semaine, agregat({ sessions: 100, conversions: 50 }))).toEqual([]);
    expect(detecterAlertes(semaine, agregat({ sessions: 4000, conversions: 0 }))).toEqual([]);
  });
});

describe('cleAlerte', () => {
  it('forme une clé de document stable', () => {
    expect(cleAlerte('acquisition-artisans', { type: 'clic_mort', element: 'hero>img:1' })).toBe(
      'acquisition-artisans_clic_mort_hero-img-1',
    );
    expect(cleAlerte('accueil', { type: 'baisse_conversion' })).toBe(
      'accueil_baisse_conversion_page',
    );
  });
});
