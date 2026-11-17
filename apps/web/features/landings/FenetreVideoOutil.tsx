'use client';

import type { OUTILS_INCLUS } from '@ph/core/landings';
import { cn, Modal } from '@ph/ui';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { cheminVideoOutil, VSL_OUTILS } from './videosOutils';

type Outil = (typeof OUTILS_INCLUS)[number];

/**
 * Fenêtre de la vidéo d'un outil : lecture automatique, puis l'appel à créer son espace ou à voir
 * l'outil suivant. Feuille du bas sur téléphone (MOB-05). Un outil qui a son film de vente
 * (`VSL_OUTILS`) le joue avec le son, au format vertical sur téléphone ; les autres gardent leur
 * film muet aux sous-titres incrustés.
 */
export function FenetreVideoOutil({
  outil,
  suivant,
  onFermer,
  onSuivant,
}: {
  outil: Outil | null;
  suivant: Outil | null;
  onFermer: () => void;
  onSuivant: () => void;
}) {
  const telephone = useMediaQuery('(max-width: 639px)', false);
  const vsl = outil ? VSL_OUTILS[outil.id] : undefined;
  const vertical = Boolean(vsl) && telephone;
  const base = vsl
    ? `${vsl.base}${vertical ? '-vertical' : ''}`
    : outil
      ? cheminVideoOutil(outil.id)
      : '';
  return (
    <Modal
      open={outil !== null}
      onOpenChange={(o) => {
        if (!o) onFermer();
      }}
      titre={outil ? `${outil.titre} en vidéo` : ''}
      description={outil?.texte}
      className="sm:w-[min(980px,calc(100vw-32px))]"
      actions={
        <>
          {suivant ? (
            <button
              type="button"
              onClick={onSuivant}
              className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-control border border-trait bg-blanc px-4 font-semibold text-texte hover:bg-neutre-100 focus-visible:outline-2 focus-visible:outline-accent"
            >
              Voir : {suivant.titre} <span aria-hidden="true">→</span>
            </button>
          ) : null}
          <a
            href="#inscription"
            onClick={onFermer}
            className="inline-flex min-h-11 items-center justify-center rounded-control bg-accent px-5 font-semibold text-blanc no-underline hover:bg-accent-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Créer mon espace gratuit
          </a>
        </>
      }
    >
      {outil ? (
        <video
          key={base}
          className={cn(
            'mx-auto block max-h-[calc(92dvh-16rem)] w-full rounded-[12px] bg-neutre-900',
            vertical
              ? 'aspect-[9/16] max-w-[calc((92dvh-16rem)*9/16)]'
              : 'aspect-video max-w-[calc((92dvh-16rem)*16/9)]',
          )}
          src={`${base}.mp4`}
          poster={`${base}.webp`}
          autoPlay
          muted={!vsl}
          playsInline
          controls
          preload="auto"
          aria-label={`Présentation de l’outil ${outil.titre}, ${vsl ? 'avec la voix' : 'sans son'}, avec sous-titres`}
        />
      ) : null}
    </Modal>
  );
}
