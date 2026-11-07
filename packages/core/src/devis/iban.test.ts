import { describe, expect, it } from 'vitest';
import { finIban, formatIban, ibanValide, normaliserIban } from './iban';
import { conditionsFacture } from './textes';

const FR = 'FR76 3000 6000 0112 3456 7890 189';

describe('IBAN des paramètres de facturation', () => {
  it('normalisé (sans espace, majuscules) et vérifié par la clé (mod 97)', () => {
    expect(normaliserIban(' fr76 3000-6000 0112 3456 7890 189 ')).toBe(
      'FR7630006000011234567890189',
    );
    expect(ibanValide(FR)).toBe(true);
    expect(ibanValide('DE89 3704 0044 0532 0130 00')).toBe(true);
    expect(ibanValide('FR76 3000 6000 0112 3456 7890 188')).toBe(false);
    expect(ibanValide('FR76 3000 6000 0112 3456 7890 18')).toBe(false);
    expect(ibanValide('ZZ00')).toBe(false);
    expect(ibanValide('')).toBe(false);
  });

  it('affiché par groupes de 4, et seules les 4 dernières lettres sont montrées à l’écran', () => {
    expect(formatIban('FR7630006000011234567890189')).toBe(FR);
    expect(finIban(FR)).toBe('0189');
  });
});

describe('IBAN sur la facture', () => {
  const p = {
    raisonSociale: 'X',
    adresseSiege: 'Y',
    siret: '81234567800021',
    franchiseTva: false,
    tvaSurDebits: false,
    delaiPaiementJours: 30,
    acompteDefautPct: 30,
    validiteDevisJours: 30,
    tvaDefaut: 10 as const,
  };
  it('ligne « Paiement par virement » sur une facture, jamais sur un avoir ni sans IBAN', () => {
    const c = { typeClient: 'particulier' as const, type: 'facture' as const };
    expect(conditionsFacture(c, { ...p, iban: 'FR7630006000011234567890189' })).toContain(
      `Paiement par virement : IBAN ${FR}.`,
    );
    expect(conditionsFacture(c, p).join()).not.toContain('IBAN');
    expect(
      conditionsFacture(
        { ...c, type: 'avoir' },
        { ...p, iban: 'FR7630006000011234567890189' },
      ).join(),
    ).not.toContain('IBAN');
  });
});
