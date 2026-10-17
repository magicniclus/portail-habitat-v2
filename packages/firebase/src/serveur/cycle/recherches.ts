import { idRechercheSecteur, type CompteurRecherches } from '@ph/core/conversion';
import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { collections } from '../../chemins';

const J = 86_400_000;
const CONSERVATION_MS = 40 * J;

/**
 * Recherche de l'annuaire avec un métier et une ville : une seule écriture (compteur du jour et
 * apparitions des fiches de la 1re page). Aucune donnée personnelle, supprimé après 40 jours.
 */
export async function compterRechercheSecteur(
  s: { db: Firestore; horloge: () => number },
  e: { metier: string; ville: string; premierePage: readonly string[] },
): Promise<void> {
  const maintenant = s.horloge();
  const jour = new Date(maintenant).toISOString().slice(0, 10);
  await s.db
    .collection(collections.recherchesSecteur)
    .doc(idRechercheSecteur(jour, e.metier, e.ville))
    .set(
      {
        schemaVersion: 1,
        jour,
        metier: e.metier,
        ville: e.ville,
        n: FieldValue.increment(1),
        premierePage: Object.fromEntries(e.premierePage.map((id) => [id, FieldValue.increment(1)])),
        expireLe: Timestamp.fromMillis(maintenant + CONSERVATION_MS),
      },
      { merge: true },
    );
}

/** Compteurs des 30 derniers jours (une lecture par passage de `cycleCalculer`). */
export async function lireRecherchesSecteur(
  db: Firestore,
  maintenant: number,
): Promise<CompteurRecherches[]> {
  const depuis = new Date(maintenant - 30 * J).toISOString().slice(0, 10);
  const r = await db.collection(collections.recherchesSecteur).where('jour', '>=', depuis).get();
  return r.docs.map((d) => ({
    jour: d.get('jour') as string,
    metier: d.get('metier') as string,
    ville: d.get('ville') as string,
    n: (d.get('n') as number | undefined) ?? 0,
    premierePage: (d.get('premierePage') as Record<string, number> | undefined) ?? {},
  }));
}
