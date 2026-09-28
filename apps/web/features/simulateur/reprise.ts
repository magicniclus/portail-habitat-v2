'use client';

import { formatRelatif } from '@ph/core/format';
import { arrivee, repriseSimulateur, type BrouillonParcours } from '@ph/core/parcours';
import { useCallback, useMemo } from 'react';
import { useParcours } from '@/features/parcours/useParcours';
import type { CatalogueSimulateur, PrestationSimulateur } from './types';

export interface EncartReprise {
  /** `encart` : pas de prestation dans l'URL ; `fusion` : même prestation ; `autre` : SIM-06j. */
  mode: 'encart' | 'fusion' | 'autre';
  brouillon: BrouillonParcours;
  prestation: PrestationSimulateur;
  resume: string;
  meta: string;
  etape: number;
  reponses: ReturnType<typeof repriseSimulateur>['reponses'];
  retirees: string[];
}

/**
 * Reprise du simulateur (REPRISE_PARCOURS §3 et §4) : brouillon trouvé à l'arrivée, préparé pour
 * l'encart (réponses migrées, étape de reprise, résumé sans montant), et écriture du brouillon.
 */
export function useRepriseSimulateur(
  catalogue: CatalogueSimulateur,
  url: { prestationId?: string; codePostal?: string },
) {
  const actives = useMemo(
    () => new Map(catalogue.prestations.filter((p) => !p.lien).map((p) => [p.id, p])),
    [catalogue],
  );
  const prestationExiste = useCallback((id: string) => actives.has(id), [actives]);
  const brouillon = useParcours('simulateur', { prestationExiste, etapeMinimale: 2 });
  const { prestationId, codePostal } = url;

  const encart = useMemo((): EncartReprise | null => {
    const a = arrivee(brouillon.trouve, { prestationId, codePostal });
    if (a.mode === 'aucun') return null;
    const p = actives.get(a.brouillon.prestationId ?? '');
    if (!p) return null;
    const r = repriseSimulateur(a.brouillon, p);
    return {
      mode: a.mode,
      brouillon: a.brouillon,
      prestation: p,
      resume: r.resume,
      meta: `Étape ${r.etape} sur 5 · commencée ${formatRelatif(a.brouillon.creeLe)}`,
      etape: r.etape,
      reponses: r.reponses,
      retirees: r.retirees,
    };
  }, [brouillon.trouve, prestationId, codePostal, actives]);

  return { ...brouillon, encart };
}
