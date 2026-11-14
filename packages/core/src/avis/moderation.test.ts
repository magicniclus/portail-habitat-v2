import { describe, expect, it } from 'vitest';
import { moyenneApres, niveauRisque, scoreRisqueAvis, textesProches } from './moderation';

describe('modération des avis (ADMIN §2.6)', () => {
  it('score de risque : somme des signaux, plafonnée à 100, avec les raisons', () => {
    expect(scoreRisqueAvis({})).toEqual({ score: 0, raisons: [] });
    const r = scoreRisqueAvis({
      compteRecent: true,
      memeIp: 2,
      texteDuplique: true,
      lienArtisan: true,
      sansPreuve: true,
    });
    expect(r.score).toBe(100);
    expect(r.raisons).toContain('Même adresse IP que 2 autres avis');
    expect(scoreRisqueAvis({ sansPreuve: true }).score).toBe(10);
  });
  it('niveaux : faible, moyen, élevé', () => {
    expect(niveauRisque(10)).toBe('faible');
    expect(niveauRisque(25)).toBe('moyen');
    expect(niveauRisque(50)).toBe('eleve');
  });
  it('textes proches : mots communs, casse et ponctuation ignorées', () => {
    expect(
      textesProches(
        'Parfait ! Très professionnel, je recommande.',
        'parfait, très professionnel je recommande',
      ),
    ).toBe(true);
    expect(textesProches('Bon travail sur les combles', 'Salle de bain magnifique')).toBe(false);
    expect(textesProches('', '')).toBe(false);
  });
  it('moyenne recalculée à la publication et au retrait', () => {
    expect(moyenneApres({ moyenne: 0, nb: 0 }, 4, 'ajout')).toEqual({ moyenne: 4, nb: 1 });
    expect(moyenneApres({ moyenne: 4, nb: 1 }, 5, 'ajout')).toEqual({ moyenne: 4.5, nb: 2 });
    expect(moyenneApres({ moyenne: 4.5, nb: 2 }, 5, 'retrait')).toEqual({ moyenne: 4, nb: 1 });
    expect(moyenneApres({ moyenne: 4, nb: 1 }, 4, 'retrait')).toEqual({ moyenne: 0, nb: 0 });
    expect(moyenneApres({ moyenne: 4.33, nb: 3 }, 4, 'ajout').moyenne).toBe(4.25);
  });
});
