import { describe, expect, it } from 'vitest';
import { depuisRechercheEntreprises } from './api';

const brut = {
  siren: '552100554',
  nom_complet: 'BERTRAND RENOVATION (BERTRAND RENOV)',
  nom_raison_sociale: 'BERTRAND RENOVATION',
  activite_principale: '43.22A',
  date_creation: '2012-05-01',
  etat_administratif: 'A',
  siege: {
    siret: '55210055400013',
    numero_voie: '12',
    type_voie: 'RUE',
    libelle_voie: 'SAINTE-CATHERINE',
    code_postal: '33000',
    libelle_commune: 'BORDEAUX',
    latitude: '44.8378',
    longitude: '-0.5792',
  },
  matching_etablissements: [{ liste_enseignes: ['BERTRAND RENO'] }],
};

describe('API Recherche d’entreprises', () => {
  it('résultat complet', () => {
    expect(depuisRechercheEntreprises(brut)).toEqual({
      siren: '552100554',
      siret: '55210055400013',
      raisonSociale: 'BERTRAND RENOVATION',
      nomCommercial: 'BERTRAND RENO',
      codeNaf: '43.22A',
      dateCreation: '2012-05-01',
      fermee: false,
      adresse: {
        ligne1: '12 RUE SAINTE-CATHERINE',
        codePostal: '33000',
        ville: 'BORDEAUX',
        geo: { latitude: 44.8378, longitude: -0.5792 },
      },
    });
  });
  it('fermée, adresse en une ligne, sans coordonnées ni enseigne', () => {
    const r = depuisRechercheEntreprises({
      ...brut,
      nom_raison_sociale: null,
      etat_administratif: 'C',
      matching_etablissements: null,
      activite_principale: null,
      date_creation: null,
      siege: {
        siret: '55210055400013',
        adresse: '3 PLACE X',
        code_postal: '33000',
        libelle_commune: 'BORDEAUX',
      },
    });
    expect(r).toMatchObject({
      fermee: true,
      raisonSociale: 'BERTRAND RENOVATION (BERTRAND RENOV)',
      adresse: { ligne1: '3 PLACE X' },
    });
    expect(r).not.toHaveProperty('codeNaf');
    expect(r!.adresse).not.toHaveProperty('geo');
  });
  it('sans nom : SIREN ; sans adresse : écarté ; invalide : écarté', () => {
    expect(
      depuisRechercheEntreprises({ ...brut, nom_raison_sociale: null, nom_complet: null })!
        .raisonSociale,
    ).toBe('552100554');
    expect(depuisRechercheEntreprises({ ...brut, siege: { siret: '55210055400013' } })).toBeNull();
    expect(depuisRechercheEntreprises({ siren: 'x' })).toBeNull();
    expect(
      depuisRechercheEntreprises({
        ...brut,
        siege: { ...brut.siege, numero_voie: null, type_voie: null, libelle_voie: null },
      })!.adresse.ligne1,
    ).toBe('');
  });
});
