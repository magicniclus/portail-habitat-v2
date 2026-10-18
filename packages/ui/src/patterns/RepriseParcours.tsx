import type { ReactNode } from 'react';
import { bouton } from '../primitives/bouton';

export interface RepriseParcoursProps {
  /** « Reprendre votre estimation ? » */
  titre: string;
  /** Prestation et réponses clés, sans aucun montant (REPRISE_PARCOURS §3). */
  resume: string;
  /** « Étape 3 sur 5 · commencée il y a 2 jours » */
  meta: string;
  /** « Reprendre à l'étape 3 » */
  action: string;
  onReprendre: () => void;
  onRecommencer: () => void;
  icone?: ReactNode;
}

/**
 * Encart de reprise d'un parcours interrompu (REPRISE_PARCOURS §3) : pas de fenêtre modale, annoncé
 * aux lecteurs d'écran sans prendre le focus ; réutilisé par le simulateur, le diagnostic, l'avis et
 * l'onboarding.
 */
export function RepriseParcours({
  titre,
  resume,
  meta,
  action,
  onReprendre,
  onRecommencer,
  icone,
}: RepriseParcoursProps) {
  return (
    <section
      role="region"
      aria-live="polite"
      aria-label={titre}
      className="mb-7 flex flex-wrap items-center gap-x-6 gap-y-4 rounded-card border-2 border-accent-300 bg-blanc px-[clamp(18px,2.6vw,26px)] py-[clamp(16px,2.4vw,22px)] shadow-sm"
    >
      {icone ? <span className="flex-none">{icone}</span> : null}
      <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-0.5">
        <p className="m-0 text-lg font-bold">{titre}</p>
        <p className="m-0 text-[15.5px] leading-[23px] text-texte">{resume}</p>
        <p className="m-0 text-sm leading-[21px] text-neutre-700">{meta}</p>
      </div>
      <div className="flex flex-wrap items-center gap-x-[18px] gap-y-2">
        <button type="button" onClick={onReprendre} className={bouton({ taille: 'lg' })}>
          {action}
        </button>
        <button
          type="button"
          onClick={onRecommencer}
          className="min-h-11 cursor-pointer border-0 bg-transparent px-1 text-[15px] font-semibold text-accent-700 underline underline-offset-[3px]"
        >
          Recommencer
        </button>
      </div>
    </section>
  );
}
