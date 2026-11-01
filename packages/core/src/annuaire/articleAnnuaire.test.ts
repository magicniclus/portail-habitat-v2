import { describe, expect, it } from 'vitest';
import { articleAnnuaire } from './articleAnnuaire';

describe('articleAnnuaire (texte des pages métier × ville et travaux × ville)', () => {
  it('métier à une ville : titre, artisans trouvés, travaux du métier, conseils', () => {
    const a = articleAnnuaire({
      ville: 'Bordeaux',
      rayonKm: 20,
      nbArtisans: 3,
      metier: { nom: 'Plombier', prestations: ['Chauffe-eau', 'Douche à l’italienne', 'Fuite'] },
    })!;
    expect(a.titre).toBe('Trouver un plombier à Bordeaux');
    expect(a.paragraphes[0]).toContain('3 artisans');
    expect(a.paragraphes.join(' ')).toContain('chauffe-eau, douche à l’italienne et fuite');
    expect(a.paragraphes.at(-1)).toContain('assurance');
  });

  it('aucun artisan : le dire, et proposer de déposer son projet', () => {
    const a = articleAnnuaire({
      ville: 'Sadirac',
      rayonKm: 20,
      nbArtisans: 0,
      metier: { nom: 'Entreprise générale de rénovation', prestations: [] },
    })!;
    expect(a.titre).toBe('Trouver une entreprise générale de rénovation à Sadirac');
    expect(a.paragraphes[0]).toContain('Aucun artisan inscrit');
  });

  it('travaux à une ville : présentation et prix repère du simulateur', () => {
    const a = articleAnnuaire({
      ville: 'Bordeaux',
      rayonKm: 20,
      nbArtisans: 1,
      prestation: {
        nom: 'Douche à l’italienne',
        pitch: 'Remplacement de baignoire',
        repere: 'dès 3 500 €',
      },
    })!;
    expect(a.titre).toBe('Douche à l’italienne à Bordeaux');
    expect(a.paragraphes.join(' ')).toContain('dès 3 500 €');
    expect(a.paragraphes.join(' ')).toContain('1 artisan ');
  });

  it('sans ville ni sujet : pas d’article', () => {
    expect(articleAnnuaire({ ville: '', rayonKm: 20, nbArtisans: 0 })).toBeNull();
  });
});
