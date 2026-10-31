import { ErreurMetier } from '@ph/core/erreurs';
import type { SuiviSite } from '@ph/core/sites';
import { FieldValue } from 'firebase-admin/firestore';
import { chemins } from '../../chemins';
import { exigerSite, type ContexteSite, type ServicesSites } from './edition';

/**
 * Balise Google et pixel Meta du site (onglet « Suivi et publicité ») : identifiants déjà validés
 * par le schéma ; actifs sur le site en ligne dès l'enregistrement (lus à chaque rendu, comme le
 * formulaire), derrière le bandeau de consentement.
 */
export async function enregistrerSuivi(
  s: ServicesSites,
  ctx: ContexteSite,
  suivi: SuiviSite,
): Promise<void> {
  await s.db.runTransaction(async (t) => {
    await exigerSite(s, t, ctx);
    const site = await t.get(s.db.doc(chemins.site(ctx.artisanId)));
    if (!site.exists) throw new ErreurMetier('INTROUVABLE');
    t.update(site.ref, { suivi, updatedAt: FieldValue.serverTimestamp() });
  });
}
