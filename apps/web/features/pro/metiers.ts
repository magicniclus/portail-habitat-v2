import 'server-only';
import source from '../../../../docs/data/recherche-intentions.json';

/** Familles de métiers, dans l'ordre des listes déroulantes (maquette Acquisition Artisans v2). */
const FAMILLES = [
  ['sdb-cuisine', 'Salle de bain et cuisine'],
  ['deco', 'Peinture et décoration'],
  ['sols', 'Sols'],
  ['interieur', 'Aménagement intérieur'],
  ['gros-oeuvre', 'Gros œuvre et extension'],
  ['plomberie', 'Plomberie et eau'],
  ['chauffage', 'Chauffage et climatisation'],
  ['electricite', 'Électricité et énergie'],
  ['isolation', 'Isolation'],
  ['menuiseries', 'Menuiseries et fermetures'],
  ['toiture', 'Toiture et façade'],
  ['exterieur', 'Extérieur et jardin'],
  ['securite', 'Sécurité et accessibilité'],
  ['traitements', 'Diagnostics et traitements'],
  ['depannage', 'Dépannage et petits travaux'],
] as const;

export interface GroupeMetiers {
  nom: string;
  metiers: { id: string; nom: string }[];
}

const metiers = Object.values(
  (source as unknown as { metiers: Record<string, { id: string; nom: string; famille: string }> })
    .metiers,
);

/** Métiers groupés par famille, triés par nom (listes `<optgroup>` natives, MOBILE §5). */
export function groupesMetiers(): GroupeMetiers[] {
  return FAMILLES.map(([id, nom]) => ({
    nom,
    metiers: metiers
      .filter((m) => m.famille === id)
      .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
      .map((m) => ({ id: m.id, nom: m.nom })),
  })).filter((g) => g.metiers.length > 0);
}

export const nomMetier = (id: string) => metiers.find((m) => m.id === id)?.nom;
