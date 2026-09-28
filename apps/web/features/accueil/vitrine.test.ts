import { describe, expect, it } from 'vitest';
import { choisirInspirations, choisirTemoignages, chiffresVitrine, initiales } from './vitrine';

const avis = (n: number, o: Partial<Parameters<typeof choisirTemoignages>[0][number]> = {}) => ({
  id: `a${n}`,
  nomAffiche: 'Camille M.',
  note: 5,
  texte: 'Très bon travail, chantier propre et délais respectés du début à la fin.',
  typeTravaux: 'Salle de bain',
  photos: [] as { url: string }[],
  ville: 'Bordeaux',
  ...o,
});

describe('témoignages (D49)', () => {
  it('3 avis réels notés 4 ou 5 avec un texte suffisant ; sinon rien', () => {
    const liste = [
      avis(1),
      avis(2, { note: 3 }),
      avis(3, { texte: 'Bien.' }),
      avis(4, { note: 4 }),
      avis(5),
      avis(6),
    ];
    expect(choisirTemoignages(liste).map((t) => t.id)).toEqual(['a1', 'a4', 'a5']);
    expect(choisirTemoignages(liste.slice(0, 3))).toEqual([]);
  });
  it('texte entre guillemets français, initiales et projet', () => {
    const [t] = choisirTemoignages([avis(1), avis(2), avis(3)]);
    expect(t).toMatchObject({
      initiales: 'CM',
      nom: 'Camille M.',
      projet: 'Salle de bain · Bordeaux',
    });
    expect(t!.texte).toMatch(/^« .+ »$/);
  });
});

describe('inspirations (D49)', () => {
  it('4 avis avec photo, sans budget ; sinon rien', () => {
    const p = [{ url: 'https://x/1.jpg' }];
    const liste = [1, 2, 3, 4, 5].map((n) => avis(n, { photos: n === 2 ? [] : p }));
    expect(choisirInspirations(liste).map((i) => i.id)).toEqual(['a1', 'a3', 'a4', 'a5']);
    expect(choisirInspirations(liste.slice(0, 3))).toEqual([]);
    expect(choisirInspirations(liste)[0]).toEqual({
      id: 'a1',
      titre: 'Salle de bain',
      detail: 'Bordeaux',
      photo: 'https://x/1.jpg',
    });
  });
});

describe('chiffres (ACC-01)', () => {
  it('libellés depuis stats/public ; rien sans document', () => {
    expect(
      chiffresVitrine({
        nbDemandesMois: 2400,
        nbArtisans: 3200,
        nbVilles: 420,
        noteMoyenneGlobale: 4.8,
        nbAvisTotal: 2140,
      }),
    ).toEqual({
      demandes: '2 400',
      artisans: '3 200',
      villes: '420',
      note: '4,8',
      avis: '2 000+',
      avisExact: '2 140',
    });
    expect(chiffresVitrine(null)).toBeNull();
  });
  it('pas de note affichée sous 10 avis', () => {
    expect(
      chiffresVitrine({
        nbDemandesMois: 1,
        nbArtisans: 1,
        nbVilles: 1,
        noteMoyenneGlobale: 5,
        nbAvisTotal: 9,
      })!.note,
    ).toBeNull();
  });
  it('initiales', () => {
    expect(initiales('Camille M.')).toBe('CM');
    expect(initiales('Léa')).toBe('L');
    expect(initiales('jean-pierre dupont')).toBe('JD');
  });
});
