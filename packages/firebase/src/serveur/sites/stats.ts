import type { CompteursSite } from '@ph/core/sites';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { chemins } from '../../chemins';

const jourParis = (ms: number) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(ms);

/** Jour et mois courants à Paris (`AAAA-MM-JJ`, `AAAA-MM`). */
export const periodesParis = (ms: number) => {
  const jour = jourParis(ms);
  return { jour, mois: jour.slice(0, 7) };
};

async function incrementer(
  db: Firestore,
  siteId: string,
  maintenant: number,
  champs: Record<string, FieldValue | Record<string, FieldValue>>,
) {
  const { jour, mois } = periodesParis(maintenant);
  const lot = db.batch();
  for (const ref of [
    db.doc(chemins.statsJourSite(siteId, jour)),
    db.doc(chemins.statsMoisSite(siteId, mois)),
  ])
    lot.set(ref, { schemaVersion: 1, ...champs }, { merge: true });
  await lot.commit();
}

/** Page vue sur un site publié : compteur du jour et du mois, sans identifiant de visiteur. */
export const compterVueSite = (db: Firestore, siteId: string, pageId: string, maintenant: number) =>
  incrementer(db, siteId, maintenant, {
    vues: FieldValue.increment(1),
    // `set` + `merge` : objet imbriqué (un point dans la clé ne serait pas un chemin).
    pages: { [pageId]: FieldValue.increment(1) },
  });

/** Formulaire envoyé depuis le site. */
export const compterDemandeSite = (db: Firestore, siteId: string, maintenant: number) =>
  incrementer(db, siteId, maintenant, { demandes: FieldValue.increment(1) });

/** Compteurs des périodes demandées (jours ou mois) ; une période sans visite est absente. */
export async function lireStatsSite(
  db: Firestore,
  siteId: string,
  type: 'jour' | 'mois',
  periodes: string[],
): Promise<CompteursSite[]> {
  if (!periodes.length) return [];
  const chemin = type === 'jour' ? chemins.statsJourSite : chemins.statsMoisSite;
  const docs = await db.getAll(...periodes.map((p) => db.doc(chemin(siteId, p))));
  return docs
    .filter((d) => d.exists)
    .map((d) => ({
      cle: d.id,
      vues: (d.get('vues') as number | undefined) ?? 0,
      demandes: (d.get('demandes') as number | undefined) ?? 0,
      pages: (d.get('pages') as Record<string, number> | undefined) ?? {},
    }));
}
