import { tachesACreer, type EtapeCycle, type TacheConversion } from '@ph/core/conversion';
import {
  FieldValue,
  Timestamp,
  type DocumentSnapshot,
  type Firestore,
} from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';
import { tracer } from './moteur';

const PRIORITE: Record<TacheConversion, number> = {
  risque_resiliation: 4,
  appel_commercial: 3,
  appel_activation: 2,
};
const PREFIXE = 'tache:';

/**
 * Tâches d'appel du moteur (`filesModeration`, CONVERSION §3) : la séquence de l'entreprise est en
 * pause tant que la tâche est ouverte, puis reprend d'elle-même quand la tâche est close.
 */
export async function gererTachesCycle(
  s: { db: Firestore; horloge: () => number },
  artisan: DocumentSnapshot,
  seuilAppel: number,
): Promise<TacheConversion[]> {
  const maintenant = s.horloge();
  const t0 = Timestamp.fromMillis(maintenant);
  const ref = s.db.collection(collections.cycleEtat).doc(artisan.id);
  const etat = await ref.get();
  const pause = etat.get('pause.par') as string | undefined;
  if (pause?.startsWith(PREFIXE)) {
    const tache = await s.db
      .collection(collections.filesModeration)
      .doc(pause.slice(PREFIXE.length))
      .get();
    if (!tache.exists || ['traitee', 'rejetee'].includes(tache.get('statut') as string))
      await ref.update({ pause: FieldValue.delete() });
    else return [];
  }
  const etape = etat.get('etape') as EtapeCycle;
  let derniereConnexion: number | undefined;
  if (etape === 'visibilite' || etape === 'premium') {
    const uid = artisan.get('proprietaireUid') as string | undefined;
    const m = uid ? await s.db.doc(chemins.membre(artisan.id, uid)).get() : null;
    derniereConnexion = (m?.get('derniereActivite') as Timestamp | undefined)?.toMillis();
  }
  const dernieres = Object.fromEntries(
    Object.entries((etat.get('derniereTache') as Record<string, Timestamp> | undefined) ?? {}).map(
      ([k, v]) => [k, v.toMillis()],
    ),
  );
  const types = tachesACreer({
    etape,
    depuis: (etat.get('depuis') as Timestamp).toMillis(),
    score: (etat.get('score') as number | undefined) ?? 0,
    ...(etat.get('offreCible') ? { offreCible: etat.get('offreCible') as string } : {}),
    ...(derniereConnexion !== undefined ? { derniereConnexion } : {}),
    seuilAppel,
    maintenant,
    dernieres,
  });
  if (!types.length) return [];
  const refs = types.map(() => s.db.collection(collections.filesModeration).doc());
  const lot = s.db.batch();
  types.forEach((type, i) =>
    lot.create(refs[i]!, {
      schemaVersion: 1,
      type,
      refs: { artisanId: artisan.id },
      priorite: PRIORITE[type],
      statut: 'a_traiter',
      permissionRequise: 'conversion.piloter',
      createdAt: t0,
      updatedAt: t0,
    }),
  );
  lot.set(
    ref,
    {
      derniereTache: Object.fromEntries(types.map((t) => [t, t0])),
      pause: { par: `${PREFIXE}${refs[0]!.id}`, depuis: t0, motif: `Tâche ${types[0]} ouverte` },
    },
    { merge: true },
  );
  await lot.commit();
  for (const [i, type] of types.entries())
    await tracer(s.db, maintenant, {
      artisanId: artisan.id,
      type: 'tache_creee',
      fonction: 'cycleCalculer',
      details: { tache: type, tacheId: refs[i]!.id },
    });
  return types;
}
