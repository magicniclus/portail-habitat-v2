'use client';

import { formatTel } from '@ph/core/format';
import { Banner, Button } from '@ph/ui';
import { useState, type ReactNode } from 'react';
import { exporterDonnees, type ProfilEspace } from './api';
import { SuppressionCompte } from './SuppressionCompte';

function Ligne({
  libelle,
  valeur,
  action,
  danger,
}: {
  libelle: string;
  valeur: string;
  action?: ReactNode;
  danger?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-trait py-3.5 first:border-t-0">
      <span className="flex flex-[1_1_240px] flex-col gap-0.5">
        <span className={`text-[15.5px] font-semibold ${danger ? 'text-danger' : ''}`}>
          {libelle}
        </span>
        <span className="text-sm text-neutre-700">{valeur}</span>
      </span>
      {action}
    </div>
  );
}

/** Onglet « Mon compte » : coordonnées, export des données et suppression (ESP-04). */
export function MonCompte({ profil }: { profil: ProfilEspace }) {
  const [message, setMessage] = useState<{ ton: 'succes' | 'danger'; texte: string } | null>(null);

  const exporter = async () => {
    const r = await exporterDonnees();
    if (!r.ok) return setMessage({ ton: 'danger', texte: r.message });
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(r.data, null, 2)], { type: 'application/json' }),
    );
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: 'mes-donnees-portail-habitat.json',
    });
    a.click();
    URL.revokeObjectURL(url);
    setMessage({ ton: 'succes', texte: 'Vos données sont téléchargées (fichier JSON).' });
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
