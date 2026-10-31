import { ErreurMetier } from '@ph/core/erreurs';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { collections } from '../../chemins';
import { auditerAdmin } from './audit';

/** Back-office › Demandes › Sources partenaires (IMPORT_LEADS, DATABASE §4 bis, IMP-02). */

export interface SourceAdmin {
  id: string;
  nom: string;
  actif: boolean;
  quotaJour: number;
  coutUnitaireCentimes: number;
  departementsCouverts: string[];
  /** Imports des 7 derniers jours par issue. */
  semaine: { creee: number; doublon: number; rejetee: number };
}

const SEMAINE_MS = 7 * 86_400_000;

export async function listerSourcesAdmin(
  db: Firestore,
  maintenant: number,
): Promise<SourceAdmin[]> {
  const r = await db.collection(collections.sourcesDemandes).orderBy('nom').get();
  const depuis = Timestamp.fromMillis(maintenant - SEMAINE_MS);
  const imports = db.collection(collections.importsDemandes);
  return Promise.all(
    r.docs.map(async (d) => {
      const [creee, doublon, rejetee] = await Promise.all(
        (['creee', 'doublon', 'rejetee'] as const).map(
          async (statut) =>
            (
              await imports
                .where('sourceId', '==', d.id)
                .where('statut', '==', statut)
                .where('recueLe', '>=', depuis)
                .count()
                .get()
            ).data().count,
        ),
      );
      return {
        id: d.id,
        nom: d.get('nom') as string,
        actif: d.get('actif') === true,
        quotaJour: d.get('quotaJour') as number,
        coutUnitaireCentimes: d.get('coutUnitaireCentimes') as number,
        departementsCouverts: (d.get('departementsCouverts') as string[] | undefined) ?? [],
        semaine: { creee: creee!, doublon: doublon!, rejetee: rejetee! },
      };
    }),
  );
}

export interface ImportAdmin {
  id: string;
  idExterne: string;
  recueLe: number;
  statut: 'creee' | 'doublon' | 'rejetee';
  motifRejet: string | null;
  details: string | null;
  demandeId: string | null;
}

/** Journal des imports d'une source (sans donnée personnelle), les plus récents d'abord. */
export async function journalImportsAdmin(db: Firestore, sourceId: string): Promise<ImportAdmin[]> {
  const r = await db
    .collection(collections.importsDemandes)
    .where('sourceId', '==', sourceId)
    .orderBy('recueLe', 'desc')
    .limit(50)
    .get();
  return r.docs.map((d) => ({
    id: d.id,
    idExterne: d.get('idExterne') as string,
    recueLe: (d.get('recueLe') as Timestamp).toMillis(),
    statut: d.get('statut') as ImportAdmin['statut'],
    motifRejet: (d.get('motifRejet') as string | undefined) ?? null,
    details: (d.get('details') as string | undefined) ?? null,
    demandeId: (d.get('demandeId') as string | undefined) ?? null,
  }));
}

/** Coupe ou rouvre une source : le webhook refuse les envois d'une source inactive. */
export async function activerSourceAdmin(
  s: { db: Firestore; horloge: () => number },
  e: { acteurUid: string; sourceId: string; actif: boolean; motif: string },
): Promise<void> {
  const ref = s.db.collection(collections.sourcesDemandes).doc(e.sourceId);
  const t0 = Timestamp.fromMillis(s.horloge());
  await s.db.runTransaction(async (t) => {
    const d = await t.get(ref);
    if (!d.exists) throw new ErreurMetier('INTROUVABLE');
    t.update(ref, { actif: e.actif, updatedAt: t0 });
    auditerAdmin(
      s.db,
      {
        acteurUid: e.acteurUid,
        action: 'adminActiverSource',
        cible: ref.path,
        avant: { actif: d.get('actif') === true },
        apres: { actif: e.actif },
        motif: e.motif,
      },
      s.horloge(),
      t,
    );
  });
}
