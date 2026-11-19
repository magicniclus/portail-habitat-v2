'use client';

import { revetementDe, type Revetement } from '@ph/core/dessin';
import { useState, type Dispatch } from 'react';
import { niveauDe, type Action, type EtatEditeur } from './etat';

export interface Cible {
  cle: string;
  libelle: string;
  surface: 'sol' | 'mur' | 'plafond';
  actuel: Revetement | null;
  appliquer: (r: Revetement) => Action[];
}

/** Surfaces qu'on peut revêtir pour la sélection courante (pièce, mur, zone). */
export function ciblesDe(etat: EtatEditeur): Cible[] {
  const n = niveauDe(etat);
  const s = etat.selection;
  if (s?.genre === 'piece' && n.pieces.some((p) => p.id === s.id)) {
    const pieceId = s.id;
    const sur = (surface: 'sol' | 'plafond') => ({
      actuel: revetementDe(n, { genre: 'piece', pieceId, surface }),
      appliquer: (r: Revetement): Action[] => [
        { type: 'revetement', cible: { genre: 'piece', pieceId, surface }, revetement: r },
      ],
    });
    return [
      { cle: 'sol', libelle: 'Sol', surface: 'sol', ...sur('sol') },
      {
        cle: 'murs',
        libelle: 'Murs de la pièce',
        surface: 'mur',
        actuel: null,
        appliquer: (r) => [{ type: 'revetirMurs', pieceId, revetement: r }],
      },
      { cle: 'plafond', libelle: 'Plafond', surface: 'plafond', ...sur('plafond') },
    ];
  }
  if (s?.genre === 'mur' && n.murs.some((m) => m.id === s.id)) {
    const murId = s.id;
    const face = (f: 'a' | 'b', r: Revetement): Action => ({
      type: 'revetement',
      cible: { genre: 'mur', murId, face: f },
      revetement: r,
    });
    return [
      {
        cle: 'a',
        libelle: 'Côté gauche',
        surface: 'mur',
        actuel: revetementDe(n, { genre: 'mur', murId, face: 'a' }),
        appliquer: (r) => [face('a', r)],
      },
      {
        cle: 'b',
        libelle: 'Côté droit',
        surface: 'mur',
        actuel: revetementDe(n, { genre: 'mur', murId, face: 'b' }),
        appliquer: (r) => [face('b', r)],
      },
      {
        cle: 'ab',
        libelle: 'Les deux côtés',
        surface: 'mur',
        actuel: null,
        appliquer: (r) => [face('a', r), face('b', r)],
      },
    ];
  }
  const z = s?.genre === 'zone' ? n.zonesDeco.find((x) => x.id === s.id) : undefined;
  if (z)
    return [
      {
        cle: 'zone',
        libelle: 'Zone au sol',
        surface: 'sol',
        actuel: z.revetement,
        appliquer: (r) => [{ type: 'revetirZone', id: z.id, revetement: r }],
      },
    ];
  return [];
}

export function useCibleFinition(etat: EtatEditeur, dispatch: Dispatch<Action>) {
  const cibles = ciblesDe(etat);
  const [cle, setCible] = useState<string | null>(null);
  const cible = cibles.find((c) => c.cle === cle) ?? cibles[0] ?? null;
  return {
    cibles,
    cible,
    setCible,
    actuel: cible?.actuel ?? null,
    appliquer: (r: Revetement) => cible?.appliquer(r).forEach(dispatch),
  };
}
