'use client';

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { Button, type ButtonProps } from './Button';

export interface BoutonActionProps extends Omit<ButtonProps, 'onClick' | 'asChild'> {
  /** Si elle renvoie une promesse, le bouton montre son chargeur jusqu'à la fin. */
  onClick: (e: MouseEvent<HTMLButtonElement>) => unknown;
}

/**
 * Bouton d'une action asynchrone : son propre chargeur tant que l'action n'est pas finie, même
 * quand plusieurs boutons partagent un seul état « en cours » (actions d'un devis, d'une demande).
 */
export function BoutonAction({ onClick, chargement, ...rest }: BoutonActionProps) {
  const [occupe, setOccupe] = useState(false);
  const monte = useRef(true);
  useEffect(() => {
    monte.current = true;
    return () => {
      monte.current = false;
    };
  }, []);
  return (
    <Button
      {...rest}
      chargement={Boolean(chargement) || occupe}
      onClick={(e) => {
        const r = onClick(e);
        if (r instanceof Promise) {
          setOccupe(true);
          void r.finally(() => {
            if (monte.current) setOccupe(false);
          });
        }
      }}
    />
  );
}
