'use client';

import { couleur as schemaCouleur, JETONS_COULEUR } from '@ph/core/sites';
import { useSyncExternalStore } from 'react';

/**
 * Couleurs personnalisées récemment utilisées (6 au plus), gardées sur cet appareil seulement :
 * une commodité, rien n'est partagé ni enregistré avec le site. Relues avec le même schéma que le
 * serveur (le stockage local n'est pas fiable).
 */
const CLE = 'ph-editeur-couleurs-recentes';
const MAX = 6;
const VIDE: string[] = [];
const abonnes = new Set<() => void>();
let cache: string[] | null = null;

const libre = (c: unknown): c is string =>
  typeof c === 'string' &&
  !(JETONS_COULEUR as readonly string[]).includes(c) &&
  schemaCouleur.safeParse(c).success;

function lire(): string[] {
  if (cache) return cache;
  try {
    const v: unknown = JSON.parse(localStorage.getItem(CLE) ?? '[]');
    cache = Array.isArray(v) ? v.filter(libre).slice(0, MAX) : [];
  } catch {
    cache = [];
  }
  return cache;
}

export function ajouterCouleurRecente(c: string) {
  if (!libre(c)) return;
  cache = [c, ...lire().filter((x) => x !== c)].slice(0, MAX);
  try {
    localStorage.setItem(CLE, JSON.stringify(cache));
  } catch {
    // Navigation privée ou stockage bloqué : la liste vit le temps de la page.
  }
  abonnes.forEach((f) => f());
}

export function useCouleursRecentes(): string[] {
  return useSyncExternalStore(
    (f) => {
      abonnes.add(f);
      return () => abonnes.delete(f);
    },
    lire,
    () => VIDE,
  );
}
