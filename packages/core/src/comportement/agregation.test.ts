import { describe, expect, it } from 'vitest';
import {
  agregatVide,
  agregerSessions,
  fusionnerAgregats,
  mediane,
  partsSorties,
  type SessionAgregee,
} from './agregation';

const s = (surcharge: Partial<SessionAgregee> = {}): SessionAgregee => ({
  appareil: 'ordinateur',
  duree: 30_000,
  profondeur: 50,
  source: 'direct',
  cellulesClics: { '1:1': 1 },
  cellulesAttention: { '2:2': 800 },
  sections: { hero: 5000, offres: 1000 },
  elements: { 'cta-hero': { survolMs: 400, clics: 1 } },
  morts: [],
  rages: [],
  sortie: { section: 'offres', type: 'fermeture' },
  ...surcharge,
});

describe('agregerSessions', () => {
  const jour = [
    s(),
    s({
      duree: 10_000,
      profondeur: 100,
      conversion: 'inscription',
      variante: 'B',
      source: 'google.com',
      sortie: { section: 'hero', type: 'conversion' },
    }),
    s({ appareil: 'mobile', profondeur: 20, morts: ['hero>img:1'], rages: ['hero>img:1'] }),
    s({
      trajet: [100, 100, 130, 100],
      elements: { 'prix-premium': { survolMs: 2500, clics: 0, hesitations: 1 } },
    }),
  ];

  it('compte les sessions, conversions, sources et variantes de l’appareil', () => {
    const a = agregerSessions(jour, 'ordinateur');
    expect(a).toMatchObject({
      sessions: 3,
      conversions: 1,
      sources: { direct: 2, 'google.com': 1 },
      variantes: { A: 2, B: 1 },
      conversionsVariantes: { B: 1 },
      dureeMediane: 30_000,
      profondeurMediane: 50,
    });
  });

  it('additionne les cartes et place les points de trajet dans des cellules', () => {
    const a = agregerSessions(jour, 'ordinateur');
    expect(a.grilleClics).toEqual({ '1:1': 3 });
    expect(a.grilleAttention).toEqual({ '2:2': 2400 });
    expect(a.grilleMouvements).toEqual({ '5:5': 1, '6:5': 1 });
  });

  it('compte les sessions qui atteignent chaque palier de défilement', () => {
    const a = agregerSessions(jour, 'ordinateur');
    expect(a.scroll[0]).toBe(3);
    expect(a.scroll[9]).toBe(3);
    expect(a.scroll[10]).toBe(1);
    expect(a.scroll[19]).toBe(1);
  });

  it('attribue les sections : vues, lues (> 3 s), sorties hors conversion, conversion si lue', () => {
    const a = agregerSessions(jour, 'ordinateur');
    expect(a.sections.hero).toEqual({
      vues: 3,
      lues: 3,
      tempsTotalMs: 15_000,
      sorties: 0,
      conversionsSiLue: 1,
    });
    expect(a.sections.offres).toMatchObject({ vues: 3, lues: 0, sorties: 2 });
    expect(partsSorties(a)).toEqual([{ section: 'offres', part: 1 }]);
  });

  it('cumule clics, survols, hésitations, clics morts et rages par élément', () => {
    const a = agregerSessions(jour, 'tous');
    expect(a.sessions).toBe(4);
    expect(a.grilleClics).toEqual({});
    expect(a.elements['cta-hero']).toMatchObject({ clics: 3, survolTotalMs: 1200 });
    expect(a.elements['prix-premium']).toMatchObject({ hesitations: 1 });
    expect(a.elements['hero>img:1']).toMatchObject({ morts: 1, rages: 1 });
  });

  it('rend un agrégat vide sans session', () => {
    expect(agregerSessions([], 'mobile')).toEqual(agregatVide());
  });

  it('compte une section de sortie jamais affichée assez longtemps', () => {
    const a = agregerSessions(
      [s({ sections: {}, sortie: { section: 'faq', type: 'fermeture' } })],
      'ordinateur',
    );
    expect(a.sections.faq).toMatchObject({ vues: 1, sorties: 1, tempsTotalMs: 0 });
    const sansSection = agregerSessions(
      [s({ sections: {}, sortie: { section: '', type: 'fermeture' } })],
      'ordinateur',
    );
    expect(sansSection.sections).toEqual({});
  });
});

describe('fusionnerAgregats', () => {
  it('additionne les journées et pondère les médianes par les sessions', () => {
    const j1 = agregerSessions([s(), s()], 'ordinateur');
    const j2 = agregerSessions([s({ duree: 60_000, profondeur: 80, morts: ['x'] })], 'ordinateur');
    const c = fusionnerAgregats([j1, j2]);
    expect(c.sessions).toBe(3);
    expect(c.dureeMediane).toBe(40_000);
    expect(c.profondeurMediane).toBe(60);
    expect(c.grilleClics).toEqual({ '1:1': 3 });
    expect(c.sections.hero!.vues).toBe(3);
    expect(c.elements.x!.morts).toBe(1);
    expect(c.scroll[9]).toBe(3);
  });

  it('rend un agrégat vide pour une liste vide', () => {
    expect(fusionnerAgregats([])).toEqual(agregatVide());
  });
});

describe('mediane', () => {
  it('gère les listes vides, impaires et paires', () => {
    expect(mediane([])).toBe(0);
    expect(mediane([3, 1, 2])).toBe(2);
    expect(mediane([1, 2, 3, 4])).toBe(3);
  });
});
