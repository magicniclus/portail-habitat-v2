import type { RoleMembre } from '@ph/core/equipe';
import { membre } from '@ph/core/schemas';
import type { z } from '@ph/core/zod';

/** Document `membres/{uid}` initial : toutes les notifications actives. */
export function nouveauMembre(e: {
  role: RoleMembre;
  ajoutePar: string;
  maintenant: Date;
  metiers?: string[];
  permissions?: string[];
  plafondCreditsMois?: number;
  invitationId?: string;
}): z.output<typeof membre> {
  return membre.parse({
    schemaVersion: 1,
    role: e.role,
    statut: 'actif',
    notifs: { demandes: true, avis: true, factures: e.role !== 'collaborateur' },
    ajouteLe: e.maintenant,
    ajoutePar: e.ajoutePar,
    derniereActivite: e.maintenant,
    ...(e.metiers?.length ? { metiers: e.metiers } : {}),
    ...(e.permissions?.length ? { permissions: e.permissions } : {}),
    ...(e.plafondCreditsMois !== undefined ? { plafondCreditsMois: e.plafondCreditsMois } : {}),
    ...(e.invitationId ? { invitationId: e.invitationId } : {}),
  });
}
