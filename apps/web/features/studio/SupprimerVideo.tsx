'use client';

import { Chargeur } from '@ph/ui';
import { TrashIcon } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { supprimerProjet } from './actions';

/** Corbeille d'une carte vidéo : supprime la vidéo et ses médias (confirmation d'abord). */
export function SupprimerVideo({ projetId, titre }: { projetId: string; titre: string }) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  return (
    <button
      type="button"
      disabled={enCours}
      aria-label={`Supprimer « ${titre} »`}
      title="Supprimer la vidéo"
      onClick={() => {
        if (!window.confirm(`Supprimer « ${titre} » et tous ses médias ? Rien ne se récupère.`))
          return;
        demarrer(async () => {
          const r = await supprimerProjet({ projetId });
          if (r.ok) router.refresh();
          else window.alert(r.message);
        });
      }}
      className="grid size-11 place-items-center rounded-full bg-neutre-900/70 text-blanc hover:bg-danger focus-visible:bg-danger"
    >
      {enCours ? (
        <Chargeur taille="xs" ton="inverse" decoratif />
      ) : (
        <TrashIcon size={20} aria-hidden="true" />
      )}
    </button>
  );
}
