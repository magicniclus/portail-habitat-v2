import type { Firestore, Query, Timestamp } from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';

/** Back-office › Audit (ADMIN §2.12) : journal en lecture seule, filtrable, exportable. */

export const FILTRES_AUDIT = ['acteurUid', 'action', 'cible'] as const;
export type FiltreAudit = (typeof FILTRES_AUDIT)[number];

export interface EntreeJournal {
  id: string;
  le: number;
  acteur: string;
  action: string;
  cible: string;
  motif: string;
  detail: string;
}

const court = (v: unknown) => (v === undefined ? '' : JSON.stringify(v).slice(0, 200));

/** 100 entrées au plus, les plus récentes d'abord ; un seul filtre d'égalité à la fois. */
export async function lireJournalAdmin(
  db: Firestore,
  filtre?: { champ: FiltreAudit; valeur: string },
): Promise<EntreeJournal[]> {
  let q: Query = db.collection(collections.auditLog);
  if (filtre?.valeur) q = q.where(filtre.champ, '==', filtre.valeur.trim());
  const r = await q.orderBy('createdAt', 'desc').limit(100).get();
  const uids = [...new Set(r.docs.map((d) => d.get('acteurUid') as string).filter(Boolean))];
  const admins = uids.length ? await db.getAll(...uids.map((u) => db.doc(chemins.admin(u)))) : [];
  const noms = new Map(admins.map((a) => [a.id, (a.get('nom') as string | undefined) ?? a.id]));
  return r.docs.map((d) => {
    const avant = d.get('avant') as unknown;
    const apres = d.get('apres') as unknown;
    return {
      id: d.id,
      le: (d.get('createdAt') as Timestamp).toMillis(),
      acteur: noms.get(d.get('acteurUid') as string) ?? (d.get('acteurUid') as string) ?? 'système',
      action: d.get('action') as string,
      cible: (d.get('cible') as string | undefined) ?? '',
      motif: (d.get('motif') as string | undefined) ?? '',
      detail: [
        avant !== undefined ? `avant ${court(avant)}` : '',
        apres !== undefined ? `après ${court(apres)}` : '',
      ]
        .filter(Boolean)
        .join(' · '),
    };
  });
}
