'use client';

import { MOTIF_MIN } from '@ph/core/admin';
import { Banner, Button, Checkbox, Feuille, Field, Textarea } from '@ph/ui';
import { useState, type ReactNode } from 'react';

/**
 * Action sensible ou destructrice (ADM-03) : motif obligatoire, puis confirmation explicite
 * (case à cocher) avant le bouton final. Le serveur exige aussi le motif.
 */
export function ConfirmationAdmin({
  libelle,
  titre,
  description,
  danger = false,
  desactive,
  children,
  onConfirmer,
}: {
  libelle: string;
  titre: string;
  description: ReactNode;
  danger?: boolean;
  /** Infobulle « Permission requise : x.y » quand la permission manque (ADMIN §1). */
  desactive?: string | undefined;
  /** Champs propres à l'action (nombre de crédits…), avant le motif. */
  children?: ReactNode;
  onConfirmer: (motif: string) => Promise<string | null>;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [motif, setMotif] = useState('');
  const [certain, setCertain] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const pret = motif.trim().length >= MOTIF_MIN && certain;

  const confirmer = async () => {
    setEnCours(true);
    setErreur(null);
    const e = await onConfirmer(motif.trim());
    setEnCours(false);
    if (e) setErreur(e);
    else {
      setOuvert(false);
      setMotif('');
      setCertain(false);
    }
  };

  return (
    <Feuille
      open={ouvert}
      onOpenChange={setOuvert}
      titre={titre}
      description={description}
      declencheur={
        <Button
          variant={danger ? 'danger' : 'secondaire'}
          disabled={Boolean(desactive)}
          title={desactive}
        >
          {libelle}
        </Button>
      }
      actions={
        <Button
          variant={danger ? 'danger' : 'primaire'}
          disabled={!pret || enCours}
          onClick={() => void confirmer()}
        >
          Confirmer
        </Button>
      }
    >
      <div className="grid gap-4">
        {children}
        <Field label="Motif (obligatoire)">
          <Textarea value={motif} onChange={(e) => setMotif(e.target.value)} rows={3} />
        </Field>
        <Checkbox checked={certain} onChange={(e) => setCertain(e.target.checked)}>
          Je confirme cette action
        </Checkbox>
        {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
      </div>
    </Feuille>
  );
}
