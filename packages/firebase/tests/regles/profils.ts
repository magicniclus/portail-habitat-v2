import { permissionsEffectives, sectionsLecture } from '@ph/core/admin';

/** Profils des tests de règles (DATABASE §12 « À exiger »). */
export type Profil =
  | 'anonyme'
  | 'particulier'
  | 'proprietaire'
  | 'gerant'
  | 'collaborateur'
  | 'comptable'
  | 'suspendu'
  | 'autreArtisan'
  | 'superadmin'
  | 'admin'
  | 'moderateur'
  | 'commercial'
  | 'finance'
  | 'lecture'
  | 'impersonation';

interface Identite {
  uid: string;
  claims: Record<string, unknown>;
}

const staff = (role: string) => ({
  staff: { r: role, s: sectionsLecture(permissionsEffectives({ role })), pii: role !== 'lecture' },
});

export const IDENTITES: Record<Exclude<Profil, 'anonyme'>, Identite> = {
  particulier: { uid: 'part1', claims: { roles: ['particulier'] } },
  proprietaire: { uid: 'prop', claims: { roles: ['artisan'], ent: { a1: 'p' } } },
  gerant: { uid: 'ger', claims: { roles: ['artisan'], ent: { a1: 'g' } } },
  collaborateur: { uid: 'collab', claims: { roles: ['artisan'], ent: { a1: 'c' } } },
  comptable: { uid: 'compta', claims: { roles: ['artisan'], ent: { a1: 'x' } } },
  // Claims encore présents (jusqu'à 1 h) mais document `membres` suspendu.
  suspendu: { uid: 'susp', claims: { roles: ['artisan'], ent: { a1: 'c' } } },
  autreArtisan: { uid: 'autre', claims: { roles: ['artisan'], ent: { a2: 'p' } } },
  superadmin: { uid: 'sa', claims: staff('superadmin') },
  admin: { uid: 'adm', claims: staff('admin') },
  moderateur: { uid: 'modo', claims: staff('moderateur') },
  commercial: { uid: 'com', claims: staff('commercial') },
  finance: { uid: 'fin', claims: staff('finance') },
  lecture: { uid: 'lec', claims: staff('lecture') },
  // « Voir en tant que » le propriétaire : lecture seule.
  impersonation: {
    uid: 'prop',
    claims: { roles: ['artisan'], ent: { a1: 'p' }, imp: { par: 'sa', cible: 'prop' } },
  },
};

export const PROFILS: Profil[] = [
  'anonyme',
  ...(Object.keys(IDENTITES) as Exclude<Profil, 'anonyme'>[]),
];
const STAFF: Profil[] = ['superadmin', 'admin', 'moderateur', 'commercial', 'finance', 'lecture'];

/** Profils staff dont le claim ouvre une section. */
export function staffAvec(section: string, avecPii = false): Profil[] {
  return STAFF.filter((p) => {
    const s = IDENTITES[p as Exclude<Profil, 'anonyme'>].claims.staff as {
      s: string[];
      pii: boolean;
    };
    return s.s.includes(section) && (!avecPii || s.pii);
  });
}

/** Membres de l'entreprise a1 par rôle de claim (le suspendu garde un claim « c »). */
const MEMBRES_A1: Record<'p' | 'g' | 'c' | 'x', Profil[]> = {
  p: ['proprietaire', 'impersonation'],
  g: ['gerant'],
  c: ['collaborateur', 'suspendu'],
  x: ['comptable'],
};
export const membresA1 = (...codes: ('p' | 'g' | 'c' | 'x')[]): Profil[] =>
  codes.flatMap((c) => MEMBRES_A1[c]);
