import { describe, expect, it } from 'vitest';
import {
  CATALOGUE_STRIPE,
  cleStripe,
  effetAbonnements,
  etatAbonnement,
  lirePrix,
  recapPaiement,
  type AbonnementEtat,
} from './abonnements';

const JOUR = 86_400_000;
const T = Date.UTC(2026, 9, 1);
const abo = (p: Partial<AbonnementEtat>): AbonnementEtat => ({
  produit: 'tout_inclus',
  statut: 'active',
  debutPeriode: T - 10 * JOUR,
  finPeriode: T + 20 * JOUR,
  sieges: 0,
  ...p,
});

describe('catalogue Stripe (PAIEMENTS §2-3, D54, D59)', () => {
  it('prix en centimes HT, clés de recherche stables pour le script idempotent', () => {
    const prix = Object.fromEntries(CATALOGUE_STRIPE.map((p) => [p.cle, p.montantHt]));
    expect(prix).toEqual({
      fiche_pro: 2900,
      site_pro: 990,
      pack_fiche_site: 3490,
      tout_inclus: 4900,
      siege: 900,
      credits_50: 5000,
      credits_100: 10_000,
      credits_250: 25_000,
      ia_100: 290,
    });
    expect(CATALOGUE_STRIPE.filter((p) => p.intervalle === 'month')).toHaveLength(5);
    expect(cleStripe('tout_inclus')).toBe('ph_tout_inclus');
  });

  it('lirePrix retrouve le produit depuis la clé de recherche Stripe', () => {
    expect(lirePrix('ph_site_pro')).toEqual({ type: 'abonnement', produit: 'site_pro' });
    expect(lirePrix('ph_siege')).toEqual({ type: 'siege' });
    expect(lirePrix('ph_credits_100')).toEqual({ type: 'credits', credits: 110 });
    expect(lirePrix('ph_ia_100')).toEqual({ type: 'ia', modifications: 100 });
    expect(lirePrix('ph_premium_mensuel')).toBeNull();
    expect(lirePrix(null)).toBeNull();
  });
});

describe('recapPaiement (PAY-02)', () => {
  it('Fiche Pro : 29 € HT, 34,80 € TTC', () => {
    expect(recapPaiement('fiche_pro')).toMatchObject({
      montantHt: 2900,
      tva: 580,
      montantTtc: 3480,
    });
  });
  it('Site Pro : TVA arrondie au centime', () => {
    expect(recapPaiement('site_pro')).toMatchObject({ montantHt: 990, tva: 198, montantTtc: 1188 });
  });
});

describe('effetAbonnements (seul le webhook écrit droits et siegesMax)', () => {
  it('sans abonnement : gratuit, 1 siège', () => {
    expect(effetAbonnements([], T)).toEqual({
      formule: 'gratuit',
      statut: 'actif',
      finPeriode: null,
      siegesMax: 1,
      paiementEnEchec: false,
    });
  });
  it('Tout inclus actif : 3 sièges + sièges achetés', () => {
    expect(effetAbonnements([abo({ sieges: 2 })], T)).toMatchObject({
      formule: 'tout_inclus',
      finPeriode: T + 20 * JOUR,
      siegesMax: 5,
    });
  });
  it('Fiche Pro : 1 siège', () => {
    expect(effetAbonnements([abo({ produit: 'fiche_pro' })], T)).toMatchObject({
      formule: 'fiche_pro',
      siegesMax: 1,
    });
  });
  it('changement en cours : la formule la plus complète l’emporte', () => {
    const deux = [abo({ produit: 'site_pro' }), abo({ produit: 'pack_fiche_site' })];
    expect(effetAbonnements(deux, T).formule).toBe('pack_fiche_site');
  });
  it('échec de paiement : 7 jours de grâce depuis le renouvellement, puis Gratuit (PAY-08)', () => {
    const echec = abo({ statut: 'past_due', debutPeriode: T - 3 * JOUR });
    expect(effetAbonnements([echec], T)).toMatchObject({
      formule: 'tout_inclus',
      statut: 'grace',
      paiementEnEchec: true,
    });
    const tard = abo({ statut: 'past_due', debutPeriode: T - 8 * JOUR });
    expect(effetAbonnements([tard], T)).toMatchObject({
      formule: 'gratuit',
      paiementEnEchec: true,
    });
  });
  it('résilié ou impayé : plus d’effet', () => {
    for (const statut of ['canceled', 'unpaid', 'incomplete', 'incomplete_expired'] as const)
      expect(effetAbonnements([abo({ statut })], T).formule).toBe('gratuit');
  });
  it('résiliation en fin de période : actif jusqu’au bout', () => {
    expect(effetAbonnements([abo({ annulationFinPeriode: true })], T)).toMatchObject({
      formule: 'tout_inclus',
      statut: 'resilie_fin_periode',
    });
  });
});

describe('etatAbonnement', () => {
  const fin = Date.UTC(2027, 9, 1, 12);
  it('actif, résilié, paiement refusé', () => {
    expect(
      etatAbonnement({ statut: 'active', annulationFinPeriode: false, finPeriode: fin }),
    ).toEqual({
      texte: 'Actif · prochaine échéance le 1 octobre 2027',
      ton: 'succes',
    });
    expect(
      etatAbonnement({ statut: 'active', annulationFinPeriode: true, finPeriode: fin }).texte,
    ).toBe('Résilié, actif jusqu’au 1 octobre 2027');
    expect(
      etatAbonnement({ statut: 'past_due', annulationFinPeriode: false, finPeriode: fin }).ton,
    ).toBe('danger');
  });
});
