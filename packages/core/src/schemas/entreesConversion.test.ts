import { describe, expect, it } from 'vitest';
import {
  entreeActionCycle,
  entreeSequenceAdmin,
  entreeSupprimerSequence,
} from './entreesConversion';

const motif = 'Test de la séquence';

describe('entrées Admin › Conversion', () => {
  it('séquence : identifiant en majuscules, au moins une étape', () => {
    const base = {
      nom: 'Relance test',
      etapeEntree: 'gratuit_actif',
      objectif: '1er paiement',
      actif: false,
      etapes: [{ modele: 'vis-position', declencheur: 'delai', valeur: 3 }],
      motif,
    };
    expect(entreeSequenceAdmin.safeParse({ ...base, id: 'S10' }).success).toBe(true);
    expect(entreeSequenceAdmin.safeParse({ ...base, id: 's10' }).success).toBe(false);
    expect(entreeSequenceAdmin.safeParse({ ...base, etapes: [] }).success).toBe(false);
  });
  it('suppression : identifiant retapé et destination si bascule', () => {
    const ok = { id: 'S4', confirmation: 'S4', devenir: 'arret', motif };
    expect(entreeSupprimerSequence.safeParse(ok).success).toBe(true);
    expect(entreeSupprimerSequence.safeParse({ ...ok, confirmation: 'S5' }).success).toBe(false);
    expect(entreeSupprimerSequence.safeParse({ ...ok, devenir: 'bascule' }).success).toBe(false);
    expect(
      entreeSupprimerSequence.safeParse({ ...ok, devenir: 'bascule', versSequence: 'S4' }).success,
    ).toBe(false);
    expect(
      entreeSupprimerSequence.safeParse({ ...ok, devenir: 'bascule', versSequence: 'S5' }).success,
    ).toBe(true);
  });
  it('fiche cycle : forcer demande une séquence', () => {
    expect(entreeActionCycle.safeParse({ action: 'pause', artisanId: 'a1', motif }).success).toBe(
      true,
    );
    expect(entreeActionCycle.safeParse({ action: 'forcer', artisanId: 'a1', motif }).success).toBe(
      false,
    );
  });
});
