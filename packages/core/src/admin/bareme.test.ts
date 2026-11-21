import { describe, expect, it } from 'vitest';
import { BAREME_DEFAUT, type CaracteristiquesLead } from '../leads';
import { baremeDepuisSaisie, saisieDepuisBareme, simulerBareme } from './bareme';

const lead = (id: string, c: Partial<CaracteristiquesLead> = {}) => ({
  id,
  titre: `Lead ${id}`,
  caracteristiques: {
    metier: 'plomberie',
    trancheBudget: 'M' as const,
    urgence: 'normale' as const,
    qualiteLead: 60,
    nbEligibles: 4,
    ...c,
  },
});

describe('barèmes (ADMIN §2.5, ADM-05)', () => {
  it('la saisie en euros et pourcentages revient au même barème', () => {
    expect(baremeDepuisSaisie(saisieDepuisBareme(BAREME_DEFAUT), BAREME_DEFAUT)).toEqual(
      BAREME_DEFAUT,
    );
  });
  it('simulation : prix avant et après, écart, hausses et baisses', () => {
    const saisie = saisieDepuisBareme(BAREME_DEFAUT);
    const nouveau = baremeDepuisSaisie(
      { ...saisie, prixBaseParMetier: { ...saisie.prixBaseParMetier, plomberie: 20 } },
      BAREME_DEFAUT,
    );
    const s = simulerBareme([lead('a'), lead('b', { metier: 'deco' })], BAREME_DEFAUT, nouveau);
    expect(s.lignes).toEqual([
      { id: 'a', titre: 'Lead a', avant: 1500, apres: 2000, ecart: 500 },
      { id: 'b', titre: 'Lead b', avant: 1200, apres: 1200, ecart: 0 },
    ]);
    expect(s).toMatchObject({ hausses: 1, baisses: 0, moyenneAvant: 1350, moyenneApres: 1600 });
  });
  it('sans lead : moyennes nulles', () => {
    expect(simulerBareme([], BAREME_DEFAUT, BAREME_DEFAUT)).toMatchObject({
      lignes: [],
      moyenneAvant: 0,
      moyenneApres: 0,
    });
  });
  it('baisse comptée', () => {
    const saisie = saisieDepuisBareme(BAREME_DEFAUT);
    const nouveau = baremeDepuisSaisie(
      { ...saisie, coefBudget: { ...saisie.coefBudget, M: 0.5 } },
      BAREME_DEFAUT,
    );
    expect(simulerBareme([lead('a')], BAREME_DEFAUT, nouveau).baisses).toBe(1);
  });
});
