import { Timestamp, type Firestore, type Transaction } from 'firebase-admin/firestore';
import { collections } from '../../chemins';

export interface EntreeAuditAdmin {
  acteurUid: string;
  action: string;
  /** Document concerné (`artisans/abc`). */
  cible?: string;
  avant?: unknown;
  apres?: unknown;
  motif?: string;
}

/**
 * Journal d'audit d'une action admin (ADMIN §1) : avant / après et motif. Dans la transaction de
 * l'action quand il y en a une, pour que l'audit et l'écriture réussissent ou échouent ensemble.
 */
export function auditerAdmin(
  db: Firestore,
  e: EntreeAuditAdmin,
  maintenant: number,
  t?: Transaction,
): void | Promise<unknown> {
  const ref = db.collection(collections.auditLog).doc();
  const doc = {
    schemaVersion: 1,
    acteurUid: e.acteurUid,
    action: e.action,
    ...(e.cible ? { cible: e.cible } : {}),
    ...(e.avant !== undefined ? { avant: e.avant } : {}),
    ...(e.apres !== undefined ? { apres: e.apres } : {}),
    ...(e.motif ? { motif: e.motif } : {}),
    ok: true,
    createdAt: Timestamp.fromMillis(maintenant),
  };
  if (t) {
    t.create(ref, doc);
    return;
  }
  return ref.create(doc);
}
