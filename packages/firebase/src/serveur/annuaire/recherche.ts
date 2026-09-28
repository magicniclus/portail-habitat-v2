import { resultatsAnnuaire, type FicheAnnuaire } from '@ph/core/annuaire';
import { plagesGeohash } from '@ph/core/geo';
import { distanceKm } from '@ph/core/matching';
import { artisanPublic, type FiltresAnnuaireUrl } from '@ph/core/schemas';
import type { Firestore } from 'firebase-admin/firestore';
import { collections } from '../../chemins';
import { depot } from '../depot';

/** Carte de l'annuaire : champs publics seulement, distance au lieu recherché. */
export interface ArtisanAnnuaire extends FicheAnnuaire {
  slug: string;
  ville: string;
  metierPrincipal: string;
  logoUrl?: string;
  telephone: string | null;
  anneesActivite?: number;
  budgetMin?: number;
  budgetMax?: number;
}

export interface ResultatsAnnuaire {
  premium: ArtisanAnnuaire[];
  standards: ArtisanAnnuaire[];
}

/** Fiches par plage de geohash : au plus 300 par plage (coût borné, COUTS). */
const MAX_PAR_PLAGE = 300;

/**
 * Fiches en ligne autour d'un lieu (geohash, puis distance exacte). Un artisan n'apparaît que si
 * le lieu est à moins du rayon choisi **et** dans sa propre zone d'intervention (cadrage n° 13).
 */
export async function fichesAutour(
  db: Firestore,
  lieu: { latitude: number; longitude: number },
  rayonKm: number,
): Promise<ArtisanAnnuaire[]> {
  const fiches = depot(db, collections.artisansPublic, artisanPublic).reference;
  const lots = await Promise.all(
    plagesGeohash(lieu, rayonKm).map(([debut, fin]) =>
      fiches.orderBy('geohash').startAt(debut).endBefore(fin).limit(MAX_PAR_PLAGE).get(),
    ),
  );
  const vus = new Set<string>();
  const resultat: ArtisanAnnuaire[] = [];
  for (const d of lots.flatMap((l) => l.docs)) {
    if (vus.has(d.id)) continue;
    vus.add(d.id);
    const a = d.data();
    const km = distanceKm(lieu, a.geo);
    if (!a.enLigne || km > rayonKm || km > a.rayonKm) continue;
    resultat.push({
      id: d.id,
      slug: a.slug,
      nom: a.nomCommercial,
      metiers: a.metiers,
      metierPrincipal: a.metierPrincipal,
      pitch: a.pitch,
      tags: a.tags,
      ville: a.ville,
      km: Math.round(km * 10) / 10,
      note: a.noteMoyenne,
      avis: a.nbAvis,
      premium: a.premium,
      labels: a.labels,
      delaiJ: a.delaiDispoJours ?? 99,
      score: a.scoreClassement,
      telephone: a.telephone,
      ...(a.budgetCle ? { budgetCle: a.budgetCle } : {}),
      ...(a.logoUrl ? { logoUrl: a.logoUrl } : {}),
      ...(a.anneesActivite !== undefined ? { anneesActivite: a.anneesActivite } : {}),
      ...(a.budgetMin !== undefined ? { budgetMin: a.budgetMin } : {}),
      ...(a.budgetMax !== undefined ? { budgetMax: a.budgetMax } : {}),
    });
  }
  return resultat;
}

/**
 * Filtres et tri de l'annuaire (README) sur les fiches du secteur. `idsTexte` : ordre donné par
 * Typesense pour le texte (D4) ; sans lui, recherche de repli mot à mot (ANN-04).
 */
export function trierResultats(
  fiches: ArtisanAnnuaire[],
  f: FiltresAnnuaireUrl,
  idsTexte: string[] | null = null,
): ResultatsAnnuaire {
  const liste = idsTexte ? idsTexte.flatMap((id) => fiches.filter((a) => a.id === id)) : fiches;
  return resultatsAnnuaire(
    liste,
    {
      q: idsTexte ? '' : f.q,
      metiers: f.metier,
      rayonKm: f.rayon,
      noteMin: f.note,
      labels: f.labels,
      dispo: f.dispo,
      budget: f.budget,
    },
    f.tri,
  );
}
