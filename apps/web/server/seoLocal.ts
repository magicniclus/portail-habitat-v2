import 'server-only';
import { slugifier } from '@ph/core/format';
import { cache } from 'react';
import { COMMUNES } from '@/features/diagnostic/communes';
import intentions from '../../../docs/data/recherche-intentions.json';
import catalogue from '../../../docs/data/prestations-catalogue.json';

/** Commune d'une page locale : nom officiel, centre, code postal, population. */
export interface CommuneLocale {
  nom: string;
  slug: string;
  codePostal: string;
  centre: { latitude: number; longitude: number };
}

/** Communes mises en avant (index des métiers, plan du site) : Bordeaux et la rive droite. */
export const VILLES_LOCALES = ['Bordeaux', ...COMMUNES.map((c) => c.nom)];

const METIERS = Object.values(
  intentions.metiers as Record<string, { id: string; nom: string; famille: string }>,
);
const PRESTATIONS = catalogue.prestations as {
  id: string;
  nom: string;
  famille: string;
  pitch: string;
  repere: string;
}[];

export const metierParId = (id: string) => METIERS.find((m) => m.id === id) ?? null;
export const prestationParId = (id: string) => PRESTATIONS.find((p) => p.id === id) ?? null;
/** Métiers qui réalisent les travaux d'une famille (pages « travaux à une ville »). */
export const metiersDeFamille = (famille: string) =>
  METIERS.filter((m) => m.famille === famille).map((m) => m.id);
export const prestationsDeFamille = (famille: string) =>
  PRESTATIONS.filter((p) => p.famille === famille).map(({ id, nom }) => ({ id, nom }));
export const tousLesMetiers = () => [...METIERS].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));

/**
 * Commune d'après le dernier segment de l'adresse (« carignan-de-bordeaux ») : API Découpage
 * administratif (gratuite, cache 1 jour), la plus peuplée parmi les homonymes exacts. `null`
 * seulement si la commune n'existe pas : une panne de l'API lève une erreur, pour qu'une 404
 * ne soit jamais mise en cache par erreur (la page sera rendue à la visite suivante).
 */
export const communeParSlug = cache(async (slug: string): Promise<CommuneLocale | null> => {
  if (!/^[a-z0-9-]{2,80}$/.test(slug)) return null;
  const url = `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(slug.replace(/-/g, ' '))}&fields=nom,centre,codesPostaux,population&boost=population&limit=10`;
  let r: Response | null = null;
  for (let essai = 0; essai < 2 && !r?.ok; essai++)
    r = await fetch(url, { next: { revalidate: 86_400 }, signal: AbortSignal.timeout(5000) }).catch(
      () => null,
    );
  if (!r?.ok) throw new Error(`Communes indisponibles (${r?.status ?? 'réseau'})`);
  const c = (
    (await r.json()) as {
      nom: string;
      codesPostaux?: string[];
      centre?: { coordinates: [number, number] };
    }[]
  ).find((x) => slugifier(x.nom) === slug && x.centre);
  return c
    ? {
        nom: c.nom,
        slug,
        codePostal: c.codesPostaux?.[0] ?? '',
        centre: { latitude: c.centre!.coordinates[1], longitude: c.centre!.coordinates[0] },
      }
    : null;
});

/** Toutes les prestations du simulateur (plan du site). */
export const toutesLesPrestations = () => PRESTATIONS.map(({ id, nom }) => ({ id, nom }));
