'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Enregistrement du brouillon à la demande (bouton « Enregistrer », Ctrl S, ou en quittant
 * l'éditeur après confirmation) : jamais à chaque modification, pour ne pas multiplier les
 * écritures en base (COUTS). Pages, thème puis navigation ; un seul enregistrement à la fois.
 */
export function useEnregistrement(s: {
  aEnregistrer: boolean;
  navModifiee: boolean;
  enregistrer: () => Promise<string | null>;
  enregistrerNavigation: () => Promise<string | null>;
}) {
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const dernier = useRef(s);
  useEffect(() => {
    dernier.current = s;
  });
  const chaine = useRef<Promise<string | null>>(Promise.resolve(null));

  const enregistrer = useCallback((): Promise<string | null> => {
    chaine.current = chaine.current.then(async () => {
      const x = dernier.current;
      if (!x.aEnregistrer && !x.navModifiee) return null;
      setEnCours(true);
      let e = x.aEnregistrer ? await x.enregistrer() : null;
      if (!e && x.navModifiee) e = await x.enregistrerNavigation();
      setErreur(e);
      setEnCours(false);
      return e;
    });
    return chaine.current;
  }, []);

  useEffect(() => {
    const clavier = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 's') return;
      e.preventDefault();
      void enregistrer();
    };
    window.addEventListener('keydown', clavier);
    return () => window.removeEventListener('keydown', clavier);
  }, [enregistrer]);

  const nonEnregistre = s.aEnregistrer || s.navModifiee;
  const texte = enCours
    ? 'Enregistrement…'
    : erreur
      ? `Non enregistré : ${erreur}`
      : s.aEnregistrer
        ? 'Modifications non enregistrées'
        : s.navModifiee
          ? 'Navigation non enregistrée'
          : 'Enregistré';
  return { texte, enCours, nonEnregistre, enregistrer };
}
