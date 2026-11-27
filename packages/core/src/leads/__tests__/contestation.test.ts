import { describe, expect, it } from 'vitest';
import {
  DELAI_CONTESTATION_MS,
  SEUIL_LEAD_DOUTEUX,
  creditsARembourser,
  examinerContestation,
  leadDouteux,
} from '../contestation';

const J = 86_400_000;
const base = { debloqueLe: 0, maintenant: 2 * J, motif: 'faux_numero' as const };

describe('contestations (DATABASE §5, CGV Pro §1 bis)', () => {
  it('ouverte sous 7 jours, refusée au-delà', () => {
    expect(examinerContestation(base)).toEqual({ etat: 'ouverte' });
    expect(examinerContestation({ ...base, maintenant: DELAI_CONTESTATION_MS + 1 })).toEqual({
      etat: 'hors_delai',
    });
  });
  it('« hors zone » refusé automatiquement si le chantier est dans le rayon', () => {
    const zone = { distanceKm: 12, rayonKm: 30 };
    expect(examinerContestation({ ...base, motif: 'hors_zone', ...zone })).toEqual({
      etat: 'refusee_auto',
      raison: expect.stringContaining('30 km'),
    });
    expect(
      examinerContestation({ ...base, motif: 'hors_zone', distanceKm: 45, rayonKm: 30 }),
    ).toEqual({ etat: 'ouverte' });
    expect(examinerContestation({ ...base, motif: 'hors_zone' })).toEqual({ etat: 'ouverte' });
  });
  it('crédits rendus : ceux payés, ou la valeur du paiement par carte', () => {
    expect(creditsARembourser({ moyen: 'credits', credits: 2, prixHtCentimes: 0 }, 1000)).toBe(2);
    expect(creditsARembourser({ moyen: 'carte', credits: 0, prixHtCentimes: 1900 }, 1000)).toBe(2);
    expect(creditsARembourser({ moyen: 'offert_admin', credits: 0, prixHtCentimes: 0 }, 1000)).toBe(
      0,
    );
  });
  it('lead douteux au-delà de 3 contestations acceptées', () => {
    expect(leadDouteux(SEUIL_LEAD_DOUTEUX)).toBe(false);
    expect(leadDouteux(SEUIL_LEAD_DOUTEUX + 1)).toBe(true);
  });
});
