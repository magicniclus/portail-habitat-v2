import { describe, expect, it } from 'vitest';
import { statistiquesPro, type JourStats } from './statistiques';

const jour = (j: string, vuesFiche: number, clicsTelephone = 0, clicsDevis = 0): JourStats => ({
  jour: j,
  vuesFiche,
  clicsTelephone,
  clicsDevis,
});

describe('statistiquesPro (maquette Statistiques)', () => {
  const jours = [
    jour('2026-09-29', 10, 1, 1),
    jour('2026-09-23', 20, 2, 0),
    jour('2026-09-22', 5),
    jour('2026-08-15', 100, 5, 5),
    jour('2025-09-01', 1000),
  ];

  it('7 jours : du 23 au 29 inclus', () => {
    const s = statistiquesPro(jours, '7j', '2026-09-29');
    expect(s.resume).toEqual({ vues: 30, appels: 3, devis: 1, tauxEngagement: 4 / 30 });
  });

  it('30 jours et 12 mois', () => {
    expect(statistiquesPro(jours, '30j', '2026-09-29').resume.vues).toBe(35);
    expect(statistiquesPro(jours, '12m', '2026-09-29').resume.vues).toBe(135);
  });

  it('taux nul sans vue ; conversions séparées', () => {
    const s = statistiquesPro([], '30j', '2026-09-29');
    expect(s.resume.tauxEngagement).toBe(0);
    expect(s.conversions.map((c) => c.cle)).toEqual(['appels', 'devis', 'total']);
    const t = statistiquesPro(jours, '7j', '2026-09-29');
    expect(t.conversions[0]).toMatchObject({ actions: 3, vues: 30 });
  });

  it('8 semaines glissantes, la plus ancienne d’abord, la dernière finit aujourd’hui', () => {
    const s = statistiquesPro(jours, '7j', '2026-09-29');
    expect(s.semaines).toHaveLength(8);
    expect(s.semaines.at(-1)).toEqual({ debut: '2026-09-23', fin: '2026-09-29', vues: 30 });
    expect(s.semaines.at(-2)).toMatchObject({ debut: '2026-09-16', fin: '2026-09-22', vues: 5 });
  });

  it('dernière vue', () => {
    expect(statistiquesPro(jours, '7j', '2026-09-29').derniereVue).toBe('2026-09-29');
    expect(statistiquesPro([jour('2026-09-01', 0)], '7j', '2026-09-29').derniereVue).toBeNull();
  });
});
