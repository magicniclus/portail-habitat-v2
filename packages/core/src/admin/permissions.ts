/** Permissions de l'équipe interne (ADMIN.md §1). Vérifiées côté serveur, jamais par les règles. */

export const PERMISSIONS_ADMIN = [
  'artisans.lire',
  'artisans.creer',
  'artisans.modifier',
  'artisans.verifier',
  'artisans.suspendre',
  'artisans.supprimer',
  'documents.valider',
  'avis.moderer',
  'avis.supprimer',
  'demandes.lire',
  'demandes.reattribuer',
  'demandes.annuler',
  'leads.publier',
  'leads.prix',
  'leads.prix_illimite',
  'leads.offrir',
  'leads.rembourser',
  'credits.crediter',
  'credits.crediter_illimite',
  'finances.lire',
  'finances.exporter',
  'finances.rembourser_carte',
  'referentiels.modifier',
  'communes.modifier',
  'matching.config',
  'matching.forcer',
  'litiges.traiter',
  'contacts.traiter',
  'promos.gerer',
  'annonces.gerer',
  'equipe.gerer',
  'audit.lire',
  'rgpd.traiter',
  'avis.lire',
  'leads.lire',
  'litiges.lire',
  'referentiels.lire',
  'matching.lire',
  'conversion.lire',
  'conversion.piloter',
  'conversion.configurer',
  'comportement.lire',
  'comportement.replays',
  'comportement.configurer',
  'ia.utiliser',
  'ia.configurer',
] as const;
export type PermissionAdmin = (typeof PERMISSIONS_ADMIN)[number];

export const ROLES_ADMIN_SYSTEME = [
  'superadmin',
  'admin',
  'moderateur',
  'commercial',
  'finance',
  'lecture',
] as const;
export type RoleAdminSysteme = (typeof ROLES_ADMIN_SYSTEME)[number];

const tout = [...PERMISSIONS_ADMIN];
const PAR_ROLE: Record<RoleAdminSysteme, readonly PermissionAdmin[]> = {
  superadmin: tout,
  admin: tout.filter((p) => p !== 'equipe.gerer' && p !== 'artisans.supprimer'),
  moderateur: [
    'artisans.lire',
    'documents.valider',
    'avis.lire',
    'avis.moderer',
    'avis.supprimer',
    'contacts.traiter',
    'litiges.lire',
    'demandes.lire',
  ],
  commercial: [
    'artisans.lire',
    'promos.gerer',
    'credits.crediter',
    'leads.lire',
    'leads.prix',
    'conversion.lire',
    'conversion.piloter',
  ],
  finance: ['finances.lire', 'finances.exporter', 'leads.lire', 'artisans.lire'],
  lecture: tout.filter((p) => p.endsWith('.lire')),
};

/** Code de section (claim `staff.s`) ouvert par chaque permission : le menu et les règles de lecture en dépendent. */
const SECTION: Partial<Record<PermissionAdmin, string>> = {
  'artisans.lire': 'art',
  'demandes.lire': 'dem',
  'leads.lire': 'ao',
  'avis.lire': 'avi',
  'litiges.lire': 'lit',
  'finances.lire': 'fin',
  'conversion.lire': 'cnv',
  'comportement.lire': 'cmp',
  'ia.utiliser': 'ia',
  'referentiels.lire': 'ref',
  'matching.lire': 'mat',
  'audit.lire': 'aud',
  'rgpd.traiter': 'rgpd',
  'contacts.traiter': 'file',
};

export interface ProfilAdmin {
  role: string;
  /** Permissions d'un rôle personnalisé (`rolesAdmin/{id}`). */
  permissionsRole?: readonly string[];
  permissionsPlus?: readonly string[];
  permissionsMoins?: readonly string[];
}

const estPermission = (p: string): p is PermissionAdmin =>
  (PERMISSIONS_ADMIN as readonly string[]).includes(p);

/** Permissions effectives = rôle + plus − moins (calculées par syncClaims, stockées dans admins/{uid}). */
export function permissionsEffectives(profil: ProfilAdmin): PermissionAdmin[] {
  const base = (ROLES_ADMIN_SYSTEME as readonly string[]).includes(profil.role)
    ? PAR_ROLE[profil.role as RoleAdminSysteme]
    : (profil.permissionsRole ?? []).filter(estPermission);
  const ensemble = new Set<PermissionAdmin>([
    ...base,
    ...(profil.permissionsPlus ?? []).filter(estPermission),
  ]);
  for (const p of profil.permissionsMoins ?? []) ensemble.delete(p as PermissionAdmin);
  return [...ensemble].sort();
}

export function sectionsLecture(permissions: readonly string[]): string[] {
  const s = new Set<string>();
  for (const p of permissions) {
    const code = SECTION[p as PermissionAdmin];
    if (code) s.add(code);
  }
  return [...s].sort();
}
