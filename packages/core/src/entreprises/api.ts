import { z } from '../zod';
import type { EntrepriseTrouvee } from './analyse';

/**
 * Réponse de l'API Recherche d'entreprises (recherche-entreprises.api.gouv.fr, sans clé), réduite
 * aux champs utiles. Tout le reste est ignoré ; un résultat incomplet est écarté.
 */
const siege = z.object({
  siret: z.string().regex(/^\d{14}$/),
  adresse: z.string().nullish(),
  numero_voie: z.string().nullish(),
  type_voie: z.string().nullish(),
  libelle_voie: z.string().nullish(),
  code_postal: z
    .string()
    .regex(/^\d{5}$/)
    .nullish(),
  libelle_commune: z.string().nullish(),
  latitude: z.coerce.number().nullish(),
  longitude: z.coerce.number().nullish(),
});
const resultat = z.object({
  siren: z.string().regex(/^\d{9}$/),
  nom_complet: z.string().nullish(),
  nom_raison_sociale: z.string().nullish(),
  activite_principale: z.string().nullish(),
  date_creation: z.string().nullish(),
  etat_administratif: z.string().nullish(),
  siege,
  matching_etablissements: z
    .array(z.object({ liste_enseignes: z.array(z.string()).nullish() }))
    .nullish(),
});
export const reponseRechercheEntreprises = z.object({ results: z.array(z.unknown()) });

const ligne = (s: z.output<typeof siege>) =>
  [s.numero_voie, s.type_voie, s.libelle_voie].filter(Boolean).join(' ') || s.adresse || '';

/** Convertit un résultat brut ; `null` s'il manque l'essentiel (adresse du siège). */
export function depuisRechercheEntreprises(brut: unknown): EntrepriseTrouvee | null {
  const r = resultat.safeParse(brut);
  if (!r.success) return null;
  const e = r.data;
  if (!e.siege.code_postal || !e.siege.libelle_commune) return null;
  const enseigne = e.matching_etablissements?.[0]?.liste_enseignes?.[0];
  const geo =
    typeof e.siege.latitude === 'number' && typeof e.siege.longitude === 'number'
      ? { latitude: e.siege.latitude, longitude: e.siege.longitude }
      : undefined;
  return {
    siren: e.siren,
    siret: e.siege.siret,
    raisonSociale: e.nom_raison_sociale ?? e.nom_complet ?? e.siren,
    ...(enseigne ? { nomCommercial: enseigne } : {}),
    ...(e.activite_principale ? { codeNaf: e.activite_principale } : {}),
    ...(e.date_creation ? { dateCreation: e.date_creation } : {}),
    fermee: e.etat_administratif === 'C',
    adresse: {
      ligne1: ligne(e.siege),
      codePostal: e.siege.code_postal,
      ville: e.siege.libelle_commune,
      ...(geo ? { geo } : {}),
    },
  };
}
