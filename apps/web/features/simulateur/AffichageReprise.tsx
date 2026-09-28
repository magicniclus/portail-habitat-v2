'use client';

import { Banner, RepriseParcours } from '@ph/ui';
import { Icone } from './Icone';
import type { EncartReprise } from './reprise';

/**
 * Tout ce que le simulateur affiche autour de la reprise (REPRISE_PARCOURS §3 et §4), sans montant :
 * encart « Reprendre votre estimation ? », lien vers une autre estimation commencée (SIM-06j),
 * confirmation « Estimation reprise », annulation de « Recommencer » et modification dans un autre onglet.
 */
export function AffichageReprise({
  encart,
  note,
  annulation,
  autreOnglet,
  onReprendre,
  onRecommencer,
  onAnnuler,
}: {
  encart: EncartReprise | null;
  note: string | null;
  annulation: string | null;
  autreOnglet: boolean;
  onReprendre: () => void;
  onRecommencer: () => void;
  onAnnuler: () => void;
}) {
  return (
    <>
      {autreOnglet ? (
        <Banner
          tone="info"
          className="mb-5"
          action={
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="min-h-11 cursor-pointer border-0 bg-transparent font-semibold underline"
            >
              Recharger
            </button>
          }
        >
          Estimation modifiée dans un autre onglet.
        </Banner>
      ) : null}
      {encart && encart.mode !== 'autre' ? (
        <RepriseParcours
          titre="Reprendre votre estimation ?"
          resume={encart.resume}
          meta={encart.meta}
          action={`Reprendre à l’étape ${encart.etape}`}
          icone={<Icone trace={encart.prestation.icone} taille={48} />}
          onReprendre={onReprendre}
          onRecommencer={onRecommencer}
        />
      ) : null}
      {encart?.mode === 'autre' ? (
        <p role="status" className="m-0 mb-5 text-[15px] text-neutre-800">
          Vous aviez aussi commencé une estimation {encart.prestation.nom.toLowerCase()}.{' '}
          <button
            type="button"
            onClick={onReprendre}
            className="min-h-11 cursor-pointer border-0 bg-transparent p-0 font-semibold text-accent-700 underline underline-offset-[3px]"
          >
            Y revenir
          </button>
        </p>
      ) : null}
      {note ? (
        <p
          role="status"
          className="m-0 mb-4 flex items-center gap-2.5 text-[14.5px] font-semibold text-accent-800"
        >
          <span
            aria-hidden="true"
            className="grid size-[22px] flex-none place-items-center rounded-pill bg-accent text-[13px] text-blanc"
          >
            ✓
          </span>
          Estimation reprise. {note}
        </p>
      ) : null}
      {annulation ? (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-40 flex max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-4 rounded-[12px] bg-accent-900 py-2 pr-2 pl-4.5 text-[15px] text-blanc shadow-lg"
        >
          <span>{annulation}</span>
          <button
            type="button"
            onClick={onAnnuler}
            className="min-h-11 cursor-pointer rounded-control border border-blanc/40 bg-transparent px-3 text-[14.5px] font-bold whitespace-nowrap text-blanc"
          >
            Annuler
          </button>
        </div>
      ) : null}
    </>
  );
}
