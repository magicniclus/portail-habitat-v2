'use client';

import { MOTIFS_REFUS_AVIS } from '@ph/core/avis';
import { Field, Select } from '@ph/ui';
import { useState } from 'react';
import { ConfirmationAdmin } from '@/features/admin/ConfirmationAdmin';
import { decisionAvis } from './actions';

type Motif = (typeof MOTIFS_REFUS_AVIS)[number];
const requise = (ok: boolean, p: string) => (ok ? undefined : `Permission requise : ${p}`);

/** Décisions de la maquette « Admin Avis » : le texte de l'avis n'est jamais modifié. */
export function ActionsAvis({
  id,
  titre,
  statut,
  droits,
}: {
  id: string;
  titre: string;
  statut: string;
  droits: { moderer: boolean; supprimer: boolean };
}) {
  const [motifRefus, setMotifRefus] = useState<Motif>(MOTIFS_REFUS_AVIS[0]);
  const moderer = requise(droits.moderer, 'avis.moderer');
  return (
    <div className="flex flex-wrap gap-2">
      {statut === 'en_attente' || statut === 'suspendu' ? (
        <ConfirmationAdmin
          libelle="Publier"
          titre={`Publier : ${titre}`}
          description="L’avis apparaît sur la fiche ; l’auteur et l’artisan sont prévenus."
          desactive={moderer}
          onConfirmer={(motif) => decisionAvis({ avisId: id, action: 'publier', motif })}
        />
      ) : null}
      {statut === 'en_attente' ? (
        <>
          <ConfirmationAdmin
            libelle="Refuser"
            titre={`Refuser : ${titre}`}
            description="Le motif choisi est envoyé à l’auteur."
            desactive={moderer}
            onConfirmer={(motif) =>
              decisionAvis({ avisId: id, action: 'refuser', motif, motifRefus })
            }
          >
            <Field label="Motif envoyé à l’auteur">
              <Select value={motifRefus} onChange={(e) => setMotifRefus(e.target.value as Motif)}>
                {MOTIFS_REFUS_AVIS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </Select>
            </Field>
          </ConfirmationAdmin>
          <ConfirmationAdmin
            libelle="Demander une preuve"
            titre={`Demander une preuve : ${titre}`}
            description="L’auteur reçoit un email lui demandant une facture ou un devis signé."
            desactive={moderer}
            onConfirmer={(motif) => decisionAvis({ avisId: id, action: 'preuve', motif })}
          />
        </>
      ) : null}
      {statut === 'publie' ? (
        <ConfirmationAdmin
          libelle="Suspendre"
          titre={`Suspendre : ${titre}`}
          description="L’avis est retiré de la fiche le temps de la vérification."
          danger
          desactive={moderer}
          onConfirmer={(motif) => decisionAvis({ avisId: id, action: 'suspendre', motif })}
        />
      ) : null}
      <ConfirmationAdmin
        libelle="Supprimer"
        titre={`Supprimer définitivement : ${titre}`}
        description="L’avis, les données de son auteur et ses signalements sont effacés."
        danger
        desactive={requise(droits.supprimer, 'avis.supprimer')}
        onConfirmer={(motif) => decisionAvis({ avisId: id, action: 'supprimer', motif })}
      />
    </div>
  );
}
