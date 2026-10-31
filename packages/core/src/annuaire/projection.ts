import type { artisan, artisanPublic } from '../schemas/artisans';
import type { z } from '../zod';
import { bannieresMax } from './bannieres';
import { scoreClassement } from './classement';

type Artisan = z.output<typeof artisan>;
type ArtisanPublic = z.input<typeof artisanPublic>;

const ANNEE_MS = 365.25 * 86_400_000;

/** Téléphone public : formules avec coordonnées visibles seulement (ANN-06, PAIEMENTS §2). */
export const telephoneAffiche = (a: Pick<Artisan, 'droits' | 'telephonePublic'>) =>
  a.droits.coordonneesVisibles && a.telephonePublic ? a.telephonePublic : null;

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
    // Après une résiliation, seules les premières bannières permises restent visibles.
    bannieres: a.bannieres.length ? a.bannieres.slice(0, bannieresMax(a.droits)) : undefined,
    videoUrl: a.videoUrl,
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
    misEnAvant: a.droits.ficheMiseEnAvant,
    badgeRecommande: a.droits.badgeRecommande,
    telephone: telephoneAffiche(a),
    scoreClassement: scoreClassement({ ...a, anneesActivite }),
    enLigne: true,
    updatedAt: maintenant,
  };
}
