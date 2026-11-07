import { remisePossible } from './index';

/** Raisons proposées avant de confirmer une résiliation (CONVERSION §3 S8). */
export const RAISONS_RESILIATION = {
  trop_cher: 'C’est trop cher pour moi',
  pas_assez_demandes: 'Je ne reçois pas assez de demandes',
  saison_creuse: 'Saison creuse, ou j’ai trop de travail en ce moment',
  autre: 'Une autre raison',
} as const;
export type RaisonResiliation = keyof typeof RAISONS_RESILIATION;

export type AlternativeResiliation =
  | { type: 'descendre' }
  | { type: 'remise'; pourcentage: 50; mois: 2 }
  | { type: 'suspendre'; mois: 2 }
  | { type: 'appel' };

/**
 * Alternative adaptée à la raison (D32c ⏳ : −50 % pendant 2 mois, réservé à la rétention) ;
 * une seule offre de rétention (remise ou suspension) par 12 mois, sinon un appel.
 */
export function alternativeResiliation(
  raison: RaisonResiliation,
  e: { produit: 'premium' | 'visibilite'; maintenant: number; derniereOffreRetention?: number },
): AlternativeResiliation {
  if (raison === 'trop_cher' && e.produit === 'premium') return { type: 'descendre' };
  if (raison === 'autre') return { type: 'appel' };
  const offrePossible = remisePossible({
    pourcentage: 50,
    retention: true,
    maintenant: e.maintenant,
    ...(e.derniereOffreRetention !== undefined
      ? { derniereOffreRetention: e.derniereOffreRetention }
      : {}),
  });
  if (!offrePossible) return { type: 'appel' };
  return raison === 'saison_creuse'
    ? { type: 'suspendre', mois: 2 }
    : { type: 'remise', pourcentage: 50, mois: 2 };
}
