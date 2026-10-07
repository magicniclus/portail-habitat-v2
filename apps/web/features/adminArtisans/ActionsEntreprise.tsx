'use client';

import { Banner, Button, Field, Input, Select } from '@ph/ui';
import { useState, useTransition } from 'react';
import { ConfirmationAdmin } from '@/features/admin/ConfirmationAdmin';
import {
  inviterRevendication,
  recalculerFiche,
  supprimerEntreprise,
  transfererPropriete,
} from './actionsEntreprise';

const requise = (ok: boolean, p: string) => (ok ? undefined : `Permission requise : ${p}`);

/**
 * Actions sur l'entreprise (ADMIN §2.3) : revendication, transfert de propriété assisté,
 * recalcul de la fiche publique, suppression définitive (nom ressaisi + case + motif).
 */
export function ActionsEntreprise({
  artisanId,
  nom,
  revendiquee,
  equipe,
  droits,
}: {
  artisanId: string;
  nom: string;
  revendiquee: boolean;
  equipe: { uid: string; nom: string; role: string; statut: string }[];
  droits: { creer: boolean; modifier: boolean; supprimer: boolean };
}) {
  const [email, setEmail] = useState('');
  const candidats = equipe.filter((m) => m.statut === 'actif' && m.role !== 'proprietaire');
  const [cible, setCible] = useState(candidats[0]?.uid ?? '');
  const [confirmation, setConfirmation] = useState('');
  const [resultat, setResultat] = useState<{ ok: boolean; message: string } | null>(null);
  const [enCours, demarrer] = useTransition();
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondaire"
          disabled={enCours || !droits.modifier}
          title={requise(droits.modifier, 'artisans.modifier')}
          onClick={() => demarrer(async () => setResultat(await recalculerFiche(artisanId)))}
        >
          Recalculer la fiche publique
        </Button>
        {!revendiquee ? (
          <ConfirmationAdmin
            libelle="Inviter à revendiquer"
            titre={`Inviter le dirigeant de ${nom}`}
            description="Le destinataire devient propriétaire en acceptant l’invitation (valable 7 jours)."
            desactive={requise(droits.creer, 'artisans.creer')}
            onConfirmer={(motif) => inviterRevendication({ artisanId, email, motif })}
          >
            <Field label="Email du dirigeant">
              <Input
                type="email"
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
          </ConfirmationAdmin>
        ) : null}
        <ConfirmationAdmin
          libelle="Transférer la propriété"
          titre={`Transférer la propriété de ${nom}`}
          description="Propriétaire injoignable : Kbis à jour au nom du nouveau dirigeant vérifié. L’ancien propriétaire devient gérant."
          desactive={
            requise(droits.modifier, 'artisans.modifier') ??
            (candidats.length ? undefined : 'Aucun autre membre actif')
          }
          onConfirmer={(motif) => transfererPropriete({ artisanId, uid: cible, motif })}
        >
          <Field label="Nouveau propriétaire">
            <Select value={cible} onChange={(e) => setCible(e.target.value)}>
              {candidats.map((m) => (
                <option key={m.uid} value={m.uid}>
                  {m.nom} ({m.role})
                </option>
              ))}
            </Select>
          </Field>
        </ConfirmationAdmin>
        <ConfirmationAdmin
          libelle="Supprimer définitivement"
          titre={`Supprimer définitivement ${nom}`}
          description="Fiche retirée, membres retirés et déconnectés, coordonnées effacées, SIREN libéré. Factures et avis conservés. Irréversible."
          danger
          desactive={requise(droits.supprimer, 'artisans.supprimer')}
          onConfirmer={(motif) => supprimerEntreprise({ artisanId, confirmation, motif })}
        >
          <Field label={`Saisissez « ${nom} » pour confirmer`}>
            <Input
              autoComplete="off"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
            />
          </Field>
        </ConfirmationAdmin>
      </div>
      {resultat ? (
        <Banner tone={resultat.ok ? 'succes' : 'danger'}>{resultat.message}</Banner>
      ) : null}
    </div>
  );
}
