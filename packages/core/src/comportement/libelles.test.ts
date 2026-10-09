import { describe, expect, it } from 'vitest';
import { formatDureeVisite, texteAlerte } from './libelles';

describe('texteAlerte', () => {
  it('explique chaque type d’alerte avec ses chiffres', () => {
    expect(texteAlerte({ type: 'clic_mort', valeur: 0.054, reference: 0.02 })).toBe(
      '5,4 % des visiteurs cliquent dessus alors qu’il n’est pas cliquable (seuil 2 %).',
    );
    expect(texteAlerte({ type: 'rage', valeur: 0.006, reference: 0.005 })).toContain('0,6 %');
    expect(texteAlerte({ type: 'hesitation', valeur: 0.15, reference: 0.1 })).toContain('15 %');
    expect(texteAlerte({ type: 'sortie', valeur: 0.5, reference: 0.2 })).toContain(
      'moyenne des sections 20 %',
    );
    expect(texteAlerte({ type: 'baisse_conversion', valeur: 0.03, reference: 0.05 })).toBe(
      'Conversion à 3 % sur 7 jours, contre 5 % les 28 jours précédents.',
    );
    expect(texteAlerte({ type: 'element_invisible', valeur: 0.2, reference: 0.3 })).toBe(
      '20 % (référence 30 %).',
    );
  });
});

describe('formatDureeVisite', () => {
  it('affiche des secondes puis des minutes', () => {
    expect(formatDureeVisite(45_000)).toBe('45 s');
    expect(formatDureeVisite(65_000)).toBe('1 min 05');
  });
});
