'use client';

import { formatRelatif } from '@ph/core/format';
import { arrivee, plusRecent, repriseSimulateur, type BrouillonParcours } from '@ph/core/parcours';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBrouillonCompte } from '@/features/parcours/useBrouillonCompte';
import { useParcours } from '@/features/parcours/useParcours';
import { ouvrirLienReprise } from './envoi';
import type { CatalogueSimulateur, PrestationSimulateur } from './types';

export interface RepriseProposee {
  brouillon: BrouillonParcours;
  prestation: PrestationSimulateur;
  resume: string;
  meta: string;
  etape: number;
  reponses: ReturnType<typeof repriseSimulateur>['reponses'];
  retirees: string[];
}

export interface EncartReprise extends RepriseProposee {
  /** `encart` : pas de prestation dans l'URL ; `fusion` : même prestation ; `autre` : SIM-06j. */
  mode: 'encart' | 'fusion' | 'autre';
}

/** Réponses migrées, étape de reprise et résumé sans montant ; `null` si la prestation a disparu. */
function preparer(
  b: BrouillonParcours,
  actives: Map<string, PrestationSimulateur>,
): RepriseProposee | null {
  const p = actives.get(b.prestationId ?? '');
  if (!p) return null;
  const r = repriseSimulateur(b, p);
  return {
    brouillon: b,
    prestation: p,
    resume: r.resume,
    meta: `Étape ${r.etape} sur 5 · commencée ${formatRelatif(b.creeLe)}`,
    etape: r.etape,
    reponses: r.reponses,
    retirees: r.retirees,
  };
}

/**
 * Reprise du simulateur (REPRISE_PARCOURS §3 et §4) : brouillon trouvé à l'arrivée, préparé pour
 * l'encart, et écriture du brouillon local.
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
  const compte = useBrouillonCompte('simulateur', { prestationExiste, etapeMinimale: 2 });
  const brouillon = useParcours('simulateur', {
    prestationExiste,
    etapeMinimale: 2,
    surEcriture: compte.surEcriture,
    surEffacement: compte.surEffacement,
  });
  const { prestationId, codePostal } = url;
  // Personne connectée : le plus récent de l'appareil et du compte l'emporte (§5).
  const trouve = useMemo(
    () => plusRecent(brouillon.trouve, compte.trouve),
    [brouillon.trouve, compte.trouve],
  );

  const encart = useMemo((): EncartReprise | null => {
    const a = arrivee(trouve, { prestationId, codePostal });
    if (a.mode === 'aucun') return null;
    const r = preparer(a.brouillon, actives);
    return r ? { ...r, mode: a.mode } : null;
  }, [trouve, prestationId, codePostal, actives]);

  const preparerBrouillon = useCallback((b: BrouillonParcours) => preparer(b, actives), [actives]);

  return { ...brouillon, trouve, encart, preparerBrouillon };
}

// Le jeton est à usage unique : un second appel (effet rejoué en développement) réutilise la réponse.
const ouvertures = new Map<string, ReturnType<typeof ouvrirLienReprise>>();
function ouvrirUneFois(jeton: string) {
  let o = ouvertures.get(jeton);
  if (!o) {
    o = ouvrirLienReprise(jeton);
    ouvertures.set(jeton, o);
  }
  return o;
}

/**
 * Arrivée par le lien reçu par email (`?reprise=<jeton>`, §4) : brouillon serveur chargé une fois,
 * puis transmis à `surReprise` ; sinon « Ce lien a expiré… ».
 */
export function useLienReprise(
  jeton: string | undefined,
  surReprise: (b: BrouillonParcours) => void,
): string | null {
  const [expire, setExpire] = useState<string | null>(null);
  const rappel = useRef(surReprise);
  useEffect(() => {
    rappel.current = surReprise;
  });
  useEffect(() => {
    if (!jeton) return;
    let actif = true;
    void ouvrirUneFois(jeton).then((r) => {
      if (!actif) return;
      if (r.ok) rappel.current(r.data);
      else setExpire('Ce lien a expiré, votre estimation n’a pas pu être retrouvée.');
    });
    return () => {
      actif = false;
    };
  }, [jeton]);
  return expire;
}
