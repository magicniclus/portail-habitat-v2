'use client';

import { Button } from '@ph/ui';
import { useState } from 'react';
import { ConfirmationAdmin } from '@/features/admin/ConfirmationAdmin';
import { agirSurTache } from './actions';

/** Prendre ou rendre une tâche, puis la clore avec sa résolution (journalisée). */
export function ActionsTache({ id, aMoi, titre }: { id: string; aMoi: boolean; titre: string }) {
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const basculer = async () => {
    setEnCours(true);
    setErreur(await agirSurTache(id, aMoi ? 'rendre' : 'prendre'));
    setEnCours(false);
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="secondaire" taille="sm" disabled={enCours} onClick={() => void basculer()}>
        {aMoi ? 'Rendre' : 'Prendre'}
      </Button>
      <ConfirmationAdmin
        libelle="Marquer comme traitée"
        titre={`Clore : ${titre}`}
        description="Décrivez ce qui a été fait : la résolution est conservée dans le journal d’audit."
        onConfirmer={(resolution) => agirSurTache(id, 'traiter', resolution)}
      />
      {erreur ? <span className="text-sm text-danger">{erreur}</span> : null}
    </div>
  );
}
