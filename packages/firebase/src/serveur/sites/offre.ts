import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { chemins } from '../../chemins';

/**
 * Offre du site selon les droits (écrits par le webhook Stripe seulement) : Site Pro → sans
 * mention, formulaire libre ; sinon retour au gratuit (sous-domaine, 4 champs). Sans site : rien.
 */
export async function synchroniserOffreSite(
  db: Firestore,
  artisanId: string,
  sitePro: boolean,
): Promise<void> {
  const ref = db.doc(chemins.site(artisanId));
  await db.runTransaction(async (t) => {
    const site = await t.get(ref);
    const offre = sitePro ? 'site_pro' : 'gratuit';
    if (!site.exists || site.get('offre') === offre) return;
    t.update(ref, { offre, updatedAt: Timestamp.now() });
  });
}
