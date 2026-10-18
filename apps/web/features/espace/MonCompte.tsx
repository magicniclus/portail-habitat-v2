'use client';

import { formatTel } from '@ph/core/format';
import { Banner, Button } from '@ph/ui';
import { useState } from 'react';
import type { ProfilEspace } from './api';
import { LigneReglage as Ligne } from './LigneReglage';
import { SuppressionCompte } from './SuppressionCompte';
import { telechargerDonnees } from './telechargerDonnees';

/** Onglet « Mon compte » : coordonnées, export des données et suppression (ESP-04). */
export function MonCompte({ profil }: { profil: ProfilEspace }) {
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
    <div className="grid max-w-[760px] gap-3.5">
      <div className="rounded-[14px] border border-trait px-4.5 py-1">
        <Ligne libelle="Email" valeur={`${profil.email} · connexion par lien magique`} />
        <Ligne
          libelle="Téléphone"
          valeur={profil.telephone ? formatTel(profil.telephone) : 'Non renseigné'}
        />
        <Ligne
          libelle="Exporter mes données"
          valeur="Profil, demandes et messages, dans un fichier"
          action={
            <Button variant="secondaire" onClick={exporter}>
              Télécharger
            </Button>
          }
        />
        <Ligne
          libelle="Supprimer mon compte"
          valeur="Vos demandes en cours seront annulées"
          danger
          action={<SuppressionCompte />}
        />
      </div>
      {message ? <Banner tone={message.ton}>{message.texte}</Banner> : null}
    </div>
  );
}
