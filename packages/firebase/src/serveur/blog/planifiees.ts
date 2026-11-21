import { CORBEILLE_JOURS } from '@ph/core/blog';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';

/** Groupe de collections des articles (`sites/{id}/articles`). */
const GROUPE_ARTICLES = 'articles';

/** Toutes les 5 minutes : les articles planifiés dont l'heure est passée sont publiés. */
export async function publierArticlesPlanifies(db: Firestore, maintenant: number): Promise<number> {
  const r = await db
    .collectionGroup(GROUPE_ARTICLES)
    .where('statut', '==', 'planifie')
    .where('datePublication', '<=', Timestamp.fromMillis(maintenant))
    .limit(400)
    .get();
  const lot = db.batch();
  for (const d of r.docs)
    lot.update(d.ref, { statut: 'publie', modifieLe: Timestamp.fromMillis(maintenant) });
  if (r.size) await lot.commit();
  return r.size;
}

/** Chaque nuit : la corbeille est vidée des articles supprimés il y a plus de 30 jours. */
export async function viderCorbeilleBlog(db: Firestore, maintenant: number): Promise<number> {
  const limite = Timestamp.fromMillis(maintenant - CORBEILLE_JOURS * 24 * 3600 * 1000);
  const r = await db
    .collectionGroup(GROUPE_ARTICLES)
    .where('supprimeLe', '<=', limite)
    .limit(400)
    .get();
  const lot = db.batch();
  for (const d of r.docs) lot.delete(d.ref);
  if (r.size) await lot.commit();
  return r.size;
}
