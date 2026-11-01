import { describe, expect, it } from 'vitest';
import { articleAnnuaire, faqAnnuaire } from './articleAnnuaire';

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

describe('faqAnnuaire (questions de la page, données structurées FAQPage)', () => {
  it('métier : choisir, contact gratuit, délais ; jamais de prix inventé', () => {
    const f = faqAnnuaire({ ville: 'Bordeaux', metier: { nom: 'Plombier', prestations: [] } });
    expect(f.map((x) => x.q)).toEqual([
      'Comment choisir un plombier à Bordeaux ?',
      'Contacter un plombier sur Portail Travaux est-il gratuit ?',
      'Que faire si aucun artisan ne correspond à mon projet ?',
    ]);
    expect(f[1]!.r).toContain('gratuit');
    expect(f.map((x) => x.r).join(' ')).not.toMatch(/\d+\s?€/);
  });

  it('travaux : le prix repère du simulateur est cité comme estimation', () => {
    const f = faqAnnuaire({
      ville: 'Bordeaux',
      prestation: { nom: 'Douche à l’italienne', pitch: 'x', repere: 'dès 3 500 €' },
    });
    expect(f[0]).toEqual({
      q: 'Combien coûte « douche à l’italienne » à Bordeaux ?',
      r: expect.stringContaining('dès 3 500 €'),
    });
  });
});
