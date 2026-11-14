'use client';

import type { PageSite } from '@ph/core/sites';
import { useCallback, useMemo, useState } from 'react';
import type { MessageApercu } from './Canevas';

/**
 * Mode Aperçu : un lien vers une autre page du site change la page de l'éditeur (et amène à la
 * zone visée) ; un lien https s'ouvre à part ; appel, email ou SMS sont seulement décrits.
 */
export function useApercuCliquable(
  pages: Record<string, PageSite>,
  recevoir: (m: MessageApercu) => void,
  flash: (m: string) => void,
  setPageId: (id: string) => void,
) {
  const [ancre, setAncre] = useState('');
  const recevoirApercu = useCallback(
    (m: MessageApercu) => {
      if (m.type === 'page') {
        const id = Object.entries(pages).find(([, p]) => p.slug === m.slug)?.[0];
        if (!id) return flash('Cette page n’existe pas (ou plus) sur le site.');
        setPageId(id);
        setAncre(m.ancre);
      } else if (m.type === 'lien') {
        if (m.href.startsWith('https://')) window.open(m.href, '_blank', 'noopener,noreferrer');
        else flash(`Sur le site en ligne, ce lien ouvre : ${decodeURIComponent(m.href)}`);
      } else recevoir(m);
    },
    [pages, recevoir, flash, setPageId],
  );
  return { ancre, setAncre, recevoir: recevoirApercu };
}

/** Médiathèque de l'éditeur : images, fichiers PDF, et ce que l'aperçu sait résoudre. */
export function useMediatheque(
  initiales: Record<string, string>,
  fichiersInitiaux: Record<string, { nom: string; url: string }>,
) {
  const [medias, setMedias] = useState(initiales);
  const [fichiers, setFichiers] = useState(fichiersInitiaux);
  const apercu = useMemo(
    () => ({
      ...medias,
      ...Object.fromEntries(Object.entries(fichiers).map(([k, f]) => [k, f.url])),
    }),
    [medias, fichiers],
  );
  return {
    medias,
    fichiers,
    apercu,
    onMedia: (cle: string, url: string) => setMedias((m) => ({ ...m, [cle]: url })),
    onFichier: (cle: string, nom: string, url: string) =>
      setFichiers((f) => ({ ...f, [cle]: { nom, url } })),
  };
}
