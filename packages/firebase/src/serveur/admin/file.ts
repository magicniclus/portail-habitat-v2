import { etatSla, peutTraiter, trierFile, typeTache } from '@ph/core/admin';
import { ErreurMetier } from '@ph/core/erreurs';
import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';
import { auditerAdmin } from './audit';

/** File de travail (ADMIN §2.2) : `filesModeration` filtrée par les permissions du membre. */

export interface TacheAdmin {
  id: string;
  type: string;
  libelle: string;
  titre: string;
  priorite: number;
  creeLe: number;
  sla: 'ok' | 'bientot' | 'depasse';
  assigneA: string | null;
  statut: string;
  /** Section où traiter la tâche. */
  section: string;
  refs: Record<string, string>;
}

const OUVERTES = ['a_traiter', 'en_cours'];
const LIMITE = 300;

/** Titre lisible : entreprise, référence de demande ou titre d'appel d'offres. */
async function titres(db: Firestore, refs: Record<string, string>[]): Promise<string[]> {
  const cles = refs.map((r) =>
    r.artisanId
      ? chemins.artisan(r.artisanId)
      : r.appelOffresId
        ? chemins.appelOffres(r.appelOffresId)
        : r.demandeId
          ? chemins.demande(r.demandeId)
          : null,
  );
  const uniques = [...new Set(cles.filter((c): c is string => c !== null))];
  const docs = uniques.length ? await db.getAll(...uniques.map((c) => db.doc(c))) : [];
  const noms = new Map(
    docs.map((d) => [
      d.ref.path,
      (d.get('nomCommercial') ?? d.get('titre') ?? d.get('reference') ?? d.id) as string,
    ]),
  );
  return cles.map((c) => (c ? (noms.get(c) ?? '—') : '—'));
}

export async function listerFileAdmin(
  db: Firestore,
  e: { permissions: readonly string[]; maintenant: number },
): Promise<TacheAdmin[]> {
  const docs = (
    await db
      .collection(collections.filesModeration)
      .where('statut', 'in', OUVERTES)
      .limit(LIMITE)
      .get()
  ).docs.filter((d) => peutTraiter(d.get('type') as string, e.permissions));
  const refs = docs.map((d) => (d.get('refs') as Record<string, string> | undefined) ?? {});
  const noms = await titres(db, refs);
  return trierFile(
    docs.map((d, i) => {
      const type = d.get('type') as string;
      const creeLe = (d.get('createdAt') as Timestamp | undefined)?.toMillis() ?? e.maintenant;
      const t = typeTache(type);
      return {
        id: d.id,
        type,
        libelle: t.libelle,
        titre: noms[i]!,
        priorite: (d.get('priorite') as number | undefined) ?? 1,
        creeLe,
        sla: etatSla(creeLe, type, e.maintenant),
        assigneA: (d.get('assigneA') as string | undefined) ?? null,
        statut: d.get('statut') as string,
        section: t.section,
        refs: refs[i]!,
      };
    }),
  );
}

type Services = { db: Firestore; horloge: () => number };

async function tacheAutorisee(s: Services, id: string, permissions: readonly string[]) {
  const ref = s.db.collection(collections.filesModeration).doc(id);
  const d = await ref.get();
  if (!d.exists) throw new ErreurMetier('INTROUVABLE');
  if (!peutTraiter(d.get('type') as string, permissions))
    throw new ErreurMetier('PERMISSION_REFUSEE');
  return ref;
}

/** Prendre une tâche (ou la rendre) : `assigneA` et audit (maquette). */
export async function assignerTacheAdmin(
  s: Services,
  e: { acteurUid: string; permissions: readonly string[]; id: string; prendre: boolean },
): Promise<void> {
  const ref = await tacheAutorisee(s, e.id, e.permissions);
  await s.db.runTransaction(async (t) => {
    const d = await t.get(ref);
    if (!OUVERTES.includes(d.get('statut') as string))
      throw new ErreurMetier('CONFLIT', 'Cette tâche est déjà traitée.');
    const avant = (d.get('assigneA') as string | undefined) ?? null;
    t.update(ref, {
      assigneA: e.prendre ? e.acteurUid : FieldValue.delete(),
      statut: e.prendre ? 'en_cours' : 'a_traiter',
      updatedAt: Timestamp.fromMillis(s.horloge()),
    });
    auditerAdmin(
      s.db,
      {
        acteurUid: e.acteurUid,
        action: 'adminAssignerTache',
        cible: ref.path,
        avant: { assigneA: avant },
        apres: { assigneA: e.prendre ? e.acteurUid : null },
      },
      s.horloge(),
      t,
    );
  });
}

/** Clore une tâche avec sa résolution (faite ou rejetée). */
export async function traiterTacheAdmin(
  s: Services,
  e: {
    acteurUid: string;
    permissions: readonly string[];
    id: string;
    issue: 'traitee' | 'rejetee';
    resolution: string;
  },
): Promise<void> {
  const ref = await tacheAutorisee(s, e.id, e.permissions);
  const t0 = Timestamp.fromMillis(s.horloge());
  await s.db.runTransaction(async (t) => {
    const d = await t.get(ref);
    if (!OUVERTES.includes(d.get('statut') as string))
      throw new ErreurMetier('CONFLIT', 'Cette tâche est déjà traitée.');
    t.update(ref, {
      statut: e.issue,
      resolution: e.resolution,
      traiteePar: e.acteurUid,
      traiteeLe: t0,
      updatedAt: t0,
    });
    auditerAdmin(
      s.db,
      {
        acteurUid: e.acteurUid,
        action: 'adminTraiterTache',
        cible: ref.path,
        avant: { statut: d.get('statut') },
        apres: { statut: e.issue },
        motif: e.resolution,
      },
      s.horloge(),
      t,
    );
  });
}
