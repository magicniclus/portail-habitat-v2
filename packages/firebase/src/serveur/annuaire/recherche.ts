import { resultatsAnnuaire, type FicheAnnuaire } from '@ph/core/annuaire';
import { plagesGeohash } from '@ph/core/geo';
import { distanceKm } from '@ph/core/matching';
import { artisanPublic, type FiltresAnnuaireUrl } from '@ph/core/schemas';
import type { z } from '@ph/core/zod';
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

/**
 * Carte de l'annuaire depuis une fiche publique ; `null` hors ligne ou hors secteur : le lieu doit
 * être à moins du rayon choisi **et** dans la zone d'intervention de l'artisan (cadrage n° 13).
 */
export function carteAnnuaire(
  id: string,
  a: z.output<typeof artisanPublic>,
  lieu: { latitude: number; longitude: number },
  rayonKm: number,
): ArtisanAnnuaire | null {
  const km = distanceKm(lieu, a.geo);
  if (!a.enLigne || km > rayonKm || km > a.rayonKm) return null;
  return {
    id,
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
  };
}

/** Fiches par plage de geohash : au plus 300 par plage (coût borné, COUTS). */
const MAX_PAR_PLAGE = 300;

/** Fiches en ligne autour d'un lieu : plages de geohash, puis distance exacte (`carteAnnuaire`). */
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
    const carte = carteAnnuaire(d.id, d.data(), lieu, rayonKm);
    if (carte) resultat.push(carte);
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
