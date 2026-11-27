import { describe, expect, it } from 'vitest';
import {
  contexteRedaction,
  demandeRecherche,
  faitsDuTexteConnus,
  faitsVerifies,
  lireFaitsRecherche,
  nombresDonnees,
  type DonneesTexte,
} from './redaction';

const D: DonneesTexte = {
  metier: 'Plombier',
  prestations: ['Remplacement de chauffe-eau', 'Salle de bains'],
  ville: 'Cenon',
  codePostal: '33150',
  departement: '33',
  population: 24_000,
  nbArtisans: 3,
  rayonKm: 20,
  voisines: ['Lormont', 'Floirac'],
};
const INSEE = 'https://www.insee.fr/fr/statistiques/2011101?geo=COM-33119';

describe('faits de la recherche web', () => {
  it('garde seulement les faits dont la source a vraiment été trouvée (www et / final ignorés)', () => {
    const r = faitsVerifies(
      [
        { texte: 'Fait A', source: 'https://insee.fr/fr/statistiques/2011101/' },
        { texte: 'Fait B', source: 'https://inventee.example/page' },
        { texte: 'Fait A', source: INSEE },
        { texte: 'Fait C', source: 'pas une adresse' },
      ],
      [INSEE],
    );
    expect(r.map((f) => f.texte)).toEqual(['Fait A']);
  });

  it('lit le JSON de la réponse, même entouré de texte ; ignore le reste', () => {
    expect(
      lireFaitsRecherche(`Voici : {"faits":[{"texte":" Fait ","source":"${INSEE}"},{"x":1}]} fin`),
    ).toEqual([{ texte: 'Fait', source: INSEE }]);
    expect(lireFaitsRecherche('aucun JSON')).toEqual([]);
    expect(lireFaitsRecherche('{"faits": 3}')).toEqual([]);
    expect(lireFaitsRecherche('{ cassé }')).toEqual([]);
  });

  it('le texte ne cite que des sources issues de la recherche', () => {
    const t = { intro: '', sections: [], faq: [], faits: [{ texte: 'x', source: INSEE }] };
    expect(faitsDuTexteConnus(t, [{ texte: 'x', source: INSEE }])).toBe(true);
    expect(faitsDuTexteConnus(t, [])).toBe(false);
  });
});

describe('demandes à l’IA', () => {
  it('contexte : nos données et les faits, sans ligne vide inutile', () => {
    const c = contexteRedaction(D, [{ texte: 'Fait A', source: INSEE }]);
    expect(c).toContain('Population : 24000 habitants');
    expect(c).toContain('dans un rayon de 20 km : 3');
    expect(c).toContain('Lormont, Floirac');
    expect(c).toContain(`- Fait A (${INSEE})`);
    const vide = contexteRedaction({ ...D, prestations: [], voisines: [] }, []);
    expect(vide).toContain('- (aucun)');
    expect(vide).not.toContain('Communes voisines');
  });

  it('recherche ciblée sur la commune et le métier ; chiffres de nos données autorisés', () => {
    expect(demandeRecherche(D)).toBe('Métier : Plombier. Commune : Cenon (33150, département 33).');
    expect(nombresDonnees(D)).toEqual([24_000, 3, 20]);
  });
});
