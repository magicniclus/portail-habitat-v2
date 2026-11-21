'use client';

import { useEffect, useState } from 'react';

export interface Lieu {
  nom: string;
  codePostal: string;
  centre: { latitude: number; longitude: number };
}

/** Communes proposées pendant la saisie (`/api/lieux`), après 250 ms sans frappe. */
export function useLieux(saisie: string, choisi: string | undefined) {
  const [lieux, setLieux] = useState<Lieu[]>([]);
  useEffect(() => {
    if (saisie.trim().length < 2 || saisie === choisi) return;
    const minuterie = setTimeout(() => {
      void fetch(`/api/lieux?q=${encodeURIComponent(saisie.trim())}`)
        .then((r) => r.json() as Promise<{ lieux: Lieu[] }>)
        .then((d) => setLieux(d.lieux))
        .catch(() => setLieux([]));
    }, 250);
    return () => clearTimeout(minuterie);
  }, [saisie, choisi]);
  return lieux;
}
