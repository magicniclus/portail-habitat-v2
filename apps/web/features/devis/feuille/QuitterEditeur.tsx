'use client';

import { Button, FermerFeuille, Modal } from '@ph/ui';
import { useState } from 'react';

/**
 * Fermer un document modifié : l'enregistrer en brouillon (sans numéro, donc légal pour une
 * facture aussi) ou quitter sans enregistrer.
 */
export function QuitterEditeur({
  ouvert,
  onOuvert,
  document,
  onBrouillon,
  onQuitter,
}: {
  ouvert: boolean;
  onOuvert: (o: boolean) => void;
  /** « le devis », « la facture ». */
  document: string;
  onBrouillon: () => Promise<boolean>;
  onQuitter: () => void;
}) {
  const [enCours, setEnCours] = useState(false);
  return (
    <Modal
      open={ouvert}
      onOpenChange={onOuvert}
      titre="Enregistrer avant de quitter ?"
      description={`Vos dernières modifications sur ${document} ne sont pas enregistrées.`}
      actions={
        <>
          <FermerFeuille asChild>
            <Button variant="secondaire">Continuer</Button>
          </FermerFeuille>
          <Button variant="secondaire" onClick={onQuitter} disabled={enCours}>
            Quitter sans enregistrer
          </Button>
          <Button
            chargement={enCours}
            disabled={enCours}
            onClick={async () => {
              setEnCours(true);
              const ok = await onBrouillon();
              setEnCours(false);
              if (ok) onQuitter();
              else onOuvert(false);
            }}
          >
            {enCours ? 'Enregistrement…' : 'Enregistrer le brouillon'}
          </Button>
        </>
      }
    />
  );
}
