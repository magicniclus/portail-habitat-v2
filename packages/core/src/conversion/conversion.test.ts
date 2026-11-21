import { describe, expect, it } from 'vitest';
import {
  controlerPression,
  creneauEnvoi,
  dansGroupeTemoin,
  etapeCycle,
  offreCible,
  remisePossible,
  scoreCycle,
} from './index';

const J = 86_400_000;
// Mardi 6 octobre 2026, 10 h à Paris (8 h UTC).
const MARDI_10H = Date.UTC(2026, 9, 6, 8);

describe('score et offre cible (CONVERSION §4)', () => {
  it('somme des signaux, bornée entre 0 et 100', () => {
    expect(scoreCycle({})).toBe(0);
    expect(
      scoreCycle({
        effectif: 5,
        nbMetiers: 3,
        tempsReponseMin: 60,
        demandes30j: 6,
        deblocages30j: 2,
        joursConnexion7j: 4,
        completude: 100,
      }),
    ).toBe(100);
    expect(scoreCycle({ rayonKm: 30, joursSansConnexion: 20 })).toBe(0);
    expect(scoreCycle({ effectif: 3, rayonKm: 40 })).toBe(30);
  });
  it('offre cible : Premium à 50, changement au plus une fois par 30 jours', () => {
    expect(offreCible({ score: 50, maintenant: 0 })).toBe('premium');
    expect(offreCible({ score: 49, maintenant: 0 })).toBe('visibilite');
    expect(
      offreCible({ score: 80, actuelle: 'visibilite', changeeLe: 0, maintenant: 10 * J }),
    ).toBe('visibilite');
    expect(
      offreCible({ score: 80, actuelle: 'visibilite', changeeLe: 0, maintenant: 31 * J }),
    ).toBe('premium');
  });
});

describe('étape du cycle (CONVERSION §2)', () => {
  it('d’après le compte, la fiche et l’abonnement', () => {
    expect(etapeCycle({ compte: false, brouillon: false })).toBe('prospect');
    expect(etapeCycle({ compte: false, brouillon: true })).toBe('inscription_commencee');
    expect(etapeCycle({ compte: true, enLigne: false })).toBe('compte_cree');
    expect(etapeCycle({ compte: true, enLigne: true, plan: 'gratuit' })).toBe('gratuit_actif');
    expect(etapeCycle({ compte: true, enLigne: true, plan: 'visibilite' })).toBe('visibilite');
    expect(etapeCycle({ compte: true, enLigne: true, plan: 'premium' })).toBe('premium');
    expect(
      etapeCycle({ compte: true, enLigne: true, plan: 'premium', resiliationDemandee: true }),
    ).toBe('resiliation_demandee');
    expect(etapeCycle({ compte: true, enLigne: true, plan: 'gratuit', ancienAbonne: true })).toBe(
      'ancien_client',
    );
  });
});

describe('groupe témoin (CONVERSION §5)', () => {
  it('tirage stable, environ 10 %', () => {
    expect(dansGroupeTemoin('abc', 0.1)).toBe(dansGroupeTemoin('abc', 0.1));
    const n = Array.from({ length: 2000 }, (_, i) => dansGroupeTemoin(`a${i}`, 0.1)).filter(
      Boolean,
    ).length;
    expect(n).toBeGreaterThan(150);
    expect(n).toBeLessThan(250);
    expect(dansGroupeTemoin('abc', 0)).toBe(false);
  });
});

describe('pression et créneaux (CONVERSION §5)', () => {
  const base = {
    maintenant: MARDI_10H,
    envois: [] as { le: number; categorie: string }[],
    emailsNonOuverts: 0,
    groupeTemoin: false,
  };
  it('2 offres pro par semaine, 1 non transactionnel par jour', () => {
    expect(controlerPression({ ...base, categorie: 'offres_pro' })).toEqual({ ok: true });
    expect(
      controlerPression({
        ...base,
        categorie: 'offres_pro',
        envois: [
          { le: MARDI_10H - 2 * J, categorie: 'offres_pro' },
          { le: MARDI_10H - 3 * J, categorie: 'offres_pro' },
        ],
      }),
    ).toEqual({ ok: false, raison: 'pression' });
    expect(
      controlerPression({
        ...base,
        categorie: 'offres_pro',
        envois: [{ le: MARDI_10H - 3_600_000, categorie: 'activite' }],
      }),
    ).toEqual({ ok: false, raison: 'pression' });
    expect(
      controlerPression({
        ...base,
        categorie: 'transactionnel',
        envois: [{ le: MARDI_10H - 3_600_000, categorie: 'activite' }],
      }),
    ).toEqual({ ok: true });
  });
  it('veille après 5 non ouverts, groupe témoin jamais contacté pour une offre', () => {
    expect(controlerPression({ ...base, categorie: 'offres_pro', emailsNonOuverts: 5 })).toEqual({
      ok: false,
      raison: 'veille',
    });
    expect(controlerPression({ ...base, categorie: 'offres_pro', groupeTemoin: true })).toEqual({
      ok: false,
      raison: 'temoin',
    });
    expect(controlerPression({ ...base, categorie: 'transactionnel', groupeTemoin: true })).toEqual(
      { ok: true },
    );
  });
  it('créneaux : calendrier mardi-jeudi 7 h 15, signal 7 h 15 ou 18 h 30, jamais le week-end', () => {
    const iso = (ms: number) => new Date(ms).toISOString();
    // Mardi 10 h → signal : mardi 18 h 30 (16 h 30 UTC).
    expect(iso(creneauEnvoi(MARDI_10H, 'signal'))).toBe('2026-10-06T16:30:00.000Z');
    // Mardi 10 h → calendrier : mercredi 7 h 15.
    expect(iso(creneauEnvoi(MARDI_10H, 'calendrier'))).toBe('2026-10-07T05:15:00.000Z');
    // Vendredi 20 h → signal : lundi 7 h 15 ; calendrier : mardi 7 h 15.
    const vendredi = Date.UTC(2026, 9, 9, 18);
    expect(iso(creneauEnvoi(vendredi, 'signal'))).toBe('2026-10-12T05:15:00.000Z');
    expect(iso(creneauEnvoi(vendredi, 'calendrier'))).toBe('2026-10-13T05:15:00.000Z');
  });
});

describe('remises (D32c)', () => {
  it('30 % au plus, une fois par 90 jours ; 50 % réservé à la rétention, une fois par an', () => {
    expect(remisePossible({ pourcentage: 30, maintenant: 100 * J })).toBe(true);
    expect(remisePossible({ pourcentage: 40, maintenant: 100 * J })).toBe(false);
    expect(remisePossible({ pourcentage: 30, derniereRemise: 20 * J, maintenant: 100 * J })).toBe(
      false,
    );
    expect(remisePossible({ pourcentage: 50, retention: true, maintenant: 400 * J })).toBe(true);
    expect(
      remisePossible({
        pourcentage: 50,
        retention: true,
        derniereOffreRetention: 100 * J,
        maintenant: 400 * J,
      }),
    ).toBe(false);
  });
});
