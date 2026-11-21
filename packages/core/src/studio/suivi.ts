import type { StatutProjetStudio } from './catalogue';

const MIN = 60_000;

/**
 * Suivi de la fabrication (STUDIO.md §6) : ce que fait chaque étape, sa durée habituelle et le
 * délai au-delà duquel on la considère bloquée (affichage « Relancer », accepté côté serveur).
 * Claude monte AVANT les captures : c'est le montage qui choisit les écrans à filmer.
 */
export const ETAPES_SUIVI = {
  transcription: {
    explication: 'Le robot écoute la voix et note chaque mot avec son moment exact.',
    habituel: '1 à 3 min',
    maxMs: 20 * MIN,
  },
  montage: {
    explication:
      'Claude choisit les meilleurs passages, l’ordre, les textes animés et les écrans de Portail Travaux à montrer. Les captures viennent ensuite : le robot ne filme que les écrans choisis ici.',
    habituel: '1 à 4 min',
    maxMs: 12 * MIN,
  },
  captures: {
    explication:
      'Le robot ouvre Portail Travaux sur l’artisan d’exemple et filme les écrans choisis par le montage.',
    habituel: '2 à 5 min',
    maxMs: 20 * MIN,
  },
  rendu: {
    explication:
      'Le robot assemble la voix, les images, les textes animés, les sous-titres et la musique.',
    habituel: '2 à 6 min',
    maxMs: 30 * MIN,
  },
} as const satisfies Partial<
  Record<StatutProjetStudio, { explication: string; habituel: string; maxMs: number }>
>;
export type EtapeSuivie = keyof typeof ETAPES_SUIVI;

export const estEtapeSuivie = (s: StatutProjetStudio): s is EtapeSuivie => s in ETAPES_SUIVI;

/**
 * Étapes affichées pour une prise : seule une voix enregistrée (`p…`) passe par la
 * transcription ; une voix IA (`v…`, mots horodatés par ElevenLabs) ou « Claude fait tout »
 * (`m…`, sans voix) va droit au montage.
 */
export function etapesFabrication(priseId: string): StatutProjetStudio[] {
  return [
    ...(priseId.startsWith('p') ? (['transcription'] as const) : []),
    'montage',
    'captures',
    'rendu',
    'pret',
  ];
}

/** L'étape en cours depuis `depuisMs` a dépassé sa durée maximale. */
export function etapeBloquee(
  statut: StatutProjetStudio,
  depuisMs: number,
  maintenant: number,
): boolean {
  return estEtapeSuivie(statut) && maintenant - depuisMs > ETAPES_SUIVI[statut].maxMs;
}
