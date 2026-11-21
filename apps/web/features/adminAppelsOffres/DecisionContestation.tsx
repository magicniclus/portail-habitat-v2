'use client';

import { ConfirmationAdmin } from '@/features/admin/ConfirmationAdmin';
import { deciderContestation } from './actionsContestation';

const requise = (ok: boolean, p: string) => (ok ? undefined : `Permission requise : ${p}`);

/** Maquette « Admin Appels d offres › Contestations » : trois issues, motif et confirmation. */
export function DecisionContestation({
  id,
  titre,
  carte,
  droits,
}: {
  id: string;
  titre: string;
  carte: boolean;
  droits: { rembourser: boolean; carte: boolean };
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <ConfirmationAdmin
        libelle="Rembourser en crédits"
        titre={`Rembourser en crédits : ${titre}`}
        description="Les crédits sont rendus au portefeuille de l’artisan, qui est prévenu."
        desactive={requise(droits.rembourser, 'leads.rembourser')}
        onConfirmer={(motif) => deciderContestation(id, 'credits', motif)}
      />
      {carte ? (
        <ConfirmationAdmin
          libelle="Sur la carte"
          titre={`Rembourser sur la carte : ${titre}`}
          description="Le paiement est remboursé par Stripe ; l’artisan est prévenu."
          desactive={requise(droits.carte, 'finances.rembourser_carte')}
          onConfirmer={(motif) => deciderContestation(id, 'carte', motif)}
        />
      ) : null}
      <ConfirmationAdmin
        libelle="Refuser"
        titre={`Refuser : ${titre}`}
        description="Le motif est transmis à l’artisan."
        danger
        desactive={requise(droits.rembourser, 'leads.rembourser')}
        onConfirmer={(motif) => deciderContestation(id, 'refuser', motif)}
      />
    </div>
  );
}
