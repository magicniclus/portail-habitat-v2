/** Changements de statut manuels d'un devis : accepté ou refusé après envoi, archivé à tout moment. */
const TRANSITIONS = {
  accepte: ['envoye'],
  refuse: ['envoye'],
  archive: ['brouillon', 'envoye', 'accepte', 'refuse', 'expire'],
} as const satisfies Record<string, readonly string[]>;

export type StatutDevisManuel = keyof typeof TRANSITIONS;

/** Le passage de `depuis` à `vers` est-il permis (serveur et liste de l'espace pro) ? */
export const transitionPermise = (depuis: string, vers: StatutDevisManuel) =>
  (TRANSITIONS[vers] as readonly string[]).includes(depuis);

/** Statuts proposés dans la liste pour un devis au statut `depuis`. */
export const statutsPossibles = (depuis: string): StatutDevisManuel[] =>
  (Object.keys(TRANSITIONS) as StatutDevisManuel[]).filter((v) => transitionPermise(depuis, v));
