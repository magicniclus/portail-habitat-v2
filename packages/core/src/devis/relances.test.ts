import { describe, expect, it } from 'vitest';
import {
  devisAExpirer,
  passeImpayee,
  relanceDevisDue,
  relanceFactureDue,
  relanceManuellePossible,
  type FactureARelancer,
} from './relances';

const J = 86_400_000;
const ECHEANCE = Date.UTC(2026, 9, 20, 10);
const facture = (x: Partial<FactureARelancer> = {}): FactureARelancer => ({
  type: 'facture',
  statut: 'emise',
  resteCentimes: 120_000,
  echeanceLe: new Date(ECHEANCE),
  relances: [],
  ...x,
});

describe('relances automatiques des factures (J−3, J+1, J+15)', () => {
  it('rien avant J−3, J−3 avant l’échéance, J+1 puis J+15 après', () => {
    expect(relanceFactureDue(facture(), ECHEANCE - 4 * J)).toBeNull();
    expect(relanceFactureDue(facture(), ECHEANCE - 3 * J)).toBe('j-3');
    expect(relanceFactureDue(facture(), ECHEANCE + J)).toBe('j+1');
    expect(relanceFactureDue(facture(), ECHEANCE + 15 * J)).toBe('j+15');
  });

  it('jamais deux fois la même, et une étape manquée laisse place à la suivante seulement', () => {
    const avecJ1 = facture({ relances: [{ le: new Date(ECHEANCE + J), type: 'j+1' }] });
    expect(relanceFactureDue(avecJ1, ECHEANCE + 2 * J)).toBeNull();
    expect(relanceFactureDue(avecJ1, ECHEANCE + 16 * J)).toBe('j+15');
    // Entre l'échéance et J+1, la relance « dans 3 jours » n'a plus de sens.
    expect(relanceFactureDue(facture(), ECHEANCE + 2 * 3600_000)).toBeNull();
    const toutes = facture({
      relances: ['j-3', 'j+1', 'j+15'].map((type) => ({ le: new Date(ECHEANCE), type })),
    });
    expect(relanceFactureDue(toutes, ECHEANCE + 40 * J)).toBeNull();
  });

  it('jamais deux relances le même jour (manuelle comprise)', () => {
    const manuelle = facture({ relances: [{ le: new Date(ECHEANCE + J), type: 'manuelle' }] });
    expect(relanceFactureDue(manuelle, ECHEANCE + J + 3600_000)).toBeNull();
    expect(relanceFactureDue(manuelle, ECHEANCE + 2 * J)).toBe('j+1');
    expect(relanceManuellePossible(manuelle, ECHEANCE + J + 3600_000)).toBe(false);
    expect(relanceManuellePossible(manuelle, ECHEANCE + 2 * J)).toBe(true);
  });

  it('payée, annulée par avoir, avoir, brouillon ou sans échéance : aucune relance', () => {
    const cas: Partial<FactureARelancer>[] = [
      { statut: 'payee', resteCentimes: 0 },
      { resteCentimes: 0 },
      { avoirId: 'av1' },
      { type: 'avoir' },
      { statut: 'brouillon' },
      { echeanceLe: undefined },
    ];
    for (const x of cas) {
      expect(relanceFactureDue(facture(x), ECHEANCE + J)).toBeNull();
      expect(relanceManuellePossible(facture(x), ECHEANCE + J)).toBe(false);
    }
    expect(relanceFactureDue(facture({ statut: 'impayee' }), ECHEANCE + 15 * J)).toBe('j+15');
    expect(relanceManuellePossible(facture({ echeanceLe: undefined, statut: 'emise' }), 0)).toBe(
      false,
    );
  });

  it('passe « impayée » le lendemain de l’échéance si un reste est dû', () => {
    expect(passeImpayee(facture(), ECHEANCE)).toBe(false);
    expect(passeImpayee(facture(), ECHEANCE + 1)).toBe(true);
    expect(passeImpayee(facture({ statut: 'partiellement_payee' }), ECHEANCE + 1)).toBe(true);
    expect(passeImpayee(facture({ statut: 'impayee' }), ECHEANCE + 1)).toBe(false);
    expect(passeImpayee(facture({ resteCentimes: 0 }), ECHEANCE + 1)).toBe(false);
    expect(passeImpayee(facture({ avoirId: 'x' }), ECHEANCE + 1)).toBe(false);
    expect(passeImpayee(facture({ echeanceLe: undefined }), ECHEANCE + 1)).toBe(false);
  });
});

describe('devis envoyés', () => {
  const envoye = {
    statut: 'envoye',
    envoiLe: new Date(ECHEANCE),
    validiteLe: new Date(ECHEANCE + 30 * J),
  };

  it('expire après la date de validité', () => {
    expect(devisAExpirer(envoye, ECHEANCE + 30 * J)).toBe(false);
    expect(devisAExpirer(envoye, ECHEANCE + 30 * J + 1)).toBe(true);
    expect(devisAExpirer({ ...envoye, statut: 'accepte' }, ECHEANCE + 40 * J)).toBe(false);
    expect(devisAExpirer({ statut: 'envoye' }, ECHEANCE + 40 * J)).toBe(false);
  });

  it('une seule relance du client à J+7, tant que le devis est valable', () => {
    expect(relanceDevisDue(envoye, ECHEANCE + 6 * J)).toBe(false);
    expect(relanceDevisDue(envoye, ECHEANCE + 7 * J)).toBe(true);
    expect(relanceDevisDue({ ...envoye, relanceLe: new Date() }, ECHEANCE + 8 * J)).toBe(false);
    expect(relanceDevisDue({ ...envoye, statut: 'refuse' }, ECHEANCE + 8 * J)).toBe(false);
    expect(relanceDevisDue(envoye, ECHEANCE + 31 * J)).toBe(false);
    expect(relanceDevisDue({ statut: 'envoye' }, ECHEANCE + 8 * J)).toBe(false);
    expect(
      relanceDevisDue({ statut: 'envoye', envoiLe: new Date(ECHEANCE) }, ECHEANCE + 8 * J),
    ).toBe(true);
  });
});
