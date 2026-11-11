'use client';

import type { OUTILS_INCLUS } from '@ph/core/landings';
import { Modal } from '@ph/ui';
import { cheminVideoOutil } from './videosOutils';

type Outil = (typeof OUTILS_INCLUS)[number];

/**
 * Fenêtre de la vidéo d'un outil : lecture automatique (film muet, sous-titres incrustés), puis
 * l'appel à créer son espace ou à voir l'outil suivant. Feuille du bas sur téléphone (MOB-05).
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
          key={outil.id}
          className="block aspect-[16/10] w-full rounded-[12px] bg-neutre-900"
          src={`${cheminVideoOutil(outil.id)}.mp4`}
          poster={`${cheminVideoOutil(outil.id)}.webp`}
          autoPlay
          muted
          playsInline
          controls
          preload="auto"
          aria-label={`Présentation de l’outil ${outil.titre}, sans son, avec sous-titres`}
        />
      ) : null}
    </Modal>
  );
}
