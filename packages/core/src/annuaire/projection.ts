import type { artisan, artisanPublic } from '../schemas/artisans';
import type { z } from '../zod';
import { scoreClassement } from './classement';

type Artisan = z.output<typeof artisan>;
type ArtisanPublic = z.input<typeof artisanPublic>;

const ANNEE_MS = 365.25 * 86_400_000;

/** Téléphone public : Premium ou option Visibilité seulement (ANN-06, DATABASE §3). */
export const telephoneAffiche = (
  a: Pick<Artisan, 'plan' | 'optionVisibilite' | 'telephonePublic'>,
) => ((a.plan === 'premium' || a.optionVisibilite) && a.telephonePublic ? a.telephonePublic : null);

/** Labels affichés : seulement ceux qui ont une preuve vérifiée et non expirée (FIC-01). */
export function labelsVerifies(a: Pick<Artisan, 'labels' | 'labelsVerifies'>, maintenant: Date) {
  return a.labels.filter((l) => {
    const v = a.labelsVerifies[l];
    return v !== undefined && (v.expireLe === undefined || v.expireLe > maintenant);
  });
}

/**
 * Fiche publique `artisansPublic/{id}` (DATABASE §3) calculée depuis la fiche privée : liste
 * blanche de champs (aucune donnée personnelle, règle n° 8). `null` : la fiche n'est pas publiée.
 */
export function projeterArtisanPublic(
  a: Artisan,
  maintenant: Date,
  ville: string,
): ArtisanPublic | null {
  if (!a.enLigne || a.statut !== 'actif') return null;
  const anneesActivite = a.dateCreationEntreprise
    ? Math.max(
        0,
        Math.floor((maintenant.getTime() - a.dateCreationEntreprise.getTime()) / ANNEE_MS),
      )
    : undefined;
  const optionnels = {
    logoUrl: a.logoUrl,
    anneesActivite,
    budgetMin: a.budgetMin,
    budgetMax: a.budgetMax,
    budgetCle: a.budgetCle,
    delaiDispoJours: a.delaiDispoJours,
  };
  return {
    schemaVersion: 1,
    slug: a.slug,
    nomCommercial: a.nomCommercial,
    metiers: a.metiers,
    metierPrincipal: a.metierPrincipal,
    intentions: a.intentions,
    tags: a.tags,
    pitch: a.pitch,
    description: a.description,
    ...Object.fromEntries(Object.entries(optionnels).filter(([, v]) => v !== undefined)),
    ville,
    geo: a.zoneIntervention.centre,
    geohash: a.zoneIntervention.geohash,
    rayonKm: a.zoneIntervention.rayonKm,
    labels: labelsVerifies(a, maintenant),
    noteMoyenne: a.noteMoyenne,
    nbAvis: a.nbAvis,
    notesCriteres: a.notesCriteres,
    premium: a.plan === 'premium',
    telephone: telephoneAffiche(a),
    scoreClassement: scoreClassement({ ...a, anneesActivite }),
    enLigne: true,
    updatedAt: maintenant,
  };
}
