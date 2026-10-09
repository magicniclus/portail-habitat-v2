import { ErreurMetier } from '@ph/core/erreurs';
import { peut, type Membre } from '@ph/core/equipe';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';

/** Avis publié tel que l'artisan le voit (maquette Mes Avis) : aucune donnée de l'auteur. */
export interface AvisPro {
  id: string;
  nomAffiche: string;
  note: number;
  texte: string;
  typeTravaux: string;
  publieLe: number;
  reponse?: { texte: string; le: number };
}

/** Avis publiés de l'entreprise, les plus récents d'abord (index `artisanId`, `statut`, `publieLe`). */
export async function lireAvisPro(
  db: Firestore,
  artisanId: string,
  limite = 200,
): Promise<AvisPro[]> {
  const r = await db
    .collection(collections.avis)
    .where('artisanId', '==', artisanId)
    .where('statut', '==', 'publie')
    .orderBy('publieLe', 'desc')
    .limit(limite)
    .get();
  return r.docs.map((d) => {
    const reponse = d.get('reponse') as { texte: string; le: Timestamp } | undefined;
    return {
      id: d.id,
      nomAffiche: d.get('nomAffiche'),
      note: d.get('note'),
      texte: (d.get('texte') as string | undefined) ?? '',
      typeTravaux: d.get('typeTravaux'),
      publieLe: (d.get('publieLe') as Timestamp).toMillis(),
      ...(reponse ? { reponse: { texte: reponse.texte, le: reponse.le.toMillis() } } : {}),
    };
  });
}

/**
 * Réponse publique de l'artisan à un avis publié (une seule, affichée sur la fiche) : membre relu
 * dans la transaction, droit `avis.repondre`.
 */
export async function repondreAvis(
  s: { db: Firestore; horloge: () => number },
  ctx: { artisanId: string; uid: string },
  e: { avisId: string; texte: string },
): Promise<void> {
  const ref = s.db.doc(chemins.avis(e.avisId));
  await s.db.runTransaction(async (t) => {
    const [m, a] = await Promise.all([
      t.get(s.db.doc(chemins.membre(ctx.artisanId, ctx.uid))),
      t.get(ref),
    ]);
    if (!peut(m.data() as Membre | undefined, 'avis.repondre'))
      throw new ErreurMetier('PERMISSION_REFUSEE');
    if (!a.exists || a.get('artisanId') !== ctx.artisanId || a.get('statut') !== 'publie')
      throw new ErreurMetier('INTROUVABLE');
    if (a.get('reponse')) throw new ErreurMetier('CONFLIT', 'Vous avez déjà répondu à cet avis.');
    t.update(ref, {
      reponse: { texte: e.texte, le: Timestamp.fromMillis(s.horloge()), parUid: ctx.uid },
      updatedAt: Timestamp.fromMillis(s.horloge()),
    });
  });
}
