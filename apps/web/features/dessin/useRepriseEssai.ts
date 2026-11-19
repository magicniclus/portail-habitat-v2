'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { routes } from '@/lib/routes';
import { creerPlan } from './api';
import { effacerEssai, lireEssai } from './essai';

/**
 * Retour de connexion après un essai (DES-03) : l'essai gardé sur l'appareil devient un plan du
 * compte, intact, puis l'éditeur s'ouvre. L'essai n'est effacé qu'une fois le plan créé.
 */
export function useRepriseEssai(actif: boolean): string | null {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const fait = useRef(false);
  useEffect(() => {
    // Lu au montage (pas de useSearchParams : la page reste statique).
    const demande = new URLSearchParams(window.location.search).get('essai') === '1';
    if (!actif || !demande || fait.current) return;
    fait.current = true;
    void lireEssai().then(async (b) => {
      if (!b) return;
      const r = await creerPlan('particulier', 'Mon plan', b.scene);
      if (!r.ok) return setMessage(`Votre essai n’a pas pu être repris : ${r.message}`);
      await effacerEssai();
      router.replace(routes.editeurPlan(r.data.planId));
    });
  }, [actif, router]);
  return message;
}
