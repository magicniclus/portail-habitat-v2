import { sectionsLecture } from '../admin/permissions';
import { CODES_ROLE, type RoleMembre } from './permissions';

/** Limites Firebase : 1 000 octets de claims personnalisés, donc au plus 10 entreprises (COMPTES §3.7). */
export const TAILLE_MAX_CLAIMS = 1000;
export const ENTREPRISES_MAX = 10;

export type RoleCompte = 'particulier' | 'artisan';

export interface ClaimsUtilisateur {
  roles: RoleCompte[];
  ent?: Record<string, string>;
  staff?: { r: string; s: string[]; pii: boolean };
}

export interface ProfilClaims {
  roles: readonly RoleCompte[];
  membres: readonly { artisanId: string; role: RoleMembre; statut: 'actif' | 'suspendu' }[];
  admin?: { role: string; actif: boolean; permissionsEffectives: readonly string[] };
}

/** Rôle interne sans droit aux données personnelles (profils, consentements, contacts). */
const SANS_PII = ['lecture'];

/**
 * Claims personnalisés recalculés par `syncClaims` : `ent` ne contient que les appartenances
 * actives (une suspension retire l'accès dès le rafraîchissement du jeton).
 */
export function claimsUtilisateur(p: ProfilClaims): ClaimsUtilisateur {
  const actifs = p.membres.filter((m) => m.statut === 'actif');
  if (actifs.length > ENTREPRISES_MAX)
    throw new RangeError(`Au plus ${ENTREPRISES_MAX} entreprises par personne.`);
  const claims: ClaimsUtilisateur = { roles: [...p.roles] };
  if (actifs.length)
    claims.ent = Object.fromEntries(actifs.map((m) => [m.artisanId, CODES_ROLE[m.role]]));
  if (p.admin?.actif)
    claims.staff = {
      r: p.admin.role,
      s: sectionsLecture(p.admin.permissionsEffectives),
      pii: !SANS_PII.includes(p.admin.role),
    };
  if (new TextEncoder().encode(JSON.stringify(claims)).length > TAILLE_MAX_CLAIMS)
    throw new RangeError('Claims personnalisés au-delà de 1 000 octets.');
  return claims;
}

/** Sièges libres : membres et invitations en cours comptent (COMPTES §4.2). */
export function siegesDisponibles(e: {
  siegesMax: number;
  nbMembres: number;
  invitationsEnCours: number;
}): number {
  return Math.max(0, e.siegesMax - e.nbMembres - e.invitationsEnCours);
}

/**
 * Qui garde un siège quand `siegesMax` change (passage en gratuit, rachat de sièges) : le propriétaire
 * toujours, puis les membres choisis par lui, puis les plus anciens. Rien n'est supprimé (§4.3).
 */
export function repartirSieges(
  membres: readonly { uid: string; role: RoleMembre; ajouteLe: number }[],
  siegesMax: number,
  prioritaires: readonly string[] = [],
): { actifs: string[]; suspendus: string[] } {
  const rang = (m: { uid: string; role: RoleMembre }) =>
    m.role === 'proprietaire'
      ? -1
      : prioritaires.includes(m.uid)
        ? prioritaires.indexOf(m.uid)
        : Infinity;
  const ordre = [...membres].sort((a, b) => rang(a) - rang(b) || a.ajouteLe - b.ajouteLe);
  const actifs = new Set(
    ordre.filter((m, i) => m.role === 'proprietaire' || i < siegesMax).map((m) => m.uid),
  );
  return {
    actifs: membres.filter((m) => actifs.has(m.uid)).map((m) => m.uid),
    suspendus: membres.filter((m) => !actifs.has(m.uid)).map((m) => m.uid),
  };
}

/** Un membre peut toujours quitter l'entreprise, sauf le dernier propriétaire (§4.8). */
export function peutQuitter(
  membres: readonly { uid: string; role: RoleMembre; statut: 'actif' | 'suspendu' }[],
  uid: string,
): boolean {
  const moi = membres.find((m) => m.uid === uid);
  if (!moi) return false;
  if (moi.role !== 'proprietaire') return true;
  return membres.some((m) => m.uid !== uid && m.role === 'proprietaire' && m.statut === 'actif');
}

/** « Cette invitation est destinée à c•••@e•••.fr » : jamais l'adresse complète d'un tiers. */
export function masquerEmail(email: string): string {
  const [local, domaine] = email.toLowerCase().split('@');
  if (!local || !domaine) return '•••';
  const point = domaine.lastIndexOf('.');
  const tld = point > 0 ? domaine.slice(point) : '';
  return `${local[0]}•••@${domaine[0]}•••${tld}`;
}
