'use client';

import type { PlanMontage } from '@ph/core/studio';
import { useCallback, useEffect, useState } from 'react';

/**
 * Brouillon du montage avec historique (50 pas) : `changer` mémorise puis remplace,
 * `memoriser` + `remplacer` servent aux gestes continus (un seul pas pour tout le glisser).
 * Ctrl+Z annule, Ctrl+Y ou Ctrl+Maj+Z rétablit (hors champs de saisie).
 */
export function useHistorique(initial: PlanMontage) {
  const [brouillon, remplacer] = useState(initial);
  const [passe, setPasse] = useState<PlanMontage[]>([]);
  const [futur, setFutur] = useState<PlanMontage[]>([]);

  const memoriser = useCallback(() => {
    setPasse((h) => [...h.slice(-49), brouillon]);
    setFutur([]);
  }, [brouillon]);
  const changer = (suivant: PlanMontage) => {
    memoriser();
    remplacer(suivant);
  };
  const annuler = () => {
    const precedent = passe.at(-1);
    if (!precedent) return;
    setFutur((f) => [brouillon, ...f]);
    setPasse((h) => h.slice(0, -1));
    remplacer(precedent);
  };
  const retablir = () => {
    const suivant = futur[0];
    if (!suivant) return;
    setPasse((h) => [...h, brouillon]);
    setFutur((f) => f.slice(1));
    remplacer(suivant);
  };

  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || (e.target as HTMLElement).closest('input,textarea,select'))
        return;
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        annuler();
      } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
        e.preventDefault();
        retablir();
      }
    };
    window.addEventListener('keydown', touche);
    return () => window.removeEventListener('keydown', touche);
  });

  return {
    brouillon,
    remplacer,
    memoriser,
    changer,
    annuler: passe.length ? annuler : undefined,
    retablir: futur.length ? retablir : undefined,
  };
}
