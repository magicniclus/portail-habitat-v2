'use client';

import {
  evenementLanding,
  OUTILS_INCLUS,
  type ContenuLanding,
  type OutilLanding,
} from '@ph/core/landings';
import { cn } from '@ph/ui';
import { useState } from 'react';
import { pousserEvenement } from '@/lib/dataLayer';
import { FenetreVideoOutil } from './FenetreVideoOutil';
import { IconeLanding } from './IconeLanding';
import { conteneur } from './styles';
import { cheminVideoOutil, dureeVideo, VIDEOS_OUTILS } from './videosOutils';

const BADGES = ['Sans abonnement', 'Sans carte bancaire', 'Sans commission'];

/**
 * « Les clients sont gratuits. Les outils aussi. » (LANDINGS §3.7, fond clair) : chaque outil est une carte
 * vidéo qui s'ouvre dans une fenêtre sur son film de présentation ; l'outil de la page en premier.
 * Aucun lien vers une autre landing : la fenêtre ramène au formulaire.
 */
export function OutilsGratuits({
  outil,
  eco,
}: {
  outil: OutilLanding;
  eco: ContenuLanding['eco'];
}) {
  const outils = [...OUTILS_INCLUS].sort((a, b) => Number(b.id === outil) - Number(a.id === outil));
  const [ouvert, setOuvert] = useState<number | null>(null);
  const ouvrir = (i: number) => {
    setOuvert(i);
    pousserEvenement(evenementLanding('outil_video_played', outil, { outil: outils[i]!.id }));
  };
  const [debut, fin] = decouperTitre(eco.titre);
  return (
    <section
      data-section-gratuit
      className="relative overflow-clip bg-neutre-100 py-[clamp(56px,7vw,104px)] text-texte"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_85%_0%,color-mix(in_srgb,var(--accent)_12%,transparent),transparent_70%)]"
      />
      <div className={cn(conteneur, 'relative grid gap-[clamp(28px,4vw,48px)]')}>
        <div className="grid max-w-[760px] gap-4">
          <span className="w-fit rounded-pill border border-accent-300 bg-accent-100 px-3 py-1 text-[13px] font-bold tracking-[0.06em] text-accent-800 uppercase">
            100 % gratuit
          </span>
          <h2 className="m-0 text-[clamp(30px,4.2vw,52px)] leading-[1.06] tracking-[-0.02em]">
            {debut} <span className="text-accent-700">{fin}</span>
          </h2>
          <p className="m-0 text-[clamp(16px,1.7vw,18.5px)] leading-[1.6] text-neutre-800">
            {eco.texte}
          </p>
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {BADGES.map((b) => (
              <li
                key={b}
                className="inline-flex items-center gap-2 rounded-pill border border-accent-300 bg-blanc px-3.5 py-2 text-[14.5px] font-semibold"
              >
                <span aria-hidden="true" className="font-bold text-accent">
                  ✓
                </span>
                {b}
              </li>
            ))}
          </ul>
        </div>
        <ul className="m-0 grid list-none gap-[clamp(12px,1.6vw,20px)] p-0 sm:grid-cols-2 lg:grid-cols-3">
          {outils.map((o, i) => (
            <li key={o.id}>
              <CarteOutil
                titre={o.titre}
                texte={o.texte}
                icone={o.icone}
                id={o.id}
                actif={o.id === outil}
                onOuvrir={() => ouvrir(i)}
              />
            </li>
          ))}
        </ul>
      </div>
      <FenetreVideoOutil
        outil={ouvert === null ? null : outils[ouvert]!}
        suivant={ouvert === null ? null : outils[(ouvert + 1) % outils.length]!}
        onFermer={() => setOuvert(null)}
        onSuivant={() => ouvert !== null && ouvrir((ouvert + 1) % outils.length)}
      />
    </section>
  );
}

/** « Les clients sont gratuits. Les outils aussi. » → la dernière phrase en couleur. */
function decouperTitre(t: string): [string, string] {
  const i = t.lastIndexOf('. ', t.length - 2);
  return i < 0 ? [t, ''] : [t.slice(0, i + 1), t.slice(i + 2)];
}

function CarteOutil(p: {
  id: string;
  titre: string;
  texte: string;
  icone: (typeof OUTILS_INCLUS)[number]['icone'];
  actif: boolean;
  onOuvrir: () => void;
}) {
  const duree = VIDEOS_OUTILS[p.id]?.duree ?? 0;
  return (
    <button
      type="button"
      onClick={p.onOuvrir}
      aria-haspopup="dialog"
      aria-label={`${p.titre} : voir la vidéo${duree ? ` (${dureeVideo(duree)})` : ''}`}
      className="group grid h-full w-full cursor-pointer content-start gap-0 overflow-hidden rounded-[18px] border border-trait bg-blanc p-0 text-left font-[inherit] text-texte shadow-sm transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-accent-300 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent max-sm:grid-cols-[minmax(0,42%)_minmax(0,1fr)] max-sm:items-center"
    >
      <span className="relative block aspect-video overflow-hidden bg-accent-100">
        {/* eslint-disable-next-line @next/next/no-img-element -- affiche WebP déjà légère (800 px), sans coût d'optimisation */}
        <img
          src={`${cheminVideoOutil(p.id)}.webp`}
          alt=""
          loading="lazy"
          decoding="async"
          className="block size-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-[1.04]"
        />
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,color-mix(in_srgb,var(--color-texte)_35%,transparent))]"
        />
        <span
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 flex size-[clamp(40px,5vw,56px)] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-accent text-blanc shadow-lg transition-transform duration-300 group-hover:scale-110"
        >
          <svg width="40%" height="40%" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8 5.5v13l11-6.5z" />
          </svg>
        </span>
        {duree ? (
          <span className="absolute right-2.5 bottom-2.5 rounded-[6px] bg-texte/80 px-1.5 py-0.5 text-xs font-bold text-blanc tabular-nums max-sm:hidden">
            {dureeVideo(duree)}
          </span>
        ) : null}
        {p.actif ? (
          <span className="absolute top-2.5 left-2.5 rounded-pill bg-accent px-2.5 py-1 text-xs font-bold text-blanc max-sm:hidden">
            Sur cette page
          </span>
        ) : null}
      </span>
      <span className="grid gap-1.5 p-[clamp(14px,1.8vw,20px)]">
        <span className="flex items-center gap-2.5 text-[clamp(16px,1.6vw,18px)] leading-tight font-bold">
          <span className="text-accent-700">
            <IconeLanding nom={p.icone} taille={20} />
          </span>
          {p.titre}
        </span>
        <span className="text-[14.5px] leading-[21px] text-neutre-800 max-sm:line-clamp-2">
          {p.texte}
        </span>
      </span>
    </button>
  );
}
