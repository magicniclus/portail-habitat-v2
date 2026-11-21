import { FieldPath, Timestamp, type DocumentData, type Firestore } from 'firebase-admin/firestore';
import { collections } from '../../chemins';

/**
 * Migration de données (EXPLOITATION §2) : idempotente (`transformer` rend `null` quand le
 * document est déjà à jour), par lots de 400, reprise au curseur enregistré dans
 * `migrations/{id}`. En `dryRun`, rien n'est écrit : on compte et on montre quelques exemples.
 */
export interface Migration {
  id: string;
  description: string;
  collection: string;
  /** Champs à écrire (fusion), ou `null` si le document n'a rien à changer. */
  transformer: (donnees: DocumentData, id: string) => Record<string, unknown> | null;
}

export interface BilanMigration {
  lus: number;
  modifies: number;
  exemples: { id: string; changements: Record<string, unknown> }[];
  terminee: boolean;
}

const LOT = 400;

export async function executerMigration(
  db: Firestore,
  m: Migration,
  o: { dryRun: boolean; horloge: () => number; maxLots?: number },
): Promise<BilanMigration> {
  const suivi = db.collection(collections.migrations).doc(m.id);
  const etat = (await suivi.get()).data();
  if (etat?.termineeLe && !o.dryRun) return { lus: 0, modifies: 0, exemples: [], terminee: true };
  let curseur = o.dryRun ? null : ((etat?.curseur as string | null | undefined) ?? null);
  const bilan: BilanMigration = { lus: 0, modifies: 0, exemples: [], terminee: false };
  for (let lot = 0; lot < (o.maxLots ?? Infinity); lot++) {
    let q = db.collection(m.collection).orderBy(FieldPath.documentId()).limit(LOT);
    if (curseur) q = q.startAfter(curseur);
    const r = await q.get();
    const ecriture = db.batch();
    for (const d of r.docs) {
      const changements = m.transformer(d.data(), d.id);
      if (!changements) continue;
      bilan.modifies++;
      if (bilan.exemples.length < 5) bilan.exemples.push({ id: d.id, changements });
      if (!o.dryRun) ecriture.set(d.ref, changements, { merge: true });
    }
    bilan.lus += r.size;
    curseur = r.docs.at(-1)?.id ?? curseur;
    bilan.terminee = r.size < LOT;
    if (!o.dryRun) {
      ecriture.set(
        suivi,
        {
          schemaVersion: 1,
          nom: m.description,
          curseur,
          traites: (etat?.traites ?? 0) + bilan.lus,
          updatedAt: Timestamp.fromMillis(o.horloge()),
          ...(bilan.terminee ? { termineeLe: Timestamp.fromMillis(o.horloge()) } : {}),
        },
        { merge: true },
      );
      await ecriture.commit();
    }
    if (bilan.terminee) break;
  }
  return bilan;
}

/** État d'une migration pour `pnpm migrer` (sans argument). */
export async function etatMigration(db: Firestore, id: string): Promise<string> {
  const e = (await db.collection(collections.migrations).doc(id).get()).data();
  return e?.termineeLe ? 'terminée' : e ? `en cours (${e.traites as number} lus)` : 'à lancer';
}
