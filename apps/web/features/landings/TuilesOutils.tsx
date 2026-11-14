'use client';

import { evenementLanding, OUTILS_INCLUS, type OutilLanding } from '@ph/core/landings';
import { PlayIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { pousserEvenement } from '@/lib/dataLayer';
import { FenetreVideoOutil } from './FenetreVideoOutil';

/** Les 6 outils du bloc final, chacun relié à son film (`public/landing/videos/outils/{id}.mp4`). */
const TUILES = [
  {
    id: 'chantiers',
    titre: 'Demandes de travaux',
    texte:
      'Des particuliers de votre secteur décrivent leur projet. Vous choisissez ceux qui vous intéressent.',
    d: 'M4 6h16v10H9l-5 3V6z',
  },
  {
    id: 'fiche',
    titre: 'Visibilité sur le portail',
    texte:
      'Votre fiche apparaît quand un client cherche un artisan de votre métier près de chez lui.',
    d: 'M12 21s7-6.2 7-11.5a7 7 0 0 0-14 0C5 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  },
  {
    id: 'site',
    titre: 'Site internet',
    texte:
      'Un site à votre nom, créé avec l’IA et modifiable en un clic. Nom de domaine personnalisé possible.',
    d: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z',
  },
  {
    id: 'avis',
    titre: 'Avis clients',
    texte: 'Vous demandez un avis après chaque chantier et vous répondez depuis votre espace.',
    d: 'M4 5h16v11H9l-5 4zM8 10h8M8 13h5',
  },
  {
    id: 'devis',
    titre: 'Devis et factures',
    texte: 'Modèles par métier, mentions vérifiées, signature en ligne et relances.',
    d: 'M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5',
  },
  {
    id: 'suivi',
    titre: 'Suivi clients',
    texte: 'Chaque client et chaque chantier au même endroit, du premier appel à la facture.',
    d: 'M4 4h16v16H4zM4 9h16M9 4v16',
  },
];
const outils = TUILES.map((t) => OUTILS_INCLUS.find((o) => o.id === t.id)!);

/**
 * Tuiles des outils (bloc final des landings, fond nuit) : un bouton lecture en haut à droite de
 * chaque carte ouvre le film de l'outil dans une fenêtre (LAND-10), qui propose l'outil suivant.
 */
export function TuilesOutils({ outil }: { outil: OutilLanding }) {
  const [ouvert, setOuvert] = useState<number | null>(null);
  const ouvrir = (i: number) => {
    setOuvert(i);
    pousserEvenement(evenementLanding('outil_video_played', outil, { outil: outils[i]!.id }));
  };
  return (
    <>
      <ul className="m-0 grid min-w-0 list-none grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-3.5 p-0">
        {TUILES.map((t, i) => (
          <li
            key={t.id}
            className="relative grid content-start gap-2.5 rounded-[12px] border border-blanc/15 bg-blanc/5 p-5"
          >
            <span className="flex size-10 items-center justify-center rounded-[10px] bg-accent">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d={t.d} />
              </svg>
            </span>
            <button
              type="button"
              onClick={() => ouvrir(i)}
              aria-haspopup="dialog"
              aria-label={`Voir la vidéo : ${t.titre}`}
              className="absolute top-3 right-3 flex size-11 cursor-pointer items-center justify-center rounded-full border border-blanc/30 bg-blanc/10 text-blanc transition-colors hover:border-blanc hover:bg-blanc hover:text-accent-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blanc"
            >
              <PlayIcon size={18} weight="fill" aria-hidden="true" />
            </button>
            <span className="pr-12 text-[17px] leading-[1.25] font-bold">{t.titre}</span>
            <span className="text-[14.5px] leading-[21px] text-blanc/80">{t.texte}</span>
          </li>
        ))}
      </ul>
      <FenetreVideoOutil
        outil={ouvert === null ? null : outils[ouvert]!}
        suivant={ouvert === null ? null : outils[(ouvert + 1) % outils.length]!}
        onFermer={() => setOuvert(null)}
        onSuivant={() => ouvert !== null && ouvrir((ouvert + 1) % outils.length)}
      />
    </>
  );
}
