import { describe, expect, it } from 'vitest';
import { bornesMois, exportComptable, mrrCentimes, prixPack } from './finances';

describe('finances (ADMIN §2.8)', () => {
  it('MRR : abonnements actifs ramenés au mois, sièges compris, résiliés exclus', () => {
    expect(
      mrrCentimes([
        { produit: 'premium', periode: 'mensuel', statut: 'active', sieges: 0 },
        { produit: 'premium', periode: 'annuel', statut: 'active', sieges: 2 },
        { produit: 'visibilite', periode: 'annuel', statut: 'past_due', sieges: 0 },
        { produit: 'visibilite', periode: 'mensuel', statut: 'canceled', sieges: 0 },
      ]),
    ).toBe(9990 + 7990 + 1800 + 666);
  });
  it('mois civil à Paris : du 1er à minuit au 1er du mois suivant', () => {
    const [debut, fin] = bornesMois('2026-09');
    expect(new Date(debut).toISOString()).toBe('2026-08-31T22:00:00.000Z');
    expect(new Date(fin).toISOString()).toBe('2026-09-30T22:00:00.000Z');
    expect(new Date(bornesMois('2026-12')[1]).toISOString()).toBe('2026-12-31T23:00:00.000Z');
  });
  it('export CSV : séparateur point-virgule, montants à virgule, champs protégés, tri par date', () => {
    const csv = exportComptable([
      {
        le: Date.UTC(2026, 8, 12, 10),
        piece: 'F-2',
        client: 'Atelier "Garnier"; fils',
        ht: 9990,
        tva: 1998,
        ttc: 11988,
        moyen: 'carte',
      },
      {
        le: Date.UTC(2026, 8, 2, 10),
        piece: 'F-1',
        client: 'Bertrand',
        ht: 1900,
        tva: 380,
        ttc: 2280,
        moyen: 'carte',
      },
    ]);
    expect(csv.split('\r\n')).toEqual([
      'date;piece;client;ht;tva;ttc;moyen',
      '02/09/2026;F-1;Bertrand;19,00;3,80;22,80;carte',
      '12/09/2026;F-2;"Atelier ""Garnier""; fils";99,90;19,98;119,88;carte',
      '',
    ]);
  });
  it('avoir : montants négatifs', () => {
    expect(
      exportComptable([
        { le: 0, piece: 'R-1', client: 'X', ht: -1905, tva: -381, ttc: -2286, moyen: 'carte' },
      ]),
    ).toContain(';-19,05;-3,81;-22,86;');
  });
  it('prix d’un pack d’après le catalogue (D29)', () => {
    expect(prixPack(10)).toBe(9000);
    expect(prixPack(7)).toBeNull();
  });
});
