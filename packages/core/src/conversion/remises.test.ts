import { describe, expect, it } from 'vitest';
import { codePersonnel, decisionRemise, finValidite, libelleExpiration } from './remises';

const J = 86_400_000;
// Mardi 13 octobre 2026, 7 h 15 à Paris.
const T = Date.UTC(2026, 9, 13, 5, 15);

describe('fin de validité (expiration réelle, D32c)', () => {
  it('72 h : le 3e jour à 23 h 59 heure de Paris ; libellé en clair', () => {
    const fin = finValidite(T, 3);
    expect(new Date(fin).toISOString()).toBe('2026-10-16T21:59:00.000Z');
    expect(libelleExpiration(fin)).toBe('vendredi 16 octobre à 23 h 59');
  });
  it('heure d’hiver et 1er du mois', () => {
    const fin = finValidite(Date.UTC(2026, 10, 24, 6), 7);
    expect(new Date(fin).toISOString()).toBe('2026-12-01T22:59:00.000Z');
    expect(libelleExpiration(fin)).toBe('mardi 1er décembre à 23 h 59');
  });
});

describe('code personnel', () => {
  it('nom en majuscules sans accent, pourcentage, suffixe aléatoire', () => {
    expect(codePersonnel('Élec’ Dupont & fils', 30, 'k7qf')).toBe('ELECDUPO30K7QF');
    expect(codePersonnel('', 30, 'ab12')).toBe('PRO30AB12');
  });
});

describe('décision de remise (CONVERSION §1.4)', () => {
  it('lancement : −30 % sur 12 mois, valable jusqu’au 3e jour, Visibilité annuelle', () => {
    expect(decisionRemise('vis-offre-lancement', { maintenant: T })).toEqual({
      type: 'nouveau',
      pourcentage: 30,
      dureeMois: 12,
      expire: finValidite(T, 3),
      produit: 'visibilite',
    });
  });
  it('reconquête : 7 jours, produit de l’ancien abonnement', () => {
    expect(decisionRemise('reconquete-1', { maintenant: T, produit: 'premium' })).toMatchObject({
      type: 'nouveau',
      expire: finValidite(T, 7),
      produit: 'premium',
    });
  });
  it('une remise au plus tous les 90 jours', () => {
    expect(
      decisionRemise('vis-offre-relance', { maintenant: T, derniereRemise: T - 80 * J }),
    ).toEqual({ type: 'refus' });
    expect(
      decisionRemise('vis-offre-relance', { maintenant: T, derniereRemise: T - 90 * J }),
    ).toMatchObject({ type: 'nouveau' });
  });
  it('rappel : le même code, seulement s’il est encore valable et non utilisé', () => {
    const code = {
      code: 'X30AAAA',
      pourcentage: 30,
      produit: 'visibilite' as const,
      expire: T + J,
      utilise: false,
    };
    expect(decisionRemise('vis-offre-rappel', { maintenant: T, codeActif: code })).toEqual({
      type: 'reprise',
      ...code,
    });
    expect(decisionRemise('vis-offre-rappel', { maintenant: T + 2 * J, codeActif: code })).toEqual({
      type: 'refus',
    });
    expect(
      decisionRemise('vis-offre-rappel', { maintenant: T, codeActif: { ...code, utilise: true } }),
    ).toEqual({ type: 'refus' });
    expect(decisionRemise('vis-offre-rappel', { maintenant: T })).toEqual({ type: 'refus' });
  });
  it('modèle sans remise', () => {
    expect(decisionRemise('vis-position', { maintenant: T })).toEqual({ type: 'aucune' });
  });
});

describe('libellés du back-office', () => {
  it('type de trace connu ou repli', async () => {
    const { libelleTrace } = await import('./libelles');
    expect(libelleTrace('conversion')).toEqual({ libelle: 'Conversion', tone: 'succes' });
    expect(libelleTrace('inconnu')).toEqual({ libelle: 'inconnu', tone: 'neutre' });
  });
});
