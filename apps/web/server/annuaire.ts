import 'server-only';
import { COLLECTION_ARTISANS, LIEU_DEFAUT, parametresRechercheArtisans } from '@ph/core/annuaire';
import { appAdmin } from '@ph/firebase/admin';
import {
  fichesAutour,
  lireFichePublique,
  slugsEnLigne,
  type ArtisanAnnuaire,
  type FichePublique,
} from '@ph/firebase/annuaire';
import { getFirestore } from 'firebase-admin/firestore';
import { cache } from 'react';
import { lire } from './lecture';

export interface Lieu {
  nom: string;
  latitude: number;
  longitude: number;
  /** Le lieu saisi n'a pas été reconnu : recherche autour du lieu par défaut. */
  inconnu?: boolean;
}

interface SourceAnnuaire {
  autour(lieu: Lieu, rayonKm: number): Promise<ArtisanAnnuaire[]>;
  fiche(slug: string): Promise<FichePublique | null>;
  slugs(): Promise<string[]>;
  lieu(ville: string): Promise<Lieu | null>;
}

/**
 * Données de démonstration (jeu de test généré en mémoire) : pour les tests de bout en bout sans
 * base de données. `ANNUAIRE_DEMO=1` est refusé en production (faux artisans interdits, D49).
 */
function modeDemo(env = process.env): boolean {
  const demo = env.ANNUAIRE_DEMO === '1';
  if (demo && env.VERCEL_ENV === 'production')
    throw new Error('ANNUAIRE_DEMO=1 est interdit en production.');
  return demo;
}

const db = () => getFirestore(appAdmin());

/** Commune ou code postal → centre (API Découpage administratif, gratuite ; cache 1 jour). */
async function geocoder(ville: string): Promise<Lieu | null> {
  const param = /^\d{5}$/.test(ville) ? `codePostal=${ville}` : `nom=${encodeURIComponent(ville)}`;
  try {
    const r = await fetch(
      `https://geo.api.gouv.fr/communes?${param}&fields=nom,centre&boost=population&limit=1`,
      { next: { revalidate: 86_400 }, signal: AbortSignal.timeout(1500) },
    );
    if (!r.ok) return null;
    const [c] = (await r.json()) as { nom: string; centre: { coordinates: [number, number] } }[];
    return c
      ? { nom: c.nom, latitude: c.centre.coordinates[1], longitude: c.centre.coordinates[0] }
      : null;
  } catch {
    return null;
  }
}

const firestore: SourceAnnuaire = {
  autour: async (lieu, rayon) =>
    (await lire('annuaire', () => fichesAutour(db(), lieu, rayon))) ?? [],
  fiche: async (slug) => lire('fiche', () => lireFichePublique(db(), slug)),
  slugs: async () => (await lire('slugs', () => slugsEnLigne(db()))) ?? [],
  lieu: geocoder,
};

async function source(): Promise<SourceAnnuaire> {
  return modeDemo() ? (await import('./annuaireDemo')).sourceDemo : firestore;
}

/** Lieu de la recherche : saisi, sinon Bordeaux (lancement en Gironde). */
export const resoudreLieu = cache(async (ville: string): Promise<Lieu> => {
  if (!ville) return LIEU_DEFAUT;
  return (await (await source()).lieu(ville)) ?? { ...LIEU_DEFAUT, inconnu: true };
});

export const artisansAutour = cache(async (lieu: Lieu, rayonKm: number) =>
  (await source()).autour(lieu, rayonKm),
);

export const lireFiche = cache(async (slug: string) => (await source()).fiche(slug));

export const lireSlugs = async () => (await source()).slugs();

/**
 * Ordre des artisans pour un texte, donné par Typesense (D4) s'il est configuré ; sinon `null` et
 * la recherche de repli mot à mot s'applique (ANN-04).
 */
export async function idsTexte(q: string, lieu: Lieu, rayonKm: number): Promise<string[] | null> {
  const hote = process.env.TYPESENSE_HOTE?.replace(/\/$/, '');
  const cle = process.env.TYPESENSE_CLE_RECHERCHE;
  if (!q || !hote || !cle || modeDemo()) return null;
  try {
    const r = await fetch(
      `${hote}/collections/${COLLECTION_ARTISANS}/documents/search?${new URLSearchParams(parametresRechercheArtisans(q, lieu, rayonKm))}`,
      { headers: { 'X-TYPESENSE-API-KEY': cle }, signal: AbortSignal.timeout(800) },
    );
    if (!r.ok) return null;
    const corps = (await r.json()) as { hits?: { document: { id: string } }[] };
    return (corps.hits ?? []).map((h) => h.document.id);
  } catch {
    return null;
  }
}
