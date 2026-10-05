import { describe, expect, it } from 'vitest';
import {
  demandesManquees,
  depenseAppelsOffres,
  signalCredits,
  signalGarantie,
  signalPassageAnnuel,
} from './opportunites';

const J = 86_400_000;

describe('dépense en appels d’offres (CONVERSION §3 S6, prem-credits)', () => {
  it('carte et crédits achetés comptent, crédits inclus et gestes offerts non', () => {
    expect(
      depenseAppelsOffres([
        { moyen: 'carte', prixHtCentimes: 2000, credits: 0 },
        { moyen: 'credits', prixHtCentimes: 0, credits: 3 },
        { moyen: 'inclus_premium', prixHtCentimes: 0, credits: 2 },
        { moyen: 'offert_admin', prixHtCentimes: 0, credits: 0 },
      ]),
    ).toEqual({ credits30j: 5, montant30jCentimes: 5000 });
  });
});

describe('signal prem-credits', () => {
  const o = { maintenant: 100 * J };
  const d = { credits30j: 5, montant30jCentimes: 5000 };
  it('plus de 40 € HT sur 30 jours, gratuit ou Visibilité : signal', () => {
    expect(signalCredits('visibilite', d, o)).toBe(true);
    expect(signalCredits('gratuit_actif', d, o)).toBe(true);
  });
  it('40 € tout juste, Premium ou déjà envoyé il y a moins de 30 jours : rien', () => {
    expect(signalCredits('visibilite', { montant30jCentimes: 4000 }, o)).toBe(false);
    expect(signalCredits('premium', d, o)).toBe(false);
    expect(signalCredits('visibilite', d, { ...o, dernier: 80 * J })).toBe(false);
    expect(signalCredits('visibilite', d, { ...o, dernier: 70 * J })).toBe(true);
  });
});

describe('demandes exclusives manquées (prem-demandes-manquees)', () => {
  const bordeaux = { latitude: 44.84, longitude: -0.58 };
  const artisan = { metiers: ['plombier'], centre: bordeaux, rayonKm: 20 };
  const dem = (id: string, metier: string, geo = bordeaux, artisanId = 'premium-1') => ({
    id,
    metier,
    geo,
    artisanId,
    travaux: 'Salle de bain',
    ville: 'Talence',
    budgetCentimes: 900_000,
  });
  it('même métier, dans sa zone, confiées à un autre : retenues ; trop loin ou autre métier : non', () => {
    const r = demandesManquees('moi', artisan, [
      dem('d1', 'plombier'),
      dem('d2', 'plombier', { latitude: 44.8, longitude: -0.6 }),
      dem('d3', 'peintre'),
      dem('d4', 'plombier', { latitude: 45.76, longitude: 4.83 }),
      dem('d5', 'plombier', bordeaux, 'moi'),
    ]);
    expect(r.map((x) => x.id)).toEqual(['d1', 'd2']);
  });
  it('les plus gros budgets d’abord, 5 au plus', () => {
    const r = demandesManquees(
      'moi',
      artisan,
      [1, 2, 3, 4, 5, 6].map((n) => ({ ...dem(`d${n}`, 'plombier'), budgetCentimes: n * 1000 })),
    );
    expect(r.map((x) => x.budgetCentimes)).toEqual([6000, 5000, 4000, 3000, 2000]);
  });
});

describe('signal garantie-tenue (CONVERSION S7)', () => {
  // 15 octobre 2026, midi.
  const T = Date.UTC(2026, 9, 15, 10);
  it('Premium, 4 demandes reçues ce mois-ci, pas encore envoyé ce mois', () => {
    expect(signalGarantie('premium', 4, { maintenant: T })).toBe(true);
    expect(signalGarantie('premium', 3, { maintenant: T })).toBe(false);
    expect(signalGarantie('visibilite', 6, { maintenant: T })).toBe(false);
    expect(signalGarantie('premium', 5, { maintenant: T, dernier: T - 5 * J })).toBe(false);
    expect(signalGarantie('premium', 4, { maintenant: T, dernier: T - 20 * J })).toBe(true);
  });
});

describe('signal passage-annuel (CONVERSION S7)', () => {
  const T = 400 * J;
  const abo = (p: Partial<Parameters<typeof signalPassageAnnuel>[0][number]> = {}) => ({
    produit: 'premium' as const,
    periode: 'mensuel' as const,
    statut: 'active',
    creeLe: T - 61 * J,
    debutPeriode: T - J,
    ...p,
  });
  it('après la 3e échéance mensuelle payée, une seule fois', () => {
    expect(signalPassageAnnuel([abo()], { dejaEnvoye: false })).toBe('premium');
    expect(
      signalPassageAnnuel([abo({ debutPeriode: T - 31 * J })], { dejaEnvoye: false }),
    ).toBeNull();
    expect(signalPassageAnnuel([abo()], { dejaEnvoye: true })).toBeNull();
  });
  it('annuel, résilié : rien ; Visibilité seule : offre Visibilité', () => {
    expect(signalPassageAnnuel([abo({ periode: 'annuel' })], { dejaEnvoye: false })).toBeNull();
    expect(signalPassageAnnuel([abo({ statut: 'canceled' })], { dejaEnvoye: false })).toBeNull();
    expect(signalPassageAnnuel([abo({ produit: 'visibilite' })], { dejaEnvoye: false })).toBe(
      'visibilite',
    );
  });
});
