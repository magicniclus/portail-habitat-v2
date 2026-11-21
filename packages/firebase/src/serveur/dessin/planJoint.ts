import { sceneSansLocalisation, type Scene } from '@ph/core/dessin';
import { ErreurMetier } from '@ph/core/erreurs';
import { artisanAAccepte } from '@ph/core/espace';
import { chemins } from '../../chemins';
import { lireScene, type ServicesDessin } from './plans';

/**
 * Plan joint à une demande (DES-44), lu par l'artisan qui l'a **acceptée** : aucun jeton,
 * l'accès est vérifié à chaque lecture. Le plan appartient au client : s'il l'a retiré
 * (corbeille ou suppression), l'artisan ne voit plus rien (décision du 18/11/2026).
 */
export const PLAN_RETIRE = 'Le client a retiré son plan.';

export async function lirePlanJoint(
  s: Pick<ServicesDessin, 'db' | 'bucket'>,
  artisanId: string,
  demandeId: string,
): Promise<{ titre: string; scene: Scene }> {
  const [a, d] = await Promise.all([
    s.db.doc(chemins.attribution(demandeId, artisanId)).get(),
    s.db.doc(chemins.demande(demandeId)).get(),
  ]);
  if (!a.exists || !artisanAAccepte(a.get('statut') as Parameters<typeof artisanAAccepte>[0]))
    throw new ErreurMetier('PERMISSION_REFUSEE');
  const joint = d.get('planJoint') as { planId: string; proprietaireId: string } | undefined;
  if (!joint) throw new ErreurMetier('INTROUVABLE', 'Aucun plan n’est joint à cette demande.');
  const plan = await s.db
    .doc(chemins.plan({ type: 'particulier', id: joint.proprietaireId }, joint.planId))
    .get();
  if (!plan.exists || plan.get('supprimeLe')) throw new ErreurMetier('INTROUVABLE', PLAN_RETIRE);
  return {
    titre: plan.get('titre') as string,
    scene: sceneSansLocalisation(
      await lireScene(s as ServicesDessin, plan.get('storagePath') as string),
    ),
  };
}
