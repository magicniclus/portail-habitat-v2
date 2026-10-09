import type { Firestore } from 'firebase-admin/firestore';
import { collections } from '../../chemins';

/**
 * 1er du mois (INTEGRATIONS §3) : `demandesRecuesMois` remis à zéro pour toutes les entreprises
 * qui en ont reçu, par lots de 400 écritures (quota mensuel de demandes, MATCHING).
 */
export async function remettreCompteursMois(db: Firestore): Promise<{ remises: number }> {
  let remises = 0;
  for (;;) {
    const r = await db
      .collection(collections.artisans)
      .where('demandesRecuesMois', '>', 0)
      .limit(400)
      .get();
    if (r.empty) break;
    const lot = db.batch();
    for (const d of r.docs) lot.update(d.ref, { demandesRecuesMois: 0 });
    await lot.commit();
    remises += r.size;
  }
  return { remises };
}
