/** Réponse de `/api/pro/site/publier` : version mise en ligne et points à revoir (sans blocage). */
export interface ResultatPublication {
  version: number;
  aVerifier: { page: string; ou: string; erreur: string }[];
}

/** Message affiché après « Publier » (page Mon site internet et éditeur). */
export function messagePublication(r: ResultatPublication): {
  ton: 'succes' | 'attention';
  texte: string;
} {
  const enLigne = 'Site publié : il est en ligne en moins d’une minute.';
  if (!r.aVerifier.length) return { ton: 'succes', texte: enLigne };
  const n = r.aVerifier.length;
  const detail = r.aVerifier
    .slice(0, 3)
    .map((p) => `${p.page}, ${p.ou} : ${p.erreur}`)
    .join(' ; ');
  return {
    ton: 'attention',
    texte: `${enLigne} ${n} point${n > 1 ? 's' : ''} à revoir quand vous voulez (${detail}${n > 3 ? '…' : ''}). Les liens incomplets ne sont pas cliquables sur le site.`,
  };
}
