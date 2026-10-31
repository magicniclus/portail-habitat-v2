import { adresseExpediteur } from '@ph/core/conversion';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { collections } from '../../chemins';
import { empreinteEmail } from '../notifications/notifier';
import { tracer } from './moteur';
import { PREFIXE_TACHE } from './taches';

/**
 * `cycleOnReponseEmail` (Resend Inbound, CONVERSION §9) : une réponse à un email de conversion
 * crée une tâche `reponse_commerciale` et met la séquence en pause jusqu'à sa clôture. Le texte
 * du message n'est ni lu ni stocké : il se consulte dans la boîte du signataire.
 */
export async function traiterReponseEmail(
  s: { db: Firestore; horloge: () => number },
  from: string,
): Promise<'artisan' | 'prospect' | null> {
  const email = adresseExpediteur(from);
  if (!email) return null;
  const t0 = Timestamp.fromMillis(s.horloge());
  const user = (await s.db.collection(collections.users).where('email', '==', email).limit(1).get())
    .docs[0];
  const artisan = user
    ? (
        await s.db
          .collection(collections.artisans)
          .where('proprietaireUid', '==', user.id)
          .limit(1)
          .get()
      ).docs[0]
    : undefined;
  const prospect = artisan
    ? undefined
    : await s.db.collection(collections.prospects).doc(empreinteEmail(email)).get();
  if (!artisan && !prospect?.exists) return null;
  const refs = artisan ? { artisanId: artisan.id } : { prospectId: prospect!.id };
  const ouvertes = await s.db
    .collection(collections.filesModeration)
    .where('type', '==', 'reponse_commerciale')
    .where('statut', 'in', ['a_traiter', 'en_cours'])
    .get();
  const cle = Object.entries(refs)[0]!;
  if (ouvertes.docs.some((d) => d.get(`refs.${cle[0]}`) === cle[1]))
    return artisan ? 'artisan' : 'prospect';
  const tache = s.db.collection(collections.filesModeration).doc();
  const lot = s.db.batch();
  lot.create(tache, {
    schemaVersion: 1,
    type: 'reponse_commerciale',
    refs,
    priorite: 4,
    statut: 'a_traiter',
    permissionRequise: 'conversion.piloter',
    createdAt: t0,
    updatedAt: t0,
  });
  const pause = { par: `${PREFIXE_TACHE}${tache.id}`, depuis: t0, motif: 'Réponse reçue' };
  if (artisan)
    lot.set(s.db.collection(collections.cycleEtat).doc(artisan.id), { pause }, { merge: true });
  else lot.update(prospect!.ref, { pause, updatedAt: t0 });
  await lot.commit();
  if (artisan)
    await tracer(s.db, s.horloge(), {
      artisanId: artisan.id,
      type: 'tache_creee',
      fonction: 'cycleOnReponseEmail',
      details: { tache: 'reponse_commerciale', tacheId: tache.id },
    });
  return artisan ? 'artisan' : 'prospect';
}
