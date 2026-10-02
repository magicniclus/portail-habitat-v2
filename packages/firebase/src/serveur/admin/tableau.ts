import { AggregateField, Timestamp, type Firestore, type Query } from 'firebase-admin/firestore';
import { collections } from '../../chemins';

/**
 * Tableau de bord de l'admin (ADMIN §2.1, maquette « Admin Tableau de bord ») : compteurs par
 * agrégations Firestore (une lecture pour 1 000 entrées d'index, COUTS), jamais de lecture complète.
 */

export interface TableauDeBordAdmin {
  demandes30j: number;
  demandesAujourdhui: number;
  /** 14 derniers jours, du plus ancien au plus récent. */
  demandesParJour: { jour: number; n: number }[];
  artisansEnLigne: number;
  appelsOffresSansPreneur: number;
  /** `null` sans `finances.lire`. */
  chiffreAffairesHt30j: number | null;
  sante: {
    dernierEvenementStripe: number | null;
    evenementsStripeEnEchec: number;
    envois7j: number;
    envoisEnEchec7j: number;
  };
}

const JOUR_MS = 86_400_000;
const ts = Timestamp.fromMillis;

export async function lireTableauDeBordAdmin(
  db: Firestore,
  e: { maintenant: number; finances: boolean },
): Promise<TableauDeBordAdmin> {
  const debutJour = e.maintenant - (e.maintenant % JOUR_MS);
  const demandes = db.collection(collections.demandes);
  const compter = (q: Query) =>
    q
      .count()
      .get()
      .then((r) => r.data().count);
  const jours = Array.from({ length: 14 }, (_, i) => debutJour - (13 - i) * JOUR_MS);
  const somme = async (collection: string, champ: string, statut?: string) => {
    let q: Query = db
      .collection(collection)
      .where('createdAt', '>=', ts(e.maintenant - 30 * JOUR_MS));
    if (statut) q = q.where('statut', '==', statut);
    const r = await q.aggregate({ total: AggregateField.sum(champ) }).get();
    return r.data().total ?? 0;
  };

  const [d30, dJour, parJour, enLigne, sansPreneur, ca, stripe, stripeKo, envois, echecs] =
    await Promise.all([
      compter(demandes.where('createdAt', '>=', ts(e.maintenant - 30 * JOUR_MS))),
      compter(demandes.where('createdAt', '>=', ts(debutJour))),
      Promise.all(
        jours.map((j) =>
          compter(
            demandes.where('createdAt', '>=', ts(j)).where('createdAt', '<', ts(j + JOUR_MS)),
          ),
        ),
      ),
      compter(
        db
          .collection(collections.artisans)
          .where('enLigne', '==', true)
          .where('statut', '==', 'actif'),
      ),
      compter(
        db
          .collection(collections.appelsOffres)
          .where('statut', '==', 'ouvert')
          .where('nbDeblocages', '==', 0)
          .where('ouvertLe', '<=', ts(e.maintenant - 2 * JOUR_MS)),
      ),
      e.finances
        ? Promise.all([
            somme(collections.factures, 'montantHtCentimes', 'paid'),
            somme(collections.achatsLeads, 'prixHtCentimes'),
          ]).then(([a, b]) => a + b)
        : Promise.resolve(null),
      db.collection(collections.stripeEvents).orderBy('traiteLe', 'desc').limit(1).get(),
      compter(db.collection(collections.stripeEvents).where('ok', '==', false)),
      compter(
        db.collection(collections.emails).where('createdAt', '>=', ts(e.maintenant - 7 * JOUR_MS)),
      ),
      compter(
        db
          .collection(collections.emails)
          .where('statut', '==', 'echec')
          .where('createdAt', '>=', ts(e.maintenant - 7 * JOUR_MS)),
      ),
    ]);

  return {
    demandes30j: d30,
    demandesAujourdhui: dJour,
    demandesParJour: jours.map((jour, i) => ({ jour, n: parJour[i]! })),
    artisansEnLigne: enLigne,
    appelsOffresSansPreneur: sansPreneur,
    chiffreAffairesHt30j: ca,
    sante: {
      dernierEvenementStripe:
        (stripe.docs[0]?.get('traiteLe') as Timestamp | undefined)?.toMillis() ?? null,
      evenementsStripeEnEchec: stripeKo,
      envois7j: envois,
      envoisEnEchec7j: echecs,
    },
  };
}
