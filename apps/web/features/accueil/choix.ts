/** Listes du formulaire du hero (seules données de l'accueil envoyées au navigateur). */

/** Chips « Projets populaires » (ACC-02) : prestation du simulateur associée (docs/data/prestations.json). */
export const PROJETS_POPULAIRES = [
  { libelle: 'Cuisine', prestation: 'cuisine' },
  { libelle: 'Salle de bain', prestation: 'sdb' },
  { libelle: 'Peinture', prestation: 'peinture' },
  { libelle: 'Électricité', prestation: 'elec' },
  { libelle: 'Isolation', prestation: 'isolation' },
] as const;

/** Valeurs de `demandes.delaiSouhaite`. */
export const DELAIS = [
  { valeur: 'asap', libelle: 'Dès que possible' },
  { valeur: '1mois', libelle: 'Sous 1 mois' },
  { valeur: '3mois', libelle: 'Sous 3 mois' },
  { valeur: 'renseignement', libelle: 'Je me renseigne' },
] as const;
