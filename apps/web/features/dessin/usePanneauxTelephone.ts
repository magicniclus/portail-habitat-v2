'use client';

import { useEffect, type Dispatch } from 'react';
import type { Action, EtatEditeur } from './etat';

/** Téléphone (docs/MOBILE.md) : les panneaux passent par-dessus le plan, un seul à la fois. */
export function usePanneauxTelephone(
  telephone: boolean,
  etat: EtatEditeur,
  dispatch: Dispatch<Action>,
) {
  // Sur téléphone, les panneaux passent par-dessus le plan : on démarre replié.
  useEffect(() => {
    if (!telephone) return;
    dispatch({ type: 'menu', menu: null });
    dispatch({ type: 'proprietes', ouvert: false });
  }, [telephone, dispatch]);

  // Téléphone : choisir un outil à placer replie le menu pour libérer le plan.
  useEffect(() => {
    if (telephone && etat.outil !== 'selection') dispatch({ type: 'menu', menu: null });
  }, [telephone, etat.outil, dispatch]);
  // Téléphone : choisir une vue replie le menu pour la montrer en entier.
  useEffect(() => {
    if (telephone) dispatch({ type: 'menu', menu: null });
  }, [telephone, etat.vue, dispatch]);
  // Téléphone : un seul panneau à la fois, le dernier ouvert l'emporte.
  useEffect(() => {
    if (telephone && etat.menu) dispatch({ type: 'proprietes', ouvert: false });
  }, [telephone, etat.menu, dispatch]);
  useEffect(() => {
    if (telephone && etat.proprietes) dispatch({ type: 'menu', menu: null });
  }, [telephone, etat.proprietes, dispatch]);
  // Les panneaux changent la place du plan : on le recadre.
}
