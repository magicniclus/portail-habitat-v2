import type { EtapeCycle } from './index';

/**
 * Position d'une fiche dans son secteur (métier + commune du siège), comme l'annuaire : fiches
 * mises en avant (Visibilité, Premium) d'abord, puis score de classement (CONVERSION §6).
 */
export interface EntreeSecteur {
  id: string;
  metier: string;
  ville: string;
  misEnAvant: boolean;
  score: number;
  vues7j: number;
}

export interface PositionSecteur {
  position: number;
  total: number;
  misesEnAvant: number;
  vuesMisesEnAvant: number;
}

export function classerSecteurs(entrees: readonly EntreeSecteur[]): Map<string, PositionSecteur> {
  const groupes = new Map<string, EntreeSecteur[]>();
  for (const e of entrees) {
    const cle = `${e.metier}|${e.ville.toLowerCase()}`;
    groupes.set(cle, [...(groupes.get(cle) ?? []), e]);
  }
  const res = new Map<string, PositionSecteur>();
  for (const g of groupes.values()) {
    const tries = [...g].sort(
      (x, y) =>
        Number(y.misEnAvant) - Number(x.misEnAvant) ||
        y.score - x.score ||
        x.id.localeCompare(y.id),
    );
    const avant = tries.filter((e) => e.misEnAvant);
    const vuesMisesEnAvant = avant.length
      ? Math.round(avant.reduce((n, e) => n + e.vues7j, 0) / avant.length)
      : 0;
    tries.forEach((e, i) =>
      res.set(e.id, {
        position: i + 1,
        total: tries.length,
        misesEnAvant: avant.length,
        vuesMisesEnAvant,
      }),
    );
  }
  return res;
}

const J = 86_400_000;

/** Emails déclenchés par un changement réel (signal « T ») ; 1 « vis-concurrents » par 3 semaines. */
export function signauxDeclenches(
  etape: EtapeCycle,
  avant: { position?: number; misesEnAvant?: number },
  apres: { position: number; misesEnAvant: number },
  o: { maintenant: number; dernier?: Record<string, number> },
): { modele: string; recul: number }[] {
  if (etape !== 'gratuit_actif' || avant.position === undefined || avant.misesEnAvant === undefined)
    return [];
  const recul = apres.position - avant.position;
  const dernier = o.dernier?.['vis-concurrents'];
  if (
    apres.misesEnAvant > avant.misesEnAvant &&
    recul > 0 &&
    (dernier === undefined || o.maintenant - dernier >= 21 * J)
  )
    return [{ modele: 'vis-concurrents', recul }];
  return [];
}
