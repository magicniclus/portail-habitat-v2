/** Réponse de `/api/pro/site/publier` : version mise en ligne et points à revoir (sans blocage). */
export interface ResultatPublication {
  version: number;
  aVerifier: { page: string; ou: string; erreur: string }[];
}

/**
 * Message affiché après « Publier » dans l'éditeur : une confirmation, sans liste d'erreurs
 * techniques (les champs à revoir sont signalés là où on les modifie, et un lien incomplet n'est
 * simplement pas cliquable sur le site).
 */
export function messagePublication(_r: ResultatPublication): { ton: 'succes'; texte: string } {
  return { ton: 'succes', texte: 'Site publié : il est en ligne en moins d’une minute.' };
}
