'use client';

import { nouvelIdFrise, poserClip, type Frise, type Media } from '@ph/core/studio';
import { useEffect, useRef, useState } from 'react';
import { importerMedia } from './envoiMedia';

/**
 * Import de fichiers dans la bibliothèque (un à la fois, avec avancement) ; posés sur la piste
 * visée si on les a déposés sur la frise. Le brouillon le plus récent reçoit chaque média, même
 * si l'auteur a continué à monter pendant l'envoi.
 */
export function useImportMedias(
  projetId: string,
  brouillon: Frise,
  changer: (f: Frise) => void,
  onErreur: (message: string) => void,
) {
  const [envois, setEnvois] = useState<{ nom: string; avancement: number }[]>([]);
  const dernier = useRef(brouillon);
  useEffect(() => {
    dernier.current = brouillon;
  }, [brouillon]);

  const importer = async (fichiers: File[], cible?: { pisteId: string; debut: number }) => {
    let debut = cible?.debut ?? 0;
    for (const fichier of fichiers) {
      setEnvois((e) => [...e, { nom: fichier.name, avancement: 0 }]);
      const r = await importerMedia(projetId, fichier, (a) =>
        setEnvois((e) => e.map((x) => (x.nom === fichier.name ? { ...x, avancement: a } : x))),
      );
      setEnvois((e) => e.filter((x) => x.nom !== fichier.name));
      if (typeof r === 'string') {
        onErreur(r);
        continue;
      }
      let f: Frise = { ...dernier.current, medias: [...dernier.current.medias, r] };
      if (cible) {
        f = poserClip(f, cible.pisteId, clipDuMedia(f, r, debut));
        debut += r.dureeMs || 3_000;
      }
      dernier.current = f;
      changer(f);
    }
  };
  return { envois, importer };
}

/** Clip qui montre (ou fait entendre) un média en entier ; une image dure 3 s. */
function clipDuMedia(f: Frise, m: Media, debut: number) {
  return {
    id: nouvelIdFrise(
      'c',
      f.pistes.flatMap((p) => p.clips.map((c) => c.id)),
    ),
    debut: Math.max(0, Math.round(debut)),
    duree: Math.max(100, m.dureeMs || 3_000),
    source: { type: 'media' as const, mediaId: m.id, debutSource: 0 },
  };
}
