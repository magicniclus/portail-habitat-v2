import { describe, expect, it } from 'vitest';
import { entrepriseLocale, faqPage, filAriane } from './seo';

describe('JSON-LD', () => {
  it('FAQPage', () => {
    expect(faqPage([{ q: 'Gratuit ?', r: 'Oui.' }]).mainEntity[0]).toEqual({
      '@type': 'Question',
      name: 'Gratuit ?',
      acceptedAnswer: { '@type': 'Answer', text: 'Oui.' },
    });
  });
  it('BreadcrumbList : positions à partir de 1, adresses absolues', () => {
    const f = filAriane([
      { nom: 'Accueil', chemin: '/' },
      { nom: 'Diagnostic', chemin: '/diagnostic-immobilier' },
    ]);
    expect(f.itemListElement[1]).toMatchObject({ position: 2, name: 'Diagnostic' });
    expect(f.itemListElement[1]!.item).toMatch(/^https?:\/\/.+\/diagnostic-immobilier$/);
  });
  it('LocalBusiness : note seulement s’il y a des avis', () => {
    const base = { nom: 'X', chemin: '/x', description: 'd', ville: 'Lormont' };
    expect(entrepriseLocale(base)).not.toHaveProperty('aggregateRating');
    expect(
      entrepriseLocale({ ...base, note: { valeur: 4.8, nombre: 12 } }).aggregateRating,
    ).toEqual({
      '@type': 'AggregateRating',
      ratingValue: 4.8,
      reviewCount: 12,
    });
  });
});
