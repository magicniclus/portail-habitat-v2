'use client';

import {
  longueurMur,
  facesExterieures,
  panDeMur,
  pieceDevant,
  revetementDe,
  revetementDuTerrain,
  type Revetement,
} from '@ph/core/dessin';
import { useState, type Dispatch } from 'react';
import { niveauDe, sceneDe, type Action, type EtatEditeur } from './etat';

export interface Cible {
  cle: string;
  libelle: string;
  surface: 'sol' | 'mur' | 'plafond' | 'terrain';
  actuel: Revetement | null;
  appliquer: (r: Revetement) => Action[];
}

/** Revêtement commun aux deux côtés d'un mur, s'ils sont identiques. */
function memeRevetement(n: ReturnType<typeof niveauDe>, murId: string): Revetement | null {
  const a = revetementDe(n, { genre: 'mur', murId, face: 'a' });
  const b = revetementDe(n, { genre: 'mur', murId, face: 'b' });
  return JSON.stringify(a) === JSON.stringify(b) ? a : null;
}

/** Côtés d'un mur nommés par ce qu'ils regardent : la pièce, ou l'extérieur. */
export function cotesDuMur(n: ReturnType<typeof niveauDe>, murId: string) {
  const cote = (f: 'a' | 'b') => {
    const p = pieceDevant(n, murId, f);
    return p ? `Côté ${p.nom}` : 'Côté extérieur';
  };
  return { a: cote('a'), b: cote('b') };
}

/** Toutes les faces qui donnent dehors, en une fois ; chacune reste modifiable seule ensuite. */
const exterieurs = (n: ReturnType<typeof niveauDe>): Cible[] =>
  facesExterieures(n).length
    ? [
        {
          cle: 'exterieurs',
          libelle: 'Tous les murs extérieurs',
          surface: 'mur',
          actuel: null,
          appliquer: (r) => [{ type: 'revetirMursExterieurs', revetement: r }],
        },
      ]
    : [];

/** Surfaces qu'on peut revêtir pour la sélection courante (pièce, mur, zone). */
export function ciblesDe(etat: EtatEditeur): Cible[] {
  const n = niveauDe(etat);
  const s = etat.selection;
  // Parcelle choisie : son sol (gazon par défaut), revêtu comme le sol d'une pièce.
  if (s?.genre === 'parcelle' && sceneDe(etat).terrain)
    return [
      {
        cle: 'terrain',
        libelle: 'Sol du terrain',
        surface: 'terrain',
        actuel: revetementDuTerrain(sceneDe(etat)),
        appliquer: (r) => [{ type: 'revetirTerrain', revetement: r }],
      },
    ];
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
      ...exterieurs(n),
    ];
  }
  if (s?.genre === 'mur' && n.murs.some((m) => m.id === s.id)) {
    const murId = s.id;
    const noms = cotesDuMur(n, murId);
    const face = (f: 'a' | 'b', r: Revetement): Action => ({
      type: 'revetement',
      cible: { genre: 'mur', murId, face: f },
      revetement: r,
    });
    const cotes: Cible[] = [
      {
        cle: 'a',
        libelle: noms.a,
        surface: 'mur',
        actuel: revetementDe(n, { genre: 'mur', murId, face: 'a' }),
        appliquer: (r) => [face('a', r)],
      },
      {
        cle: 'b',
        libelle: noms.b,
        surface: 'mur',
        actuel: revetementDe(n, { genre: 'mur', murId, face: 'b' }),
        appliquer: (r) => [face('b', r)],
      },
      {
        cle: 'ab',
        libelle: 'Les deux côtés',
        surface: 'mur',
        // Les deux côtés pareils : ce revêtement est le revêtement actuel.
        actuel: memeRevetement(n, murId),
        appliquer: (r) => [face('a', r), face('b', r)],
      },
    ];
    // Côté cliqué en 3D proposé en premier ; un pan cliqué (entre deux cloisons) avant tout.
    const ordonnes = [
      ...(s.face === 'b' ? [cotes[1]!, cotes[0]!, cotes[2]!] : cotes),
      ...exterieurs(n),
    ];
    const pan = s.face && s.s !== undefined ? panDeMur(n, murId, s.face, s.s) : null;
    const m = n.murs.find((x) => x.id === murId)!;
    const entier = pan && pan.coupe[0] === 0 && Math.abs(pan.coupe[1] - longueurMur(m)) < 1;
    if (!pan || entier || !s.face || s.s === undefined) return ordonnes;
    const [cote, position] = [s.face, s.s];
    return [
      {
        cle: 'pan',
        libelle: 'Ce pan de mur',
        surface: 'mur',
        actuel: revetementDe(n, { genre: 'mur', murId, face: cote }),
        appliquer: (r) => [{ type: 'revetirPan', murId, face: cote, s: position, revetement: r }],
      },
      ...ordonnes,
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
  // Rien de choisi : on peut toujours habiller toutes les façades d'un coup.
  return s ? [] : exterieurs(n);
}

export function useCibleFinition(etat: EtatEditeur, dispatch: Dispatch<Action>) {
  const cibles = ciblesDe(etat);
  // Le choix de surface vaut pour la sélection où il a été fait : une autre sélection repart
  // de sa première surface (le côté cliqué en 3D, par exemple).
  const s = etat.selection;
  const pour = s ? `${s.genre}:${s.id}:${s.face ?? ''}` : '';
  const [choix, setChoix] = useState<{ cle: string; pour: string } | null>(null);
  const cle = choix?.pour === pour ? choix.cle : null;
  // Mur entier sélectionné (sans côté) : les deux côtés, comme ce que montre le plan.
  const parDefaut = s?.genre === 'mur' && !s.face ? cibles.find((c) => c.cle === 'ab') : undefined;
  const cible = cibles.find((c) => c.cle === cle) ?? parDefaut ?? cibles[0] ?? null;
  return {
    cibles,
    cible,
    setCible: (c: string) => {
      // Un côté de mur choisi devient la sélection : il se voit sur le plan et en 3D.
      if (s?.genre === 'mur' && (c === 'a' || c === 'b' || c === 'ab')) {
        const face = c === 'ab' ? undefined : c;
        dispatch({ type: 'selectionner', selection: { genre: 'mur', id: s.id, face } });
        setChoix({ cle: c, pour: `mur:${s.id}:${face ?? ''}` });
      } else setChoix({ cle: c, pour });
    },
    actuel: cible?.actuel ?? null,
    appliquer: (r: Revetement) => cible?.appliquer(r).forEach(dispatch),
  };
}
