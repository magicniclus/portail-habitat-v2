/** Champs du formulaire de contact des sites (DATABASE §15 bis, `sites/{id}/formulaire`). */
export const TYPES_CHAMP = [
  'texte',
  'email',
  'tel',
  'cp',
  'liste',
  'choix',
  'zone',
  'date',
  'photos',
  'budget',
] as const;
export type TypeChamp = (typeof TYPES_CHAMP)[number];

/** Libellés du constructeur de champs (Site Pro). */
export const LIBELLES_TYPE_CHAMP: Record<TypeChamp, string> = {
  texte: 'Texte court',
  email: 'Email',
  tel: 'Téléphone',
  cp: 'Code postal',
  liste: 'Liste déroulante',
  choix: 'Choix multiple',
  zone: 'Texte long',
  date: 'Date',
  photos: 'Photos',
  budget: 'Budget',
};

export interface ChampFormulaire {
  id: string;
  type: TypeChamp;
  libelle: string;
  requis: boolean;
  options?: string[];
}

/** Site gratuit : formulaire standard figé à 4 champs (SITE-13). */
export const FORMULAIRE_GRATUIT: readonly ChampFormulaire[] = [
  { id: 'nom', type: 'texte', libelle: 'Nom et prénom', requis: true },
  { id: 'telephone', type: 'tel', libelle: 'Téléphone', requis: true },
  { id: 'email', type: 'email', libelle: 'Email', requis: true },
  { id: 'codePostal', type: 'cp', libelle: 'Code postal du chantier', requis: true },
];

const TESTS: Record<TypeChamp, (v: string) => boolean> = {
  texte: (v) => v.length <= 200,
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) && v.length <= 200,
  tel: (v) => /^\+?[\d\s.()-]{8,20}$/.test(v),
  cp: (v) => /^\d{5}$/.test(v),
  liste: (v) => v.length <= 200,
  choix: (v) => v.length <= 200,
  zone: (v) => v.length <= 3000,
  date: (v) => /^\d{4}-\d{2}-\d{2}$/.test(v),
  photos: () => false,
  budget: (v) => v.length <= 60,
};

/**
 * Envoi d'un visiteur : le site gratuit n'accepte que ses 4 champs, tout champ inconnu est rejeté
 * (SITE-13) ; chaque valeur est contrôlée selon son type et ses options.
 */
export function validerEnvoi(
  champs: readonly ChampFormulaire[],
  offre: 'gratuit' | 'site_pro',
  valeurs: Record<string, unknown>,
): { ok: true; valeurs: Record<string, string> } | { ok: false; erreurs: Record<string, string> } {
  const config = offre === 'gratuit' ? FORMULAIRE_GRATUIT : champs;
  const connus = new Map(config.map((c) => [c.id, c]));
  const erreurs: Record<string, string> = {};
  const propres: Record<string, string> = {};
  for (const k of Object.keys(valeurs)) if (!connus.has(k)) erreurs[k] = 'Champ non accepté';
  for (const c of config) {
    const brut = valeurs[c.id];
    const v = typeof brut === 'string' ? brut.trim() : '';
    if (!v) {
      if (c.requis) erreurs[c.id] = 'Champ obligatoire';
      continue;
    }
    if (typeof brut !== 'string' || !TESTS[c.type](v)) erreurs[c.id] = 'Valeur invalide';
    else if ((c.type === 'liste' || c.type === 'choix') && c.options && !c.options.includes(v))
      erreurs[c.id] = 'Choix invalide';
    else propres[c.id] = v;
  }
  return Object.keys(erreurs).length ? { ok: false, erreurs } : { ok: true, valeurs: propres };
}
