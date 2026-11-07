'use client';

import { Field, Input } from '@ph/ui';
import { useState } from 'react';
import { ConfirmationAdmin } from '@/features/admin/ConfirmationAdmin';
import { agirSurDemande, ajouterArtisan } from './actions';

const requise = (ok: boolean, p: string) => (ok ? undefined : `Permission requise : ${p}`);

/** Actions de la maquette « Admin Demandes » : chacune avec motif et confirmation (ADM-03). */
export function ActionsDemande({
  demandeId,
  reference,
  droits,
}: {
  demandeId: string;
  reference: string;
  droits: { reattribuer: boolean; forcer: boolean; annuler: boolean };
}) {
  const [artisanId, setArtisanId] = useState('');
  return (
    <div className="flex flex-wrap gap-2">
      <ConfirmationAdmin
        libelle="Ajouter un artisan"
        titre={`Proposer ${reference} à un artisan`}
        description="L’artisan reçoit la demande comme une proposition classique (24 h pour répondre)."
        desactive={requise(droits.reattribuer, 'demandes.reattribuer')}
        onConfirmer={(motif) => ajouterArtisan(demandeId, artisanId.trim(), motif)}
      >
        <Field label="Identifiant de l’entreprise (fiche Artisans)">
          <Input value={artisanId} onChange={(e) => setArtisanId(e.target.value)} />
        </Field>
      </ConfirmationAdmin>
      <ConfirmationAdmin
        libelle="Relancer l’algorithme"
        titre={`Relancer l’algorithme pour ${reference}`}
        description="Nouvelle demande : nouveau calcul. Demande garantie sans réponse : appel d’offres."
        desactive={requise(droits.forcer, 'matching.forcer')}
        onConfirmer={(motif) => agirSurDemande(demandeId, 'relancer', motif)}
      />
      <ConfirmationAdmin
        libelle="Marquer comme spam"
        titre={`Marquer ${reference} comme spam`}
        description="La demande n’est plus proposée à personne."
        danger
        desactive={requise(droits.annuler, 'demandes.annuler')}
        onConfirmer={(motif) => agirSurDemande(demandeId, 'spam', motif)}
      />
      <ConfirmationAdmin
        libelle="Annuler"
        titre={`Annuler ${reference}`}
        description="La demande est close sans suite."
        danger
        desactive={requise(droits.annuler, 'demandes.annuler')}
        onConfirmer={(motif) => agirSurDemande(demandeId, 'annuler', motif)}
      />
    </div>
  );
}
