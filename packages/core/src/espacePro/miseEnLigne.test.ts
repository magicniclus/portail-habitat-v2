import { describe, expect, it } from 'vitest';
import { derniersStatutsDocuments, ficheDoitEtreEnLigne, peutRallumer } from './miseEnLigne';

const base = {
  sirenReconnu: true,
  verification: 'en_cours',
  statut: 'actif',
  horsLigneVolontaire: false,
} as const;

describe('ficheDoitEtreEnLigne (décision du 15/11/2026 : SIREN reconnu)', () => {
  it('SIREN reconnu, entreprise active : en ligne, même fiche vide et assurance non vérifiée', () => {
    expect(ficheDoitEtreEnLigne(base)).toBe(true);
    expect(ficheDoitEtreEnLigne({ ...base, verification: 'verifie' })).toBe(true);
    expect(ficheDoitEtreEnLigne({ ...base, verification: 'a_faire' })).toBe(true);
  });

  it('SIREN non contrôlé, refusé ou expiré : jamais en ligne', () => {
    expect(ficheDoitEtreEnLigne({ ...base, sirenReconnu: false })).toBe(false);
    expect(ficheDoitEtreEnLigne({ ...base, verification: 'refuse' })).toBe(false);
    expect(ficheDoitEtreEnLigne({ ...base, verification: 'expire' })).toBe(false);
  });

  it('entreprise suspendue ou fiche mise hors ligne par l’artisan : hors ligne', () => {
    expect(ficheDoitEtreEnLigne({ ...base, statut: 'suspendu' })).toBe(false);
    expect(ficheDoitEtreEnLigne({ ...base, statut: 'dereference' })).toBe(false);
    expect(ficheDoitEtreEnLigne({ ...base, horsLigneVolontaire: true })).toBe(false);
  });
});

describe('peutRallumer (interrupteur « Fiche en ligne »)', () => {
  it('ignore la mise hors ligne volontaire : seule la reconnaissance du SIREN compte', () => {
    expect(peutRallumer({ ...base, horsLigneVolontaire: true })).toBe(true);
    expect(peutRallumer({ ...base, sirenReconnu: false })).toBe(false);
    expect(peutRallumer({ ...base, statut: 'suspendu' })).toBe(false);
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
