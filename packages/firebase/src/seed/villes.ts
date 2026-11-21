/** Villes du jeu de données (centres approximatifs des communes, Gironde). */
export interface VilleSeed {
  nom: string;
  codePostal: string;
  geo: { latitude: number; longitude: number };
}

export const VILLES: readonly VilleSeed[] = [
  { nom: 'Bordeaux', codePostal: '33000', geo: { latitude: 44.8378, longitude: -0.5792 } },
  { nom: 'Cenon', codePostal: '33150', geo: { latitude: 44.8571, longitude: -0.5312 } },
  { nom: 'Lormont', codePostal: '33310', geo: { latitude: 44.8792, longitude: -0.5217 } },
  { nom: 'Floirac', codePostal: '33270', geo: { latitude: 44.8361, longitude: -0.5278 } },
  {
    nom: 'Ambarès-et-Lagrave',
    codePostal: '33440',
    geo: { latitude: 44.9253, longitude: -0.4853 },
  },
  {
    nom: 'Artigues-près-Bordeaux',
    codePostal: '33370',
    geo: { latitude: 44.8603, longitude: -0.4925 },
  },
  { nom: 'Bassens', codePostal: '33530', geo: { latitude: 44.9019, longitude: -0.5172 } },
  { nom: 'Carbon-Blanc', codePostal: '33560', geo: { latitude: 44.8944, longitude: -0.505 } },
  { nom: 'Bouliac', codePostal: '33270', geo: { latitude: 44.8172, longitude: -0.5031 } },
  { nom: 'Ambès', codePostal: '33810', geo: { latitude: 45.0114, longitude: -0.5311 } },
  {
    nom: 'Saint-Louis-de-Montferrand',
    codePostal: '33440',
    geo: { latitude: 44.9561, longitude: -0.5372 },
  },
  {
    nom: 'Saint-Vincent-de-Paul',
    codePostal: '33440',
    geo: { latitude: 44.9633, longitude: -0.4633 },
  },
  { nom: 'Mérignac', codePostal: '33700', geo: { latitude: 44.8386, longitude: -0.6436 } },
  { nom: 'Pessac', codePostal: '33600', geo: { latitude: 44.8067, longitude: -0.6311 } },
  { nom: 'Bègles', codePostal: '33130', geo: { latitude: 44.8086, longitude: -0.5478 } },
];

export const villeParNom = (nom: string) =>
  VILLES.find((v) => nom.startsWith(v.nom.split('-')[0]!)) ?? VILLES[0]!;

/** Métiers des fiches de démonstration de l'annuaire → identifiants du référentiel. */
export const METIER_DEMO: Record<string, string> = {
  Plomberie: 'plombier',
  Électricité: 'electricien',
  Peinture: 'peintre',
  Carrelage: 'carreleur',
  Menuiserie: 'menuisier',
  Chauffage: 'chauffagiste',
  Couverture: 'couvreur',
  Maçonnerie: 'macon',
};

export const PRENOMS = [
  'Camille',
  'Léa',
  'Hugo',
  'Louis',
  'Chloé',
  'Emma',
  'Lucas',
  'Manon',
  'Nathan',
  'Inès',
  'Jules',
  'Sarah',
  'Paul',
  'Zoé',
  'Arthur',
  'Julie',
  'Théo',
  'Clara',
  'Antoine',
  'Pauline',
];
export const NOMS = [
  'Martin',
  'Bernard',
  'Dubois',
  'Lambert',
  'Roussel',
  'Garcia',
  'Fontaine',
  'Moreau',
  'Laurent',
  'Girard',
  'Bonnet',
  'Dupuy',
  'Lefèvre',
  'Mercier',
  'Blanc',
  'Guérin',
  'Faure',
  'Rousseau',
];
export const ENSEIGNES = [
  'Atelier',
  'Rénovation',
  'Habitat',
  'Services',
  'Bâtiment',
  'Artisans',
  'Maison',
  'Confort',
];
