import { hotesDuDomaine } from '@ph/core/sites';
import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { chemins } from '../../chemins';
import { domaineAchat } from './achatDomaine';

/**
 * Offre du site selon les droits (écrits par le webhook Stripe seulement) : Site Pro → sans
 * mention, formulaire libre, domaine personnel ; sinon retour au gratuit (sous-domaine, 4 champs).
 * À la résiliation (DOM-07), les index du domaine sont retirés : le site repasse sur son
 * sous-domaine ; le domaine reste la propriété de l'artisan (code de transfert envoyé s'il a été
 * acheté chez nous). Domaine choisi avant le paiement : sa commande est lancée. Sans site : rien.
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
    const maintenant = Timestamp.now();
    // Domaine choisi avant le paiement : la commande part maintenant (DOM-02), reprise par la
    // vérification planifiée. Domaine acheté et Site Pro résilié : code de transfert à envoyer.
    const voulu = site.get('domaineVoulu.nom') as string | undefined;
    const achat = site.get('domaine.mode') === 'achat';
    t.update(ref, {
      offre,
      ...(!sitePro && nom
        ? {
            'domaine.statut': 'resilie',
            ...(achat ? { 'domaine.prochaineVerifLe': maintenant } : {}),
          }
        : {}),
      ...(sitePro && voulu && !nom
        ? { domaine: domaineAchat(voulu, maintenant), domaineVoulu: FieldValue.delete() }
        : {}),
      updatedAt: maintenant,
    });
  });
}
