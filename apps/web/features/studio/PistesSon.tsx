'use client';

import {
  debutsPlans,
  lignesSousTitres,
  motsSortie,
  reglagesSousTitres,
  type MotTranscrit,
  type PlanMontage,
} from '@ph/core/studio';
import { MicrophoneIcon, MusicNotesIcon, SubtitlesIcon } from '@phosphor-icons/react';
import { useMemo } from 'react';
import { LigneFrise } from './LigneFrise';

const ONDE =
  'bg-[repeating-linear-gradient(90deg,var(--color-montage-selection)_0_1px,transparent_1px_4px)] opacity-40';

/**
 * Pistes en lecture seule sous les effets : sous-titres (lignes karaoké), voix (suit les coupes
 * des plans) et musique de fond. Elles se règlent dans le panneau « Toute la vidéo ».
 */
export function PistesSon({
  plan,
  mots,
  voix,
  px,
  largeur,
}: {
  plan: PlanMontage;
  mots: MotTranscrit[];
  voix: boolean;
  px: number;
  largeur: number;
}) {
  const lignes = useMemo(
    () =>
      plan.sousTitres
        ? lignesSousTitres(motsSortie(plan, mots), reglagesSousTitres(plan.format))
        : [],
    [plan, mots],
  );
  const debuts = debutsPlans(plan);
  const duree = plan.plans.reduce((t, x) => t + x.source.fin - x.source.debut, 0);
  return (
    <>
      {lignes.length ? (
        <LigneFrise
          libelle="Sous-titres"
          icone={<SubtitlesIcon size={16} aria-hidden="true" />}
          hauteur={30}
          largeur={largeur}
        >
          {lignes.map((l) => (
            <span
              key={`${l.debut}-${l.fin}`}
              className="absolute top-1 h-[22px] truncate rounded-[4px] bg-montage-piste-sous-titres px-1.5 text-[11px] leading-[22px] text-montage-texte"
              style={{ left: l.debut * px, width: Math.max(6, (l.fin - l.debut) * px - 1) }}
            >
              {l.mots.map((m) => m.texte).join(' ')}
            </span>
          ))}
        </LigneFrise>
      ) : null}
      {voix ? (
        <LigneFrise
          libelle="Voix"
          icone={<MicrophoneIcon size={16} aria-hidden="true" />}
          hauteur={34}
          largeur={largeur}
        >
          {plan.plans.map((x, i) => (
            <span
              key={x.id}
              aria-hidden="true"
              className="absolute top-1 h-[26px] overflow-hidden rounded-[4px] bg-montage-piste-audio"
              style={{
                left: debuts[i]! * px,
                width: Math.max(4, (x.source.fin - x.source.debut) * px - 1),
              }}
            >
              <span className={`absolute inset-0 ${ONDE}`} />
            </span>
          ))}
        </LigneFrise>
      ) : null}
      {plan.musique ? (
        <LigneFrise
          libelle="Musique"
          icone={<MusicNotesIcon size={16} aria-hidden="true" />}
          hauteur={30}
          largeur={largeur}
        >
          <span
            className="absolute top-1 h-[22px] truncate rounded-[4px] bg-montage-piste-audio/60 px-2 text-[11px] leading-[22px] text-montage-texte"
            style={{ left: 0, width: duree * px }}
          >
            Musique de fond
          </span>
        </LigneFrise>
      ) : null}
    </>
  );
}
