import { popularitesIntentions } from '@ph/core/recherche';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';

const J = 86_400_000;
/** En dessous, la popularité saisie à la main est gardée (trop peu de demandes pour juger). */
const MINIMUM_DEMANDES = 200;

/**
 * `intentionsPopularite` (le 1er du mois) : popularité 1 à 5 de chaque intention d'après les
 * demandes des 90 derniers jours ; seules les intentions qui changent sont réécrites (la
 * synchronisation Typesense suit).
 */
export async function recalculerPopularites(
  db: Firestore,
  maintenant: number,
): Promise<{ modifiees: number } | null> {
  const [demandes, intentions] = await Promise.all([
    db
      .collection(collections.demandes)
      .where('createdAt', '>=', Timestamp.fromMillis(maintenant - 90 * J))
      .select('intention')
      .get(),
    db.collection(chemins.intentions()).get(),
  ]);
  const comptes: Record<string, number> = {};
  for (const d of demandes.docs) {
    const i = d.get('intention') as string | undefined;
    if (i) comptes[i] = (comptes[i] ?? 0) + 1;
  }
  const p = popularitesIntentions(
    comptes,
    intentions.docs.map((d) => d.id),
    MINIMUM_DEMANDES,
  );
  if (!p) return null;
  const changees = intentions.docs.filter((d) => d.get('popularite') !== p[d.id]);
  for (let i = 0; i < changees.length; i += 400) {
    const lot = db.batch();
    for (const d of changees.slice(i, i + 400)) lot.update(d.ref, { popularite: p[d.id] });
    await lot.commit();
  }
  return { modifiees: changees.length };
}
