'use client';

import type { Clip, Frise } from '@ph/core/studio';
import { useEffect, useState } from 'react';
import { urlFichierStudio } from '@/lib/firebaseClient';

/** Fichiers de la prise et des captures filmées, s'ils existent (chemins Storage). */
export interface FichiersProjet {
  prise: { ecran?: string; camera?: string; voix?: string };
  /** `${captureId}:${scene}` → chemin de la capture filmée. */
  captures: Record<string, string>;
}

/** Fichier lu par un clip et sa balise (`null` : carton, effet, image ou fichier absent). */
export function lecteurDuClip(
  f: Pick<Frise, 'medias' | 'captures'>,
  c: Clip,
  fichiers: FichiersProjet,
): { chemin: string; balise: 'video' | 'audio' } | null {
  const s = c.source;
  if (s.type === 'media') {
    const m = f.medias.find((x) => x.id === s.mediaId);
    return m && m.type !== 'image' ? { chemin: m.chemin, balise: m.type } : null;
  }
  if (s.type === 'prise') {
    const chemin = fichiers.prise[s.fichier];
    return chemin ? { chemin, balise: s.fichier === 'voix' ? 'audio' : 'video' } : null;
  }
  if (s.type === 'capture') {
    const cap = f.captures.find((x) => x.id === s.captureId);
    const chemin = cap ? fichiers.captures[`${cap.id}:${cap.scene}`] : undefined;
    return chemin ? { chemin, balise: 'video' } : null;
  }
  return null;
}

/** Adresses de lecture des fichiers Storage (résolues une fois, gardées). */
export function useUrlsStudio(chemins: readonly string[]): Record<string, string> {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const cle = [...new Set(chemins)].sort().join('|');
  useEffect(() => {
    const manquants = cle ? cle.split('|').filter((c) => !(c in urls)) : [];
    if (!manquants.length) return;
    let actif = true;
    void Promise.all(
      manquants.map(async (c) => [c, await urlFichierStudio(c).catch(() => '')] as const),
    ).then((r) => {
      if (actif) setUrls((u) => ({ ...u, ...Object.fromEntries(r) }));
    });
    return () => {
      actif = false;
    };
    // `urls` est lu pour éviter de résoudre deux fois ; seule la liste des chemins compte.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle]);
  return urls;
}
