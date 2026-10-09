import { describe, expect, it } from 'vitest';
import { BAREME_DEFAUT, calculerPrixLead } from '../leads';
import {
  PLAFOND_PRIX_COMMERCIAL,
  controlerParametres,
  controlerPrixManuel,
  controlerPromo,
  prixDepuisDetail,
  statutApresParametres,
} from './prix';

const bornes = { plancher: 500, plafond: 9900 };
const manuel = (base: number, premium = base, credits = 1) => ({
  prixBaseCentimes: base,
  prixPremiumCentimes: premium,
  prixCredits: credits,
});

describe('éditeur de prix (ADMIN §2.5)', () => {
  it('le prix automatique se recalcule depuis le détail enregistré', () => {
    const p = calculerPrixLead(
      {
        metier: 'plomberie',
        trancheBudget: 'L',
        urgence: 'urgente',
        qualiteLead: 85,
        nbEligibles: 3,
      },
      BAREME_DEFAUT,
    );
    expect(prixDepuisDetail(p.detailCalcul, BAREME_DEFAUT)).toEqual({
      prixBaseCentimes: p.prixBaseCentimes,
      prixPremiumCentimes: p.prixPremiumCentimes,
      prixCredits: p.prixCredits,
    });
  });
  it('prix manuel : dans les bornes et sous 30 € sans permission illimitée', () => {
    expect(controlerPrixManuel(manuel(2500, 1800, 3), bornes, false)).toBeNull();
    expect(controlerPrixManuel(manuel(PLAFOND_PRIX_COMMERCIAL + 100), bornes, false)).toMatch(
      /leads\.prix_illimite/,
    );
    expect(controlerPrixManuel(manuel(400), bornes, false)).toMatch(/plancher/);
  });
  it('au-delà des bornes avec la permission illimitée', () => {
    expect(controlerPrixManuel(manuel(12_000, 9000, 12), bornes, true)).toBeNull();
    expect(controlerPrixManuel(manuel(100), bornes, true)).toBeNull();
  });
  it('le prix Premium ne dépasse jamais le prix de base', () => {
    expect(controlerPrixManuel(manuel(2000, 2500), bornes, true)).toMatch(/Premium/);
  });
  it('promo : date de fin future, avant la clôture de l’appel d’offres', () => {
    const ouvert = { maintenant: 1_000, ouvertJusquau: 10_000 };
    expect(controlerPromo(5_000, ouvert)).toBeNull();
    expect(controlerPromo(500, ouvert)).toMatch(/future/);
    expect(controlerPromo(20_000, ouvert)).toMatch(/clôture/);
  });
  it('nombre de déblocages : jamais sous les déblocages déjà faits', () => {
    expect(controlerParametres(2, 1)).toBeNull();
    expect(controlerParametres(1, 2)).toMatch(/2 déblocages/);
  });
  it('le statut suit le nombre maximal de déblocages', () => {
    expect(statutApresParametres('ouvert', 2, 2)).toBe('complet');
    expect(statutApresParametres('complet', 3, 2)).toBe('ouvert');
    expect(statutApresParametres('ouvert', 3, 1)).toBe('ouvert');
    expect(statutApresParametres('clos', 3, 1)).toBe('clos');
  });
});
