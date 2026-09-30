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
  produit: 'premium',
  statut: 'active',
  debutPeriode: T - 10 * JOUR,
  finPeriode: T + 20 * JOUR,
  sieges: 0,
  ...p,
});

describe('catalogue Stripe (D24, D25, D26, D29)', () => {
  it('prix en centimes HT, clés de recherche stables pour le script idempotent', () => {
    const prix = Object.fromEntries(CATALOGUE_STRIPE.map((p) => [p.cle, p.montantHt]));
    expect(prix).toEqual({
      premium_mensuel: 9990,
      premium_annuel: 95_880,
      visibilite_mensuel: 1290,
      visibilite_annuel: 7990,
      siege: 900,
      pack_10: 9000,
      pack_25: 20_000,
      pack_50: 37_500,
    });
    expect(cleStripe('premium_annuel')).toBe('ph_premium_annuel');
  });

  it('lirePrix retrouve le produit depuis la clé de recherche Stripe', () => {
    expect(lirePrix('ph_premium_annuel')).toEqual({
      type: 'abonnement',
      produit: 'premium',
      periode: 'annuel',
    });
    expect(lirePrix('ph_siege')).toEqual({ type: 'siege' });
    expect(lirePrix('ph_pack_25')).toEqual({ type: 'pack', credits: 25 });
    expect(lirePrix('autre')).toBeNull();
    expect(lirePrix(null)).toBeNull();
  });
});

describe('recapPaiement (ACQ-03)', () => {
  it('annuel : total dû = 12 mois, TVA 20 %', () => {
    expect(recapPaiement('premium', 'annuel')).toMatchObject({
      montantHt: 95_880,
      tva: 19_176,
      montantTtc: 115_056,
      parMoisHt: 7990,
    });
    expect(recapPaiement('visibilite', 'annuel')).toMatchObject({
      montantHt: 7990,
      tva: 1598,
      montantTtc: 9588,
    });
  });
  it('mensuel : une mensualité', () => {
    expect(recapPaiement('visibilite', 'mensuel')).toMatchObject({
      montantHt: 1290,
      tva: 258,
      montantTtc: 1548,
      parMoisHt: 1290,
    });
  });
});

describe('effetAbonnements (seul le webhook écrit plan, optionVisibilite, siegesMax)', () => {
  it('sans abonnement : gratuit, 1 siège', () => {
    expect(effetAbonnements([], T)).toEqual({
      plan: 'gratuit',
      planExpireLe: null,
      optionVisibilite: false,
      optionVisibiliteExpireLe: null,
      siegesMax: 1,
      paiementEnEchec: false,
    });
  });
  it('Premium actif : visibilité incluse, 3 sièges + sièges achetés', () => {
    expect(effetAbonnements([abo({ sieges: 2 })], T)).toMatchObject({
      plan: 'premium',
      planExpireLe: T + 20 * JOUR,
      optionVisibilite: true,
      siegesMax: 5,
    });
  });
  it('Visibilité seule', () => {
    expect(effetAbonnements([abo({ produit: 'visibilite' })], T)).toMatchObject({
      plan: 'gratuit',
      optionVisibilite: true,
      optionVisibiliteExpireLe: T + 20 * JOUR,
      siegesMax: 1,
    });
  });
  it('échec de paiement : 7 jours de grâce depuis le renouvellement, puis rétrogradation', () => {
    const echec = abo({ statut: 'past_due', debutPeriode: T - 3 * JOUR });
    expect(effetAbonnements([echec], T)).toMatchObject({ plan: 'premium', paiementEnEchec: true });
    const tard = abo({ statut: 'past_due', debutPeriode: T - 8 * JOUR });
    expect(effetAbonnements([tard], T)).toMatchObject({ plan: 'gratuit', paiementEnEchec: true });
  });
  it('résilié ou impayé : plus d’effet', () => {
    for (const statut of ['canceled', 'unpaid', 'incomplete', 'incomplete_expired'] as const)
      expect(effetAbonnements([abo({ statut })], T).plan).toBe('gratuit');
  });
  it('résiliation en fin de période : actif jusqu’au bout', () => {
    expect(effetAbonnements([abo({ statut: 'active' })], T).plan).toBe('premium');
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
