import { describe, expect, it } from 'vitest';
import { joursPrecedents, moisPrecedents, resumeStatsSite } from './stats';

describe('statistiques du site (sans cookie)', () => {
  it('jours et mois précédents, du plus ancien au plus récent', () => {
    expect(joursPrecedents('2026-03-02', 3)).toEqual(['2026-02-28', '2026-03-01', '2026-03-02']);
    expect(moisPrecedents('2026-02', 3)).toEqual(['2025-12', '2026-01', '2026-02']);
  });

  it('série complétée par des zéros, totaux, taux de demande, pages les plus vues', () => {
    const r = resumeStatsSite(
      [
        { cle: '2026-03-01', vues: 40, demandes: 2, pages: { accueil: 30, contact: 10 } },
        { cle: '2026-03-02', vues: 10, demandes: 0, pages: { accueil: 4, devis: 6 } },
      ],
      ['2026-02-28', '2026-03-01', '2026-03-02'],
    );
    expect(r.serie).toEqual([
      { cle: '2026-02-28', vues: 0 },
      { cle: '2026-03-01', vues: 40 },
      { cle: '2026-03-02', vues: 10 },
    ]);
    expect(r.totaux).toEqual({ vues: 50, demandes: 2, taux: 0.04 });
    expect(r.pages).toEqual([
      { pageId: 'accueil', vues: 34 },
      { pageId: 'contact', vues: 10 },
      { pageId: 'devis', vues: 6 },
    ]);
    expect(resumeStatsSite([], ['2026-03-02']).totaux.taux).toBe(0);
  });
});
