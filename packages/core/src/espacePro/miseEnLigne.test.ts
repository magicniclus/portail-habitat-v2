import { describe, expect, it } from 'vitest';
import { derniersStatutsDocuments, doitPasserEnLigne } from './miseEnLigne';

const base = { enLigne: false, statut: 'actif', sirenVerifie: true, documents: {} };

describe('doitPasserEnLigne (COMPTES §3, ONB-06b)', () => {
  it('SIREN vérifié → en ligne, avec ou sans décennale (signalée « non vérifiée » sinon)', () => {
    expect(doitPasserEnLigne(base)).toBe(true);
    expect(doitPasserEnLigne({ ...base, documents: { decennale: 'en_attente' } })).toBe(true);
    expect(doitPasserEnLigne({ ...base, documents: { decennale: 'refuse' } })).toBe(true);
  });

  it('sans SIREN vérifié, le Kbis est exigé', () => {
    const e = { ...base, sirenVerifie: false };
    expect(doitPasserEnLigne({ ...e, documents: { decennale: 'en_attente' } })).toBe(false);
    expect(doitPasserEnLigne({ ...e, documents: { kbis: 'en_attente' } })).toBe(true);
    expect(doitPasserEnLigne({ ...e, documents: { kbis: 'refuse' } })).toBe(false);
  });

  it('déjà en ligne, suspendue ou supprimée : rien à faire', () => {
    const d = { decennale: 'en_attente' } as const;
    expect(doitPasserEnLigne({ ...base, enLigne: true, documents: d })).toBe(false);
    expect(doitPasserEnLigne({ ...base, statut: 'suspendu', documents: d })).toBe(false);
  });
});

describe('derniersStatutsDocuments', () => {
  it('le document le plus récent de chaque type fait foi', () => {
    expect(
      derniersStatutsDocuments([
        { type: 'decennale', statut: 'refuse', le: 1 },
        { type: 'decennale', statut: 'en_attente', le: 2 },
        { type: 'kbis', statut: 'valide', le: 1 },
      ]),
    ).toEqual({ decennale: 'en_attente', kbis: 'valide' });
  });
});
