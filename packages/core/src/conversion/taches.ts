import type { EtapeCycle } from './index';

const J = 86_400_000;

export type TacheConversion = 'appel_activation' | 'appel_commercial' | 'risque_resiliation';

/**
 * Tâches d'appel créées par le moteur (CONVERSION §3 S3, S5, S8) : activation à J+10 sans mise en
 * ligne (score ≥ 40), appel commercial à J+7 pour un gratuit visé par Premium (score ≥ seuil),
 * risque de résiliation après 14 jours sans connexion. Une par type et par entreprise sur 90 jours.
 */
export function tachesACreer(e: {
  etape: EtapeCycle;
  depuis: number;
  score: number;
  offreCible?: string;
  derniereConnexion?: number;
  seuilAppel: number;
  maintenant: number;
  dernieres: Partial<Record<TacheConversion, number>>;
}): TacheConversion[] {
  const age = e.maintenant - e.depuis;
  const candidates: TacheConversion[] = [];
  if (e.etape === 'compte_cree' && age >= 10 * J && e.score >= 40)
    candidates.push('appel_activation');
  if (
    e.etape === 'gratuit_actif' &&
    e.offreCible === 'premium' &&
    age >= 7 * J &&
    e.score >= e.seuilAppel
  )
    candidates.push('appel_commercial');
  if (
    (e.etape === 'visibilite' || e.etape === 'premium') &&
    e.derniereConnexion !== undefined &&
    e.maintenant - e.derniereConnexion >= 14 * J
  )
    candidates.push('risque_resiliation');
  return candidates.filter((t) => {
    const d = e.dernieres[t];
    return d === undefined || e.maintenant - d >= 90 * J;
  });
}
