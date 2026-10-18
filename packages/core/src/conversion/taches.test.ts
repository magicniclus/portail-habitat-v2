import { describe, expect, it } from 'vitest';
import { tachesACreer } from './taches';

const J = 86_400_000;
const T = 400 * J;
const base = { maintenant: T, seuilAppel: 70, dernieres: {} };

describe('tâches commerciales automatiques (CONVERSION §3)', () => {
  it('activation : compte créé depuis 10 jours, fiche pas en ligne, score ≥ 40', () => {
    const e = { ...base, etape: 'compte_cree' as const, depuis: T - 10 * J, score: 40 };
    expect(tachesACreer(e)).toEqual(['appel_activation']);
    expect(tachesACreer({ ...e, depuis: T - 9 * J })).toEqual([]);
    expect(tachesACreer({ ...e, score: 39 })).toEqual([]);
  });
  it('appel commercial : gratuit visé par Premium, score ≥ 70, à J+7', () => {
    const e = {
      ...base,
      etape: 'gratuit_actif' as const,
      offreCible: 'premium' as const,
      depuis: T - 7 * J,
      score: 74,
    };
    expect(tachesACreer(e)).toEqual(['appel_commercial']);
    expect(tachesACreer({ ...e, offreCible: 'visibilite' })).toEqual([]);
    expect(tachesACreer({ ...e, score: 69 })).toEqual([]);
  });
  it('risque de résiliation : abonné sans connexion depuis 14 jours', () => {
    const e = { ...base, etape: 'premium' as const, depuis: T - 100 * J, score: 50 };
    expect(tachesACreer({ ...e, derniereConnexion: T - 14 * J })).toEqual(['risque_resiliation']);
    expect(tachesACreer({ ...e, derniereConnexion: T - 13 * J })).toEqual([]);
    expect(tachesACreer(e)).toEqual([]);
  });
  it('une tâche du même type au plus tous les 90 jours', () => {
    const e = { ...base, etape: 'compte_cree' as const, depuis: T - 20 * J, score: 50 };
    expect(tachesACreer({ ...e, dernieres: { appel_activation: T - 30 * J } })).toEqual([]);
    expect(tachesACreer({ ...e, dernieres: { appel_activation: T - 90 * J } })).toEqual([
      'appel_activation',
    ]);
  });
});
