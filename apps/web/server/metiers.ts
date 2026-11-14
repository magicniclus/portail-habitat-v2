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

const FAMILLES_METIERS = donnees.metiers as Record<string, { famille?: string }>;

/** Métiers les plus recherchés (liens « Autres artisans à … » du bas de fiche). */
export const metiersPopulaires = () => metiersFiltre([]);

/** Prestations du simulateur de la famille du métier (« Travaux souvent demandés »). */
export async function prestationsDuMetier(id: string): Promise<{ id: string; nom: string }[]> {
  const famille = FAMILLES_METIERS[id]?.famille;
  if (!famille) return [];
  const { default: catalogue } = await import('../../../docs/data/prestations-catalogue.json');
  return (catalogue.prestations as { id: string; nom: string; famille: string }[])
    .filter((p) => p.famille === famille)
    .map(({ id: pid, nom }) => ({ id: pid, nom }));
}

/** Prestation du simulateur dont le nom est exactement la recherche (pages « travaux à … »). */
export async function prestationParNom(
  q: string,
): Promise<{ id: string; nom: string; pitch: string; repere: string } | null> {
  const cle = q.trim().toLowerCase();
  if (!cle) return null;
  const { default: catalogue } = await import('../../../docs/data/prestations-catalogue.json');
  const p = (
    catalogue.prestations as { id: string; nom: string; pitch: string; repere: string }[]
  ).find((x) => x.nom.toLowerCase() === cle);
  return p ? { id: p.id, nom: p.nom, pitch: p.pitch, repere: p.repere } : null;
}
