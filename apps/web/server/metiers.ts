import 'server-only';
import donnees from '../../../docs/data/recherche-intentions.json';

const METIERS = donnees.metiers as Record<string, { id: string; nom: string }>;

/** Nom d'un métier (« plombier » → « Plombier ») ; l'identifiant s'il est inconnu. */
export const nomMetier = (id: string) => METIERS[id]?.nom ?? id;

/** Métiers proposés en filtre (maquette : 8), plus ceux déjà choisis dans l'URL. */
const PROPOSES = [
  'plombier',
  'electricien',
  'peintre',
  'carreleur',
  'menuisier',
  'chauffagiste',
  'couvreur',
  'macon',
];

export const metiersFiltre = (choisis: readonly string[]) =>
  [...new Set([...PROPOSES, ...choisis])]
    .filter((id) => METIERS[id])
    .map((id) => ({ id, nom: METIERS[id]!.nom }));
