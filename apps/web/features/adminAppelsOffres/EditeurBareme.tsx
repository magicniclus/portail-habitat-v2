'use client';

import type { SaisieBareme, SimulationBareme } from '@ph/core/admin';
import { Banner, Button } from '@ph/ui';
import { useRef, useState } from 'react';
import { ConfirmationAdmin } from '@/features/admin/ConfirmationAdmin';
import { publierBareme, simulerBareme } from './actionsBareme';
import { ChampsBareme, lireSaisie } from './ChampsBareme';
import { TableauSimulation } from './TableauSimulation';

/**
 * Barème des appels d'offres (ADM-05) : la publication n'est possible qu'après avoir simulé
 * exactement les valeurs saisies sur les 50 derniers leads.
 */
export function EditeurBareme({
  actuel,
  peutPublier,
}: {
  actuel: SaisieBareme;
  peutPublier: boolean;
}) {
  const form = useRef<HTMLFormElement>(null);
  const [simulation, setSimulation] = useState<{
    saisie: SaisieBareme;
    s: SimulationBareme;
  } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const simuler = async () => {
    if (!form.current?.reportValidity()) return;
    const saisie = lireSaisie(new FormData(form.current));
    setEnCours(true);
    const r = await simulerBareme(saisie);
    setEnCours(false);
    if ('erreur' in r) {
      setErreur(r.erreur);
      setSimulation(null);
    } else {
      setErreur(null);
      setSimulation({ saisie, s: r.simulation });
    }
  };

  return (
    <div className="grid gap-5">
      <form ref={form} onChange={() => setSimulation(null)} className="grid gap-5">
        <ChampsBareme s={actuel} />
      </form>
      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={simuler} disabled={enCours}>
          Simuler sur les 50 derniers leads
        </Button>
        <ConfirmationAdmin
          libelle="Publier le barème"
          titre="Publier le nouveau barème"
          description="Il s’applique aux prochains appels d’offres ; les prix déjà publiés ne changent pas."
          desactive={
            !peutPublier
              ? 'Permission requise : leads.prix_illimite'
              : simulation
                ? undefined
                : 'Simulez d’abord l’effet du barème'
          }
          onConfirmer={(motif) => publierBareme(simulation!.saisie, motif)}
        />
      </div>
      {simulation ? <TableauSimulation s={simulation.s} /> : null}
    </div>
  );
}
