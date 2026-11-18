import { Timestamp } from 'firebase-admin/firestore';
import { chemins, fichiers, GROUPE_PLANS, type ProprietairePlan } from '../../chemins';
import { supprimerPartagesDuPlan } from './partages';
import { JOURS_CORBEILLE, lirePlan, listerPlans, type ServicesDessin } from './plans';

const JOUR = 24 * 60 * 60 * 1000;

/** Propriétaire déduit du chemin `users/{uid}/plans/{id}` ou `artisans/{aid}/plans/{id}`. */
function proprietaireDe(chemin: string): ProprietairePlan | null {
  const [racine, id] = chemin.split('/');
  if (!id) return null;
  if (racine === 'users') return { type: 'particulier', id };
  if (racine === 'artisans') return { type: 'entreprise', id };
  return null;
}

/** Purge de nuit (DESSIN.md §4) : plans à la corbeille depuis plus de 30 jours, fichiers compris. */
export async function purgerCorbeilleDessin(s: ServicesDessin): Promise<{ supprimes: number }> {
  const limite = Timestamp.fromMillis(s.horloge() - JOURS_CORBEILLE * JOUR);
  const r = await s.db
    .collectionGroup(GROUPE_PLANS)
    .where('supprimeLe', '<=', limite)
    .limit(200)
    .get();
  let supprimes = 0;
  for (const doc of r.docs) {
    const p = proprietaireDe(doc.ref.path);
    if (!p) continue;
    await s.bucket.deleteFiles({ prefix: fichiers.dossierPlan(p, doc.id), force: true });
    await supprimerPartagesDuPlan(s, p, doc.id);
    await s.db.recursiveDelete(doc.ref);
    supprimes++;
  }
  return { supprimes };
}

/** Suppression de compte (RGPD) : tous les plans du propriétaire et leurs fichiers. */
export async function supprimerTousLesPlans(s: ServicesDessin, p: ProprietairePlan) {
  const plans = await s.db.collection(chemins.plans(p)).select().get();
  for (const d of plans.docs) await supprimerPartagesDuPlan(s, p, d.id);
  await s.bucket.deleteFiles({ prefix: fichiers.dossierDessin(p), force: true });
  await s.db.recursiveDelete(s.db.collection(chemins.plans(p)));
}

/**
 * Fermeture d'une entreprise (décision du propriétaire, 18/11/2026) : ses plans passent à la
 * corbeille ; la purge de nuit les supprime 30 jours plus tard (fichiers et liens compris).
 */
export async function corbeillePlansEntreprise(
  s: Pick<ServicesDessin, 'db' | 'horloge'>,
  artisanId: string,
) {
  const ref = s.db.collection(chemins.plans({ type: 'entreprise', id: artisanId }));
  const actifs = await ref.where('supprimeLe', '==', null).get();
  const maintenant = Timestamp.fromMillis(s.horloge());
  await Promise.all(actifs.docs.map((d) => d.ref.update({ supprimeLe: maintenant })));
  return actifs.size;
}

/** Export RGPD d'un particulier (accès et portabilité) : titre, dates et scène de chaque plan. */
export async function exporterPlans(s: ServicesDessin, uid: string) {
  const ctx = { proprietaire: { type: 'particulier' as const, id: uid }, uid };
  const plans = await listerPlans(s, ctx);
  return Promise.all(
    plans.map(async (plan) => ({ ...plan, scene: (await lirePlan(s, ctx, plan.planId)).scene })),
  );
}
