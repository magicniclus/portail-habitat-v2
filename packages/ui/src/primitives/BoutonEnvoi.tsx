'use client';

import { useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button, type ButtonProps } from './Button';

/**
 * Bouton d'envoi d'un formulaire sans JavaScript d'envoi (GET natif, Server Action) : chargeur
 * dès que le formulaire part, jusqu'à la page suivante ou la fin de l'action.
 */
export function BoutonEnvoi({ chargement, ...rest }: Omit<ButtonProps, 'type' | 'asChild'>) {
  const { pending } = useFormStatus();
  const [parti, setParti] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const form = ref.current?.form;
    if (!form) return;
    // Server Action : `useFormStatus` suffit ; sinon la navigation native remplace la page.
    const navigation = !form.getAttribute('action')?.startsWith('javascript:');
    const envoi = () => navigation && setParti(true);
    // Retour arrière (cache du navigateur) : le bouton redevient utilisable.
    const retour = () => setParti(false);
    form.addEventListener('submit', envoi);
    window.addEventListener('pageshow', retour);
    return () => {
      form.removeEventListener('submit', envoi);
      window.removeEventListener('pageshow', retour);
    };
  }, []);
  return (
    <Button
      ref={ref}
      type="submit"
      chargement={Boolean(chargement) || pending || parti}
      {...rest}
    />
  );
}
