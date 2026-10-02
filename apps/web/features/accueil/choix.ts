/** Listes du formulaire du hero (seules données de l'accueil envoyées au navigateur). */

/** Suggestion retenue (chip, liste ou meilleur résultat) : ce qu'il faut pour router la validation. */
export interface Retenue {
  id: string;
  libelle: string;
  prestation: string;
  metierId: string;
  score: number;
}

/**
 * Chips « Projets populaires » (ACC-02) : intentions de docs/data/recherche-intentions.json, disponibles
 * avant le chargement du moteur. Score maximal : choisies explicitement.
 */
export const PROJETS_POPULAIRES: (Retenue & { chip: string })[] = [
  {
    chip: 'Cuisine',
    id: 'cuisine-renovation',
    libelle: 'Rénovation de cuisine',
    prestation: 'cuisine',
    metierId: 'cuisiniste',
    score: 99,
  },
  {
    chip: 'Salle de bain',
    id: 'sdb-renovation',
    libelle: 'Rénovation de salle de bain',
    prestation: 'sdb',
    metierId: 'sdb',
    score: 99,
  },
  {
    chip: 'Peinture',
    id: 'peinture-interieure',
    libelle: 'Peinture intérieure',
    prestation: 'peinture',
    metierId: 'peintre',
    score: 99,
  },
  {
    chip: 'Électricité',
    id: 'elec-renovation',
    libelle: 'Rénovation électrique',
    prestation: 'elec',
    metierId: 'electricien',
    score: 99,
  },
  {
    chip: 'Isolation',
    id: 'isolation-combles',
    libelle: 'Isolation des combles',
    prestation: 'isolation',
    metierId: 'isolation',
    score: 99,
  },
];

/** Valeurs de `demandes.delaiSouhaite`. */
export const DELAIS = [
  { valeur: 'asap', libelle: 'Dès que possible' },
  { valeur: '1mois', libelle: 'Sous 1 mois' },
  { valeur: '3mois', libelle: 'Sous 3 mois' },
  { valeur: 'renseignement', libelle: 'Je me renseigne' },
] as const;
