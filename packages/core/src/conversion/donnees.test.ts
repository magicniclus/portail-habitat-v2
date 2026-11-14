import { describe, expect, it } from 'vitest';
import { preparerDonnees } from './donnees';

const base = {
  nomCommercial: 'Bertrand',
  metier: 'plombier',
  ville: 'Bordeaux',
  lien: 'https://x/pro',
  signataire: 'Julie',
};

describe('pas de chiffre, pas d’envoi (CONVERSION §1.2)', () => {
  it('vis-position exige vues, position et comparaison', () => {
    expect(preparerDonnees('vis-position', { ...base, offre: 'visibilite' })).toEqual({
      ok: false,
      manque: 'vues7j',
    });
    expect(
      preparerDonnees('vis-position', {
        ...base,
        offre: 'visibilite',
        vues7j: 31,
        position: 14,
        total: 22,
        vuesMisesEnAvant: 312,
      }),
    ).toMatchObject({ ok: true, donnees: { vues7j: 31, position: 14 } });
    expect(
      preparerDonnees('vis-position', {
        ...base,
        offre: 'visibilite',
        vues7j: 0,
        position: 14,
        total: 22,
        vuesMisesEnAvant: 312,
      }),
    ).toEqual({ ok: false, manque: 'vues7j' });
  });
  it('offres : un code personnel est indispensable', () => {
    expect(preparerDonnees('vis-offre-lancement', base)).toEqual({ ok: false, manque: 'code' });
    expect(
      preparerDonnees('vis-offre-lancement', {
        ...base,
        code: 'JULIEN30',
        pourcentage: 30,
        expire: 'jeudi',
      }),
    ).toMatchObject({ ok: true });
  });
  it('emails sans chiffre requis : passage à l’année, email humain', () => {
    expect(preparerDonnees('passage-annuel', base)).toMatchObject({ ok: true });
    expect(preparerDonnees('reconquete-2', base)).toMatchObject({ ok: true });
  });
  it('modèle inconnu du moteur : refusé', () => {
    expect(preparerDonnees('recu', base)).toEqual({ ok: false, manque: 'modele' });
  });
});
