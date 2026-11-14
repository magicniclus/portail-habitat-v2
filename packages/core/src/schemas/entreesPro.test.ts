import { describe, expect, it } from 'vitest';
import { entreeModifierFiche, entreeModifierRealisation } from './entreesPro';

describe('entreeModifierFiche', () => {
  it('accepte une section seule, et la chaîne vide pour retirer un champ', () => {
    expect(entreeModifierFiche.safeParse({ pitch: 'Couvreur depuis 20 ans' }).success).toBe(true);
    expect(entreeModifierFiche.safeParse({ siteWeb: '' }).success).toBe(true);
    expect(entreeModifierFiche.safeParse({ telephonePublic: '06 12 34 56 78' }).success).toBe(true);
  });

  it('adresse du siège : code postal à 5 chiffres et ville obligatoires, rue facultative', () => {
    const adresse = { ligne1: '3 rue des Lilas', codePostal: '33600', ville: 'Pessac' };
    expect(entreeModifierFiche.safeParse({ adresse }).success).toBe(true);
    expect(entreeModifierFiche.safeParse({ adresse: { ...adresse, ligne1: '' } }).success).toBe(
      true,
    );
    expect(
      entreeModifierFiche.safeParse({ adresse: { codePostal: '33600', ville: 'Pessac' } }).success,
    ).toBe(true);
    expect(
      entreeModifierFiche.safeParse({ adresse: { ...adresse, codePostal: '336' } }).success,
    ).toBe(false);
    expect(entreeModifierFiche.safeParse({ adresse: { ...adresse, ville: ' ' } }).success).toBe(
      false,
    );
  });

  it('refuse un envoi vide, un site non http, un devis inversé, un rayon hors 10–100 km', () => {
    expect(entreeModifierFiche.safeParse({}).success).toBe(false);
    expect(entreeModifierFiche.safeParse({ siteWeb: 'javascript:alert(1)' }).success).toBe(false);
    expect(
      entreeModifierFiche.safeParse({ devis: { minEuros: 5000, maxEuros: 1000 } }).success,
    ).toBe(false);
    expect(
      entreeModifierFiche.safeParse({
        zone: { centre: { latitude: 44.8, longitude: -0.6 }, rayonKm: 150 },
      }).success,
    ).toBe(false);
  });
});

describe('entreeModifierRealisation', () => {
  const base = {
    rid: 'a'.repeat(32),
    titre: 'Toiture à Mérignac',
    ville: 'Mérignac',
    description: 'Réfection complète.',
    conservees: ['artisans/a1/realisations/r/photo.jpg'],
    nouvelles: [],
  };
  const photo = { nomFichier: 'neuve.jpg', largeur: 800, hauteur: 600 };

  it('texte modifié, photos gardées : sans nouvel accord', () => {
    expect(entreeModifierRealisation.safeParse(base).success).toBe(true);
  });

  it('nouvelle photo : accord du propriétaire du chantier exigé', () => {
    expect(entreeModifierRealisation.safeParse({ ...base, nouvelles: [photo] }).success).toBe(
      false,
    );
    expect(
      entreeModifierRealisation.safeParse({
        ...base,
        nouvelles: [photo],
        autorisationProprietaire: true,
      }).success,
    ).toBe(true);
  });

  it('au moins une photo, 20 au plus', () => {
    expect(entreeModifierRealisation.safeParse({ ...base, conservees: [] }).success).toBe(false);
    const vingt = Array.from({ length: 20 }, (_, i) => `p${i}`);
    expect(
      entreeModifierRealisation.safeParse({
        ...base,
        conservees: vingt,
        nouvelles: [photo],
        autorisationProprietaire: true,
      }).success,
    ).toBe(false);
  });
});
