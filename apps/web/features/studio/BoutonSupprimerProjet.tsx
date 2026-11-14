'use client';

import { Button } from '@ph/ui';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { supprimerProjet } from './actions';

/** Supprime le projet et tous ses médias (confirmation d'abord : rien ne se récupère). */
export function BoutonSupprimerProjet({ projetId, titre }: { projetId: string; titre: string }) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  return (
    <Button
      variant="secondaire"
      taille="sm"
      disabled={enCours}
      onClick={() => {
        if (!window.confirm(`Supprimer « ${titre} » et tous ses médias ? Rien ne se récupère.`))
          return;
        demarrer(async () => {
          const r = await supprimerProjet({ projetId });
          if (r.ok) router.push('/admin/studio' as Route);
          else window.alert(r.message);
        });
      }}
    >
      {enCours ? 'Suppression…' : 'Supprimer le projet'}
    </Button>
  );
}
