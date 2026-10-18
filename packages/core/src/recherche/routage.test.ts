import { describe, expect, it } from 'vitest';
import { cibleRecherche, requeteJournal, SCORE_NET } from './routage';

const s = (o: Partial<{ id: string; prestation: string; metierId: string; score: number }>) => ({
  id: 'sdb-italienne',
  prestation: 'sdb',
  metierId: 'plombier',
  score: 12,
  ...o,
});

describe('routage à la validation (RECHERCHE §3, RCH-04)', () => {
  it('suggestion choisie avec prestation → simulateur à l’étape 2, code postal prérempli', () => {
    expect(cibleRecherche({ projet: 'douche', cp: '33000', delai: 'asap', choix: s({}) })).toBe(
      '/simulateur?prestation=sdb&intention=sdb-italienne&cp=33000&delai=asap',
    );
  });
  it('prestation « diagnostic » → parcours diagnostic', () => {
    expect(
      cibleRecherche({
        projet: 'dpe',
        cp: '33150',
        delai: '',
        choix: s({ id: 'diag-dpe', prestation: 'diagnostic' }),
      }),
    ).toBe('/diagnostic-immobilier/estimation?intention=diag-dpe&cp=33150');
  });
  it('rien de choisi : le meilleur résultat s’il est net (score ≥ 8)', () => {
    expect(SCORE_NET).toBe(8);
    expect(
      cibleRecherche({ projet: 'douche italienne', cp: '', delai: '', meilleur: s({ score: 8 }) }),
    ).toBe('/simulateur?prestation=sdb&intention=sdb-italienne');
  });
  it('résultat trop flou ou aucun : demande libre avec le métier s’il est connu', () => {
    expect(
      cibleRecherche({
        projet: 'travaux divers',
        cp: '33000',
        delai: '',
        meilleur: s({ score: 7.9 }),
      }),
    ).toBe('/simulateur?projet=travaux+divers&metier=plombier&cp=33000');
    expect(cibleRecherche({ projet: 'xyzabc', cp: '330', delai: '' })).toBe(
      '/simulateur?projet=xyzabc',
    );
  });
});

describe('requête enregistrée dans le journal (sans données personnelles, RECHERCHE §5)', () => {
  it('normalisée et tronquée', () => {
    expect(requeteJournal('  Douche À l’Italienne ')).toBe('douche a l italienne');
    expect(requeteJournal('x'.repeat(200))).toHaveLength(80);
  });
  it('téléphones, emails et suites de chiffres retirés', () => {
    expect(requeteJournal('fuite 06 12 34 56 78 appelez')).toBe('fuite appelez');
    expect(requeteJournal('devis jean.dupont@mail.fr')).toBe('devis');
    expect(requeteJournal('toiture 33000 bordeaux')).toBe('toiture bordeaux');
    expect(requeteJournal('isolation 120 m2')).toBe('isolation 120 m2');
  });
});
