import { describe, expect, it } from 'vitest';
import { seoFiche } from './seoFiche';

const base = {
  nom: 'Nicolas Castera',
  metier: { id: 'entreprise-generale', nom: 'Entreprise générale de rénovation' },
  ville: 'Carignan-de-Bordeaux',
  nbAvis: 0,
  note: 0,
  villesProches: ['Bordeaux', 'Sadirac', 'Tresses', 'Carignan-de-Bordeaux'],
  autresMetiers: [
    { id: 'plombier', nom: 'Plombier' },
    { id: 'entreprise-generale', nom: 'Entreprise générale de rénovation' },
    { id: 'electricien', nom: 'Électricien' },
  ],
  prestations: [{ id: 'sdb-douche', nom: 'Douche à l’italienne' }],
};

describe('seoFiche (bas de fiche publique)', () => {
  it('trois paragraphes rédigés depuis les données de la fiche, sans chiffre inventé', () => {
    const s = seoFiche(base);
    expect(s.paragraphes.map((p) => p.titre)).toEqual([
      'Trouvez une entreprise générale de rénovation pour votre projet à Carignan-de-Bordeaux',
      'Lisez les avis de particuliers à Carignan-de-Bordeaux et alentour',
      'Contactez une entreprise générale de rénovation gratuitement et sans engagement',
    ]);
    expect(s.paragraphes[1]!.texte).toContain('vérifié avant publication');
    expect(s.paragraphes[1]!.texte).not.toMatch(/\d+ avis/);
  });

  it('avis réels cités quand il y en a (note à une décimale)', () => {
    const s = seoFiche({ ...base, nbAvis: 13, note: 4.96 });
    expect(s.paragraphes[1]!.texte).toContain('13 avis vérifiés');
    expect(s.paragraphes[1]!.texte).toContain('5,0/5');
  });

  it('liens : communes voisines (sans la sienne), autres métiers à la ville, prestations', () => {
    const s = seoFiche(base);
    expect(s.villes.liens.map((l) => l.libelle)).toEqual([
      'Entreprise générale de rénovation à Bordeaux',
      'Entreprise générale de rénovation à Sadirac',
      'Entreprise générale de rénovation à Tresses',
    ]);
    expect(s.villes.liens[0]).toMatchObject({ metier: 'entreprise-generale', ville: 'Bordeaux' });
    expect(s.metiers.liens.map((l) => l.libelle)).toEqual([
      'Plombier à Carignan-de-Bordeaux',
      'Électricien à Carignan-de-Bordeaux',
    ]);
    expect(s.services.liens).toEqual([
      {
        libelle: 'Douche à l’italienne à Carignan-de-Bordeaux',
        prestation: 'sdb-douche',
        nom: 'Douche à l’italienne',
        ville: 'Carignan-de-Bordeaux',
      },
    ]);
  });
});
