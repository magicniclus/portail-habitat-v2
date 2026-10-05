import { describe, expect, it } from 'vitest';
import { entreeResumeVisite } from './entreesComportement';

const valide = {
  v: 1,
  sessionId: 'abcdefgh12345678',
  vueId: '12345678abcdefgh',
  page: 'acquisition-artisans',
  app: 'pro',
  appareil: 'ordinateur',
  largeur: 1440,
  hauteur: 4200,
  source: 'google.com',
  nouvelle: true,
  duree: 42_000,
  profondeur: 65,
  cellulesClics: { '31:2': 1 },
  cellulesAttention: { '10:40': 1800 },
  sections: { hero: 9000, offres: 4000 },
  elements: { 'cta-hero': { survolMs: 1200, clics: 1, hesitations: 0 } },
  morts: ['hero>img:1'],
  rages: [],
  champs: { email: 3500 },
  abandon: 'email',
  sortie: { section: 'offres', type: 'fermeture', intention: true },
  trajet: [10, 20, 30, 40],
  replay: [[0, 0, 100, 200]],
} as const;

describe('entreeResumeVisite', () => {
  it('accepte un résumé complet', () => {
    expect(entreeResumeVisite.safeParse(valide).success).toBe(true);
  });

  it('refuse un champ inconnu (aucune donnée en plus, par exemple une valeur saisie)', () => {
    expect(entreeResumeVisite.safeParse({ ...valide, valeur: 'jean@x.fr' }).success).toBe(false);
  });

  it('refuse une clé qui ressemble à un email ou un texte libre', () => {
    expect(entreeResumeVisite.safeParse({ ...valide, morts: ['jean@x.fr'] }).success).toBe(false);
    expect(entreeResumeVisite.safeParse({ ...valide, champs: { 'mon texte': 10 } }).success).toBe(
      false,
    );
  });

  it('borne la taille des cartes', () => {
    const cellules = Object.fromEntries(Array.from({ length: 401 }, (_, i) => [`1:${i}`, 1]));
    expect(entreeResumeVisite.safeParse({ ...valide, cellulesClics: cellules }).success).toBe(
      false,
    );
  });

  it('impose une profondeur par paliers de 5 %', () => {
    expect(entreeResumeVisite.safeParse({ ...valide, profondeur: 63 }).success).toBe(false);
  });
});
