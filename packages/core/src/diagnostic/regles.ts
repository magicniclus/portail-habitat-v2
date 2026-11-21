/** Contexte d'un bien (étapes 1 et 2 du parcours diagnostic). */
export interface ContexteBien {
  motif: 'vente' | 'location' | 'travaux';
  type: 'appartement' | 'maison' | 'immeuble';
  periode: 'av1949' | '1949-1976' | '1977-1996' | '1997-2010' | 'ap2011';
  gaz: 'oui' | 'non';
  elec: 'ancienne' | 'recente';
  assainissement: 'collectif' | 'individuel' | 'inconnu';
  classe: 'inconnu' | 'AB' | 'CD' | 'E' | 'FG';
  /** Commune de la Presqu'île d'Ambès (bâti humide). */
  presquile: boolean;
}

const avantPermis1997 = ['av1949', '1949-1976', '1977-1996'];

/**
 * Règles d'obligation (droit 2026, Gironde) : identifiant du diagnostic → obligatoire pour ce bien ?
 * Le texte de chaque règle est dans referentiel/diagnostics/items (`quand`, `note`).
 */
export const REGLES_OBLIGATOIRES: Record<string, (c: ContexteBien) => boolean> = {
  dpe: (c) => c.motif !== 'travaux',
  audit: (c) =>
    c.motif === 'vente' && c.type !== 'appartement' && (c.classe === 'FG' || c.classe === 'E'),
  amiante: (c) => c.motif === 'vente' && avantPermis1997.includes(c.periode),
  plomb: (c) => c.periode === 'av1949' && c.motif !== 'travaux',
  termites: (c) => c.motif === 'vente',
  gaz: (c) => c.motif !== 'travaux' && c.gaz === 'oui',
  elec: (c) => c.motif !== 'travaux' && c.elec === 'ancienne',
  erp: (c) => c.motif !== 'travaux',
  carrez: (c) => c.motif === 'vente' && c.type === 'appartement',
  boutin: (c) => c.motif === 'location',
  assainissement: (c) => c.motif === 'vente' && c.assainissement === 'individuel',
};

/** Diagnostics conseillés (non obligatoires). */
export const REGLES_CONSEILLEES: Record<string, (c: ContexteBien) => boolean> = {
  merule: (c) => c.periode === 'av1949' || c.presquile,
  dtg: (c) => c.type === 'immeuble',
};
