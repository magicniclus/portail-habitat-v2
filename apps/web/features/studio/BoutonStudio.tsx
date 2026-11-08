'use client';

import { Banner, Chargeur } from '@ph/ui';
import { FilmSlateIcon } from '@phosphor-icons/react';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { ouvrirStudio } from './actions';

/**
 * Bouton « Studio » (en haut à droite) : ouvre directement l'éditeur sur une vidéo neuve. Idée,
 * tournage, voix, montage : tout se fait ensuite dans le Studio (panneau IA à gauche).
 */
export function BoutonStudio() {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  return (
    <div className="grid justify-items-end gap-2">
      <button
        type="button"
        disabled={enCours}
        aria-busy={enCours}
        onClick={() =>
          demarrer(async () => {
            setErreur(null);
            const r = await ouvrirStudio();
            if (r.ok) router.push(`/admin/studio/${r.data}/montage` as Route);
            else setErreur(r.message);
          })
        }
        className="inline-flex min-h-11 items-center gap-2 rounded-control bg-neutre-900 px-5 font-bold text-blanc hover:bg-neutre-800 disabled:opacity-70"
      >
        {enCours ? (
          <Chargeur taille="sm" ton="inverse" decoratif />
        ) : (
          <FilmSlateIcon size={20} aria-hidden="true" />
        )}
        {enCours ? 'Ouverture…' : 'Studio'}
      </button>
      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
    </div>
  );
}
