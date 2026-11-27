'use client';

import { useSyncExternalStore } from 'react';
import type { GroupeMetiers } from './metiers';

const sAbonner = () => () => {};
const lireUrl = () => new URLSearchParams(window.location.search).get('metier');
const auServeur = () => null;

/**
 * Métier ciblé par `?metier=` (liens des campagnes), s'il existe dans le référentiel. Lu dans le
 * navigateur seulement : la page reste statique et le formulaire est dans le HTML initial.
 */
export function useMetierCible(groupes: GroupeMetiers[]) {
  const id = useSyncExternalStore(sAbonner, lireUrl, auServeur);
  return id ? groupes.flatMap((g) => g.metiers).find((m) => m.id === id) : undefined;
}
