import type { DocArtisan } from '@ph/core/matching';
import type { Point } from '@ph/core/matching';
import { plagesGeohash } from '@ph/core/geo';
import type { DocumentData, Firestore, Timestamp } from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';

/** Lectures du matching : référentiel des métiers (mis en cache) et candidats de la zone. */

export interface ReferentielMetiers {
  intentions: { id: string; metier: string; prestation: string }[];
  metiers: { id: string; prestation?: string; famille?: string }[];
}

let cache: { valeur: ReferentielMetiers; lu: number } | null = null;
const DUREE_CACHE_MS = 10 * 60_000;

export async function lireReferentielMetiers(
  db: Firestore,
  maintenant: number,
): Promise<ReferentielMetiers> {
  if (cache && maintenant - cache.lu < DUREE_CACHE_MS) return cache.valeur;
  const [intentions, metiers] = await Promise.all([
    db.collection(chemins.intentions()).get(),
    db.collection(chemins.metiersRecherche()).get(),
  ]);
  const valeur = {
    intentions: intentions.docs.map((d) => ({
      id: d.id,
      metier: d.get('metier') as string,
      prestation: d.get('prestation') as string,
    })),
    metiers: metiers.docs.map((d) => ({
      id: d.id,
      prestation: d.get('prestationDefaut') as string | undefined,
      famille: d.get('famille') as string | undefined,
    })),
  };
  cache = { valeur, lu: maintenant };
  return valeur;
}

/** Réinitialise le cache (tests). */
export const viderCacheReferentiel = () => {
  cache = null;
};

const ms = (t: unknown) => (t as Timestamp | undefined)?.toMillis?.();

/** Document `artisans/{id}` vers les champs lus par l'adaptateur du moteur (dates en ms). */
export function versDocArtisan(d: DocumentData): DocArtisan {
  const labels = Object.fromEntries(
    Object.entries((d.labelsVerifies ?? {}) as Record<string, { expireLe?: unknown }>).map(
      ([k, v]) => [k, ms(v.expireLe) !== undefined ? { expireLe: ms(v.expireLe) } : {}],
    ),
  );
  const verifieLe = ms(d.verification?.verifieLe);
  const finDecennale = ms(d.assuranceDecennale?.fin);
  const rgeExpire = ms(d.rge?.expireLe);
  const derniere = ms(d.derniereAttributionLe);
  return {
    siren: d.siren,
    zoneIntervention: { centre: d.zoneIntervention.centre, rayonKm: d.zoneIntervention.rayonKm },
    metierPrincipal: d.metierPrincipal,
    metiers: d.metiers ?? [],
    intentions: d.intentions ?? [],
    tags: d.tags ?? [],
    verification: {
      statut: d.verification?.statut ?? 'a_faire',
      ...(verifieLe !== undefined ? { verifieLe } : {}),
    },
    ...(finDecennale !== undefined ? { assuranceDecennale: { fin: finDecennale } } : {}),
    labelsVerifies: labels,
    ...(d.rge
      ? { rge: { verifie: d.rge.verifie === true, ...(rgeExpire ? { expireLe: rgeExpire } : {}) } }
      : {}),
    sanctionActive: d.statut === 'suspendu',
    enPause: d.pause === true,
    demandesRecuesMois: d.demandesRecuesMois ?? 0,
    quotaDemandesMois: d.quotaDemandesMois ?? 0,
    ...(d.budgetMin !== undefined ? { budgetMin: d.budgetMin } : {}),
    ...(d.budgetMax !== undefined ? { budgetMax: d.budgetMax } : {}),
    plan: d.plan ?? 'gratuit',
    optionVisibilite: d.optionVisibilite === true,
    noteMoyenne: d.noteMoyenne ?? 0,
    nbAvis: d.nbAvis ?? 0,
    tauxRecommandation: d.tauxRecommandation ?? 0,
    tauxReponse: d.tauxReponse ?? 0,
    tempsReponseMoyenMin: d.tempsReponseMoyenMin ?? 1440,
    ...(d.delaiDispoJours !== undefined ? { delaiDispoJours: d.delaiDispoJours } : {}),
    completude: d.completude ?? 0,
    ...(derniere !== undefined ? { derniereAttributionLe: derniere } : {}),
  };
}

/** Au plus 200 candidats (MATCHING [2]) : fiches en ligne du métier dans le rayon maximal. */
const MAX_CANDIDATS = 200;

export async function chercherCandidats(
  db: Firestore,
  centre: Point,
  metier: string,
  rayonKm: number,
): Promise<{ id: string; data: DocumentData }[]> {
  const publics = db.collection(collections.artisansPublic);
  const pages = await Promise.all(
    plagesGeohash(centre, rayonKm).map(([debut, fin]) =>
      publics
        .where('enLigne', '==', true)
        .where('metiers', 'array-contains', metier)
        .orderBy('geohash')
        .startAt(debut)
        .endBefore(fin)
        .limit(MAX_CANDIDATS)
        .get(),
    ),
  );
  const ids = [...new Set(pages.flatMap((p) => p.docs.map((d) => d.id)))].slice(0, MAX_CANDIDATS);
  if (!ids.length) return [];
  const docs = await db.getAll(...ids.map((id) => db.doc(chemins.artisan(id))));
  return docs.filter((d) => d.exists).map((d) => ({ id: d.id, data: d.data()! }));
}
