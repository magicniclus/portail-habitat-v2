import 'server-only';
import { lireFiltresAnnuaire, plusProches } from '@ph/core/annuaire';
import { trierResultats } from '@ph/firebase/annuaire';
import { artisansAlentour, artisansAutour } from './annuaire';
import { communesProches } from './communesProches';
import type { CommuneLocale } from './seoLocal';

/** Rayon des pages locales : celui proposé par défaut dans l'annuaire. */
export const RAYON_LOCAL = 20;

/**
 * Artisans d'une page locale : ceux du secteur qui exercent ces métiers (partenaires et premium
 * d'abord, puis par pertinence) ; à défaut, les plus proches. Communes voisines pour les liens.
 */
export async function donneesLocales(commune: CommuneLocale, metiers: string[]) {
  const lieu = { nom: commune.nom, ...commune.centre };
  const [fiches, voisines] = await Promise.all([
    artisansAutour(lieu, RAYON_LOCAL),
    communesProches(commune.centre, 25, 13),
  ]);
  // Mêmes réglages que l'annuaire filtré sur ce métier autour de cette commune (lien des filtres).
  const f = lireFiltresAnnuaire({
    metier: metiers.join(','),
    rayon: String(RAYON_LOCAL),
    ville: commune.nom,
    lat: String(commune.centre.latitude),
    lon: String(commune.centre.longitude),
  });
  const r = trierResultats(fiches, f, null);
  const trouves = [...r.premium, ...r.standards];
  const artisans = trouves.length
    ? trouves
    : plusProches(await artisansAlentour(lieu), { metiers });
  return {
    f,
    r,
    artisans,
    repli: !trouves.length && artisans.length > 0,
    nbSecteur: trouves.length,
    voisines: voisines.filter((v) => v !== commune.nom).slice(0, 12),
  };
}
