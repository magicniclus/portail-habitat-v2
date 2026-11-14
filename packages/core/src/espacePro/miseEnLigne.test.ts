import { describe, expect, it } from 'vitest';
import { derniersStatutsDocuments, doitPasserEnLigne } from './miseEnLigne';

const base = { enLigne: false, statut: 'actif', completude: 100, horsLigneVolontaire: false };

describe('doitPasserEnLigne (logo, description, bannière faits)', () => {
  it('fiche complète → en ligne automatiquement', () => {
    expect(doitPasserEnLigne(base)).toBe(true);
  });

  it('incomplète, mise hors ligne par l’artisan, déjà en ligne ou suspendue : non', () => {
    expect(doitPasserEnLigne({ ...base, completude: 65 })).toBe(false);
    expect(doitPasserEnLigne({ ...base, horsLigneVolontaire: true })).toBe(false);
    expect(doitPasserEnLigne({ ...base, enLigne: true })).toBe(false);
    expect(doitPasserEnLigne({ ...base, statut: 'suspendu' })).toBe(false);
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
