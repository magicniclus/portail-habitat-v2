'use client';

import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '../primitives/Button';
import { Textarea } from '../primitives/Input';
import { FermerFeuille, Modal } from './Feuille';

export interface ConfirmDialogProps {
  open?: boolean;
  onOpenChange?: (ouvert: boolean) => void;
  declencheur?: ReactNode;
  titre: string;
  children?: ReactNode;
  libelleConfirmer: string;
  /** Action irréversible : bouton rouge. */
  danger?: boolean;
  /** Motif obligatoire (admin : audit). Le bouton reste inactif tant qu'il est vide. */
  motifObligatoire?: boolean;
  onConfirmer: (motif: string | undefined) => void | Promise<void>;
}

/** Double confirmation avant une action sensible, avec motif obligatoire si demandé (ADMIN.md §1). */
export function ConfirmDialog({
  open,
  onOpenChange,
  declencheur,
  titre,
  children,
  libelleConfirmer,
  danger,
  motifObligatoire,
  onConfirmer,
}: ConfirmDialogProps) {
  const [motif, setMotif] = useState('');
  const [enCours, setEnCours] = useState(false);
  const idMotif = useId();
  const idFormulaire = useId();
  const motifValide = !motifObligatoire || motif.trim().length >= 3;

  const valider = async (e: FormEvent) => {
    e.preventDefault();
    if (!motifValide) return;
    setEnCours(true);
    try {
      await onConfirmer(motifObligatoire ? motif.trim() : undefined);
      onOpenChange?.(false);
    } finally {
      setEnCours(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      declencheur={declencheur}
      titre={titre}
      description={children}
      actions={
        <>
          <FermerFeuille asChild>
            <Button variant="secondaire">Annuler</Button>
          </FermerFeuille>
          <Button
            type="submit"
            form={idFormulaire}
            variant={danger ? 'danger' : 'primaire'}
            disabled={!motifValide || enCours}
          >
            {libelleConfirmer}
          </Button>
        </>
      }
    >
      <form id={idFormulaire} onSubmit={valider}>
        {motifObligatoire && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={idMotif} className="text-[15px] font-semibold">
              Motif (enregistré dans le journal)
            </label>
            <Textarea
              id={idMotif}
              required
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
            />
          </div>
        )}
      </form>
    </Modal>
  );
}
