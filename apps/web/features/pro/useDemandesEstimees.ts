'use client';

import { useEffect, useState } from 'react';

export interface Estimation {
  total: number | null;
  source: 'reel' | 'modele';
}

/**
 * Nombre de demandes du secteur (`/api/stats/demandes`, STATS_DEMANDES) : même route pour la page
 * d'acquisition et l'étape 2, donc même chiffre pour les mêmes paramètres (ACQ-01).
 */
export function useDemandesEstimees(codePostal: string, metiers: string[], rayonKm: number) {
  const [e, setE] = useState<Estimation | null>(null);
  const cle = `${codePostal}|${metiers.join(',')}|${rayonKm}`;
  useEffect(() => {
    if (!/^\d{5}$/.test(codePostal)) return;
    let actif = true;
    const p = new URLSearchParams({
      cp: codePostal,
      metiers: metiers.join(','),
      rayon: String(rayonKm),
    });
    void fetch(`/api/stats/demandes?${p}`)
      .then((r) => (r.ok ? (r.json() as Promise<Estimation>) : null))
      .then((d) => actif && setE(d))
      .catch(() => actif && setE(null));
    return () => {
      actif = false;
    };
    // `cle` résume les trois paramètres (tableau recréé à chaque rendu)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle]);
  return /^\d{5}$/.test(codePostal) ? e : null;
}

export const libelleSource = (e: Estimation) => (e.source === 'reel' ? 'déposées' : 'estimées');
