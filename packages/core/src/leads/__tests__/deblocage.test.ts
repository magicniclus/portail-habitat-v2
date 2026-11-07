import { describe, expect, it } from 'vitest';
import { accesAppelOffres, choisirMoyen, debutMois } from '../deblocage';

const T = Date.UTC(2026, 9, 10, 12);
const prix = { centimes: 1900, credits: 2, promo: false };

describe('accesAppelOffres (D50)', () => {
  const ao = { acces: 'premium_prioritaire' as const, fenetrePremiumMin: 60, ouvertLe: T };
  it('Premium tout de suite, les autres après 60 minutes', () => {
    expect(accesAppelOffres(ao, true, T + 1)).toBe('ok');
    expect(accesAppelOffres(ao, false, T + 59 * 60_000)).toBe('reserve_premium');
    expect(accesAppelOffres(ao, false, T + 60 * 60_000)).toBe('ok');
  });
  it('premium_seul et tous', () => {
    expect(accesAppelOffres({ ...ao, acces: 'premium_seul' }, false, T + 86_400_000)).toBe(
      'reserve_premium',
    );
    expect(accesAppelOffres({ ...ao, acces: 'tous' }, false, T)).toBe('ok');
  });
});

describe('choisirMoyen (MATCHING [8], PRO-05)', () => {
  const vide = { soldeCredits: 0, creditsInclusRestants: 0 };
  it('gratuit : offert', () => {
    expect(choisirMoyen({ centimes: 0, credits: 0, promo: false }, vide, true, 'auto')).toEqual({
      moyen: 'offert_admin',
    });
  });
  it('crédits inclus Premium d’abord, puis crédits achetés', () => {
    expect(
      choisirMoyen(prix, { soldeCredits: 10, creditsInclusRestants: 3 }, true, 'auto'),
    ).toEqual({ moyen: 'inclus_premium' });
    expect(
      choisirMoyen(prix, { soldeCredits: 10, creditsInclusRestants: 3 }, false, 'auto'),
    ).toEqual({ moyen: 'credits' });
    expect(
      choisirMoyen(prix, { soldeCredits: 10, creditsInclusRestants: 1 }, true, 'auto'),
    ).toEqual({ moyen: 'credits' });
  });
  it('crédits insuffisants : carte ou pack proposés (rien n’est débité)', () => {
    expect(
      choisirMoyen(prix, { soldeCredits: 1, creditsInclusRestants: 0 }, false, 'auto'),
    ).toEqual({
      moyen: null,
      raison: 'credits_insuffisants',
    });
    expect(choisirMoyen(prix, vide, false, 'carte')).toEqual({ moyen: 'carte' });
  });
});

describe('debutMois', () => {
  it('premier jour du mois, heure de Paris', () => {
    expect(new Date(debutMois(T)).toISOString()).toBe('2026-09-30T22:00:00.000Z');
  });
});
