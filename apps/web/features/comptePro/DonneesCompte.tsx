'use client';

import { Banner, Button } from '@ph/ui';
import { useState } from 'react';
import { LigneReglage } from '@/features/espace/LigneReglage';
import { SuppressionCompte } from '@/features/espace/SuppressionCompte';
import { telechargerDonnees } from '@/features/espace/telechargerDonnees';

/** Mes données : export (portabilité) et suppression, bloquée pour le dernier propriétaire (COMPTES §4.9). */
export function DonneesCompte({
  bloquee,
  entreprise,
}: {
  bloquee: boolean;
  entreprise: string | null;
}) {
  const [message, setMessage] = useState<{ ton: 'succes' | 'danger'; texte: string } | null>(null);
  const exporter = async () => {
    const erreur = await telechargerDonnees();
    setMessage(
      erreur
        ? { ton: 'danger', texte: erreur }
        : { ton: 'succes', texte: 'Vos données sont téléchargées (fichier JSON).' },
    );
  };
  return (
    <>
      <LigneReglage
        libelle="Exporter mes données"
        valeur="Profil et historique, dans un fichier (droit à la portabilité)"
        action={
          <Button variant="secondaire" taille="sm" onClick={exporter}>
            Télécharger
          </Button>
        }
      />
      <LigneReglage
        libelle="Supprimer mon compte"
        danger
        valeur={
          bloquee
            ? 'Impossible tant que vous êtes le seul propriétaire d’une entreprise active.'
            : 'Vous serez retiré de toutes les équipes. Les factures restent conservées 10 ans.'
        }
        action={
          bloquee ? null : (
            <SuppressionCompte description="Vous serez retiré de toutes les équipes et votre profil sera effacé. Les factures restent conservées 10 ans. Cette action est définitive." />
          )
        }
      />
      {bloquee ? (
        <Banner tone="attention">
          Vous êtes le seul propriétaire{entreprise ? ` de ${entreprise}` : ' d’une entreprise'}.
          Transférez la propriété à un autre membre ou fermez l&apos;entreprise avant de supprimer
          votre compte.
        </Banner>
      ) : null}
      {message ? <Banner tone={message.ton}>{message.texte}</Banner> : null}
    </>
  );
}
