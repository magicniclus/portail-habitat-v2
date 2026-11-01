'use client';

import { Button } from '@ph/ui';
import { RocketLaunchIcon } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { posterJson } from '@/lib/posterJson';

/**
 * Fiche complète (logo, description, bannière) mais hors ligne : la barre de progression laisse
 * place à « Mettre ma fiche en ligne » (le serveur revérifie la complétude).
 */
export function MiseEnLigneFiche() {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const publier = async () => {
    setEnCours(true);
    setErreur(null);
    const r = await posterJson('/api/pro/fiche/en-ligne', {});
    setEnCours(false);
    if (!r.ok) return setErreur(r.message);
    router.refresh();
  };
  return (
    <div className="sticky top-[65px] z-10 -mx-[clamp(16px,3vw,32px)] -mt-[clamp(20px,3vw,32px)] flex flex-wrap items-center gap-3 border-b border-trait bg-blanc/95 px-[clamp(16px,3vw,32px)] py-2.5 backdrop-blur-sm">
      <p className="m-0 flex-1 text-sm font-semibold">
        Votre fiche est complète : mettez-la en ligne pour être visible des particuliers.
      </p>
      {erreur ? (
        <p role="alert" className="m-0 w-full text-sm text-danger sm:order-last">
          {erreur}
        </p>
      ) : null}
      <Button taille="sm" chargement={enCours} onClick={() => void publier()}>
        <RocketLaunchIcon size={16} weight="fill" aria-hidden="true" />
        Mettre ma fiche en ligne
      </Button>
    </div>
  );
}
