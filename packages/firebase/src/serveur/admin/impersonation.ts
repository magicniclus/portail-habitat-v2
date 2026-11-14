import { ErreurMetier } from '@ph/core/erreurs';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import { chemins } from '../../chemins';
import { auditerAdmin } from './audit';

/**
 * « Voir en tant que » (ADMIN §2.3, ADM-04) : superadmin seulement, journalisé. Le jeton porte
 * `imp` : toute écriture est refusée par l'enveloppe, et l'espace affiche un bandeau rouge.
 */
export async function jetonImpersonation(
  s: { db: Firestore; auth: Auth; horloge: () => number },
  e: { acteurUid: string; cibleUid: string; motif: string },
): Promise<string> {
  const admin = await s.db.doc(chemins.admin(e.acteurUid)).get();
  if (admin.get('role') !== 'superadmin' || admin.get('actif') !== true)
    throw new ErreurMetier('PERMISSION_REFUSEE');
  if (e.cibleUid === e.acteurUid) throw new ErreurMetier('ENTREE_INVALIDE');
  if ((await s.db.doc(chemins.admin(e.cibleUid)).get()).exists)
    throw new ErreurMetier('PERMISSION_REFUSEE', 'Impossible pour un membre de l’équipe.');
  await auditerAdmin(
    s.db,
    {
      acteurUid: e.acteurUid,
      action: 'impersonation',
      cible: `users/${e.cibleUid}`,
      motif: e.motif,
    },
    s.horloge(),
  );
  return s.auth.createCustomToken(e.cibleUid, { imp: e.acteurUid });
}
