import { hotesDuDomaine } from '@ph/core/sites';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { chemins } from '../../chemins';

/**
 * Offre du site selon les droits (écrits par le webhook Stripe seulement) : Site Pro → sans
 * mention, formulaire libre, domaine personnel ; sinon retour au gratuit (sous-domaine, 4 champs).
 * À la résiliation (DOM-07), les index du domaine sont retirés : le site repasse sur son
 * sous-domaine ; le domaine reste la propriété de l'artisan. Sans site : rien.
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
    const nom = site.get('domaine.nom') as string | undefined;
    const index =
      !sitePro && nom
        ? await Promise.all(hotesDuDomaine(nom).map((h) => t.get(db.doc(chemins.domaineSite(h)))))
        : [];
    for (const x of index) if (x.get('siteId') === artisanId) t.delete(x.ref);
    t.update(ref, {
      offre,
      ...(!sitePro && nom ? { 'domaine.statut': 'resilie' } : {}),
      updatedAt: Timestamp.now(),
    });
  });
}
