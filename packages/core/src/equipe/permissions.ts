/** Rôles et permissions d'une équipe d'entreprise (COMPTES.md §4.1). Utilisé par l'UI ET le serveur. */

export const ROLES_MEMBRE = ['proprietaire', 'gerant', 'collaborateur', 'comptable'] as const;
export type RoleMembre = (typeof ROLES_MEMBRE)[number];

/** Codes courts posés dans le claim `ent` (taille des claims ≤ 1 000 octets). */
export const CODES_ROLE = {
  proprietaire: 'p',
  gerant: 'g',
  collaborateur: 'c',
  comptable: 'x',
} as const satisfies Record<RoleMembre, string>;

export const ACTIONS_EQUIPE = [
  'demandes.repondre',
  'leads.debloquer',
  'fiche.modifier',
  'realisations.modifier',
  'avis.repondre',
  'documents.televerser',
  'statistiques.voir',
  'abonnement.gerer',
  'factures.voir',
  'membres.gerer',
  'propriete.transferer',
  'entreprise.fermer',
] as const;
export type ActionEquipe = (typeof ACTIONS_EQUIPE)[number];

export const PERMISSIONS_PAR_ROLE: Record<RoleMembre, readonly ActionEquipe[]> = {
  proprietaire: ACTIONS_EQUIPE,
  gerant: ACTIONS_EQUIPE.filter((a) => a !== 'propriete.transferer' && a !== 'entreprise.fermer'),
  collaborateur: [
    'demandes.repondre',
    'realisations.modifier',
    'documents.televerser',
    'statistiques.voir',
  ],
  comptable: ['factures.voir'],
};

/** Jamais accordables par surcharge. */
const RESERVEES_PROPRIETAIRE: readonly ActionEquipe[] = [
  'propriete.transferer',
  'entreprise.fermer',
];

export interface Membre {
  role: RoleMembre;
  statut: 'actif' | 'suspendu';
  /** Permissions ajoutées au rôle (ex. `leads.debloquer` pour un collaborateur). */
  permissions?: string[];
  /** Métiers routés vers ce membre ; vide = tous. */
  metiers?: string[];
}

export interface ContexteAction {
  /** Métier de la demande (routage des collaborateurs). */
  metier?: string;
  /** Membre à qui la demande est assignée, et membre qui agit. */
  assigneA?: string;
  uid?: string;
  /** Rôle du membre visé (gestion d'équipe). */
  roleCible?: RoleMembre;
}

export function peut(
  membre: Membre | null | undefined,
  action: ActionEquipe,
  ctx: ContexteAction = {},
): boolean {
  if (!membre || membre.statut !== 'actif') return false;
  const parRole = PERMISSIONS_PAR_ROLE[membre.role].includes(action);
  const accordee =
    !RESERVEES_PROPRIETAIRE.includes(action) && (membre.permissions ?? []).includes(action);
  if (!parRole && !accordee) return false;

  if (
    action === 'demandes.repondre' &&
    membre.role === 'collaborateur' &&
    ctx.metier &&
    membre.metiers?.length
  ) {
    const assigne = ctx.assigneA !== undefined && ctx.assigneA === ctx.uid;
    return assigne || membre.metiers.includes(ctx.metier);
  }
  if (action === 'membres.gerer' && membre.role === 'gerant' && ctx.roleCible) {
    return ctx.roleCible !== 'proprietaire' && ctx.roleCible !== 'gerant';
  }
  return true;
}
