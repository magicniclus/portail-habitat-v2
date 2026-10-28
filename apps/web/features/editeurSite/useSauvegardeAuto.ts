'use client';

import { useEffect, useRef, useState } from 'react';

/** Délai après la dernière modification (≤ 450 enregistrements par heure, limite 600). */
const DELAI = 2500;
const ATTENTE_MIN = 8000;

/**
 * Enregistrement automatique du brouillon (maquette : « Enregistré » dans la barre du haut) :
 * pages et thème après une pause de saisie, un seul enregistrement à la fois, toujours l'état le
 * plus récent. La navigation, composant global, garde son bouton (SITE-11).
 */
export function useSauvegardeAuto(s: {
  aEnregistrer: boolean;
  navModifiee: boolean;
  enregistrer: () => Promise<string | null>;
  version: unknown;
}) {
  const [etat, setEtat] = useState<'ok' | 'encours'>('ok');
  const [erreur, setErreur] = useState<string | null>(null);
  const enregistrer = useRef(s.enregistrer);
  const dernier = useRef(0);
  const chaine = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    enregistrer.current = s.enregistrer;
  });
  useEffect(() => {
    if (!s.aEnregistrer) return;
    const delai = Math.max(DELAI, dernier.current + ATTENTE_MIN - Date.now());
    const t = setTimeout(() => {
      chaine.current = chaine.current.then(async () => {
        setEtat('encours');
        dernier.current = Date.now();
        const e = await enregistrer.current();
        setErreur(e);
        setEtat('ok');
      });
    }, delai);
    return () => clearTimeout(t);
  }, [s.version, s.aEnregistrer]);
  const texte = erreur
    ? `Non enregistré : ${erreur}`
    : etat === 'encours'
      ? 'Enregistrement…'
      : s.aEnregistrer
        ? 'Modifications en cours…'
        : s.navModifiee
          ? 'Navigation non enregistrée'
          : 'Enregistré';
  return { texte, erreur };
}
