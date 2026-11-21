'use client';

import { Field, Input } from '@ph/ui';
import { useState } from 'react';
import { ConfirmationAdmin } from '@/features/admin/ConfirmationAdmin';
import { VoirEnTantQue } from '@/features/admin/VoirEnTantQue';
import { agirSurArtisan, crediterArtisan } from './actions';

const requise = (ok: boolean, p: string) => (ok ? undefined : `Permission requise : ${p}`);

/**
 * Actions de la fiche (maquette « Admin Artisans ») : visibles mais désactivées avec l'infobulle
 * « Permission requise » si le droit manque ; motif et confirmation à chaque fois (ADM-03).
 */
export function ActionsArtisan({
  artisanId,
  nom,
  suspendu,
  aVerifier,
  proprietaireUid,
  droits,
}: {
  artisanId: string;
  nom: string;
  suspendu: boolean;
  aVerifier: boolean;
  proprietaireUid: string | null;
  droits: {
    verifier: boolean;
    suspendre: boolean;
    crediter: boolean;
    illimite: boolean;
    voir: boolean;
  };
}) {
  const [credits, setCredits] = useState(1);
  const max = droits.illimite ? 100 : 5;
  return (
    <div className="flex flex-wrap gap-2">
      {aVerifier ? (
        <ConfirmationAdmin
          libelle="Vérifier"
          titre={`Vérifier ${nom}`}
          description="Identité et documents contrôlés : la fiche peut être mise en ligne."
          desactive={requise(droits.verifier, 'artisans.verifier')}
          onConfirmer={(motif) => agirSurArtisan(artisanId, 'verifier', motif)}
        />
      ) : null}
      <ConfirmationAdmin
        libelle={suspendu ? 'Lever la suspension' : 'Suspendre'}
        titre={suspendu ? `Lever la suspension de ${nom}` : `Suspendre ${nom}`}
        description={
          suspendu
            ? 'La fiche redevient visible si les documents sont valides.'
            : 'La fiche est retirée de l’annuaire et ne reçoit plus de demandes.'
        }
        danger={!suspendu}
        desactive={requise(droits.suspendre, 'artisans.suspendre')}
        onConfirmer={(motif) => agirSurArtisan(artisanId, suspendu ? 'lever' : 'suspendre', motif)}
      />
      <ConfirmationAdmin
        libelle="Créditer"
        titre={`Créditer ${nom}`}
        description="Geste commercial en crédits d’appels d’offres."
        desactive={requise(droits.crediter, 'credits.crediter')}
        onConfirmer={(motif) => crediterArtisan(artisanId, credits, motif)}
      >
        <Field label={`Nombre de crédits (${max} au plus)`}>
          <Input
            type="number"
            min={1}
            max={max}
            value={credits}
            onChange={(e) => setCredits(Math.min(max, Math.max(1, Number(e.target.value) || 1)))}
          />
        </Field>
      </ConfirmationAdmin>
      {proprietaireUid ? (
        <VoirEnTantQue
          uid={proprietaireUid}
          nom={nom}
          desactive={droits.voir ? undefined : 'Réservé au super-administrateur'}
        />
      ) : null}
    </div>
  );
}
