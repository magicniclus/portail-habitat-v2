/** Feature flags (EXPLOITATION.md §4) : définis ici, valeurs globales dans Remote Config, surcharges dans config/flags. */
export const FLAGS = {
  appelsOffresPayants: {
    defaut: false,
    description: 'Déblocage payant des appels d’offres',
    retraitPrevu: '2027-06',
  },
  equipesMultiUtilisateurs: {
    defaut: false,
    description: 'Invitations et sièges',
    retraitPrevu: '2027-06',
  },
  diagnosticCommunes: {
    defaut: true,
    description: 'Pages communes du diagnostic',
    retraitPrevu: '2027-03',
  },
  smsNouvelleDemande: {
    defaut: false,
    description: 'SMS à chaque nouvelle demande',
    retraitPrevu: '2027-06',
  },
  maintenance: {
    defaut: false,
    description: 'Page de maintenance partout sauf /admin (ERR-03)',
    retraitPrevu: '2099-12',
  },
} as const satisfies Record<string, { defaut: boolean; description: string; retraitPrevu: string }>;

export type NomFlag = keyof typeof FLAGS;
export type ValeursFlags = Partial<Record<NomFlag, boolean>>;

export interface SourcesFlag {
  globales?: ValeursFlags;
  parArtisan?: Record<string, ValeursFlags>;
  artisanId?: string;
}

/** Lecture unique d'un flag : surcharge artisan > valeur globale > défaut. Le serveur fait foi. */
export function flag(nom: NomFlag, sources: SourcesFlag = {}): boolean {
  const surcharge = sources.artisanId ? sources.parArtisan?.[sources.artisanId]?.[nom] : undefined;
  return surcharge ?? sources.globales?.[nom] ?? FLAGS[nom].defaut;
}
