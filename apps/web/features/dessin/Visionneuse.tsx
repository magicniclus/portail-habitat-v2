'use client';

import type { Scene } from '@ph/core/dessin';
import { Select } from '@ph/ui';
import dynamic from 'next/dynamic';
import { useEffect, useReducer } from 'react';
import {
  etatInitial,
  niveauDe,
  reduire,
  sceneDe,
  type Action,
  type EtatEditeur,
  type Vue,
} from './etat';
import { Facades } from './Facades';
import { Plan2D } from './Plan2D';

const chargement3D = () => (
  <p role="status" className="grid h-full place-items-center text-sm text-neutre-800">
    Préparation de la 3D…
  </p>
);
const Vue3D = dynamic(() => import('./vue3d/Vue3D'), { ssr: false, loading: chargement3D });
const Visite = dynamic(() => import('./vue3d/Visite'), { ssr: false, loading: chargement3D });

const VUES: { vue: Vue; libelle: string }[] = [
  { vue: 'plan', libelle: 'Plan' },
  { vue: '3d', libelle: '3D' },
  { vue: 'visite', libelle: 'Visite' },
  { vue: 'facades', libelle: 'Façades' },
];

/** Lecture seule : toute action qui modifierait la scène est ignorée. */
function reduireLecture(e: EtatEditeur, a: Action): EtatEditeur {
  const suite = reduire(e, a);
  return suite.historique === e.historique ? { ...suite, erreur: null } : e;
}

/**
 * Plan partagé (DES-42) : plan, 3D, visite et façades en lecture seule, sans compte. Le serveur
 * a déjà retiré ce qui situe le bien.
 */
export function Visionneuse({ titre, scene }: { titre: string; scene: Scene }) {
  const [etat, dispatch] = useReducer(reduireLecture, scene, (s) => ({
    ...etatInitial(s),
    menu: null,
    proprietes: false,
  }));
  const s = sceneDe(etat);
  // Téléphone tourné, fenêtre redimensionnée : le plan se recadre.
  useEffect(() => {
    const ajuster = () => dispatch({ type: 'ajuster' });
    window.addEventListener('resize', ajuster);
    return () => window.removeEventListener('resize', ajuster);
  }, []);
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-blanc">
      <header className="flex flex-wrap items-center gap-2 border-b border-neutre-200 px-3 py-2">
        <div className="flex min-w-[min(100%,16rem)] flex-1 items-center gap-2">
          <h1 className="m-0 min-w-0 flex-1 truncate text-base font-bold">{titre}</h1>
          <span className="flex-none rounded-full bg-neutre-100 px-2.5 py-1 text-xs font-semibold text-neutre-800">
            Lecture seule
          </span>
        </div>
        {s.niveaux.length > 1 ? (
          <Select
            aria-label="Niveau"
            value={niveauDe(etat).id}
            onChange={(ev) => dispatch({ type: 'changerNiveau', niveauId: ev.target.value })}
            className="w-auto"
          >
            {s.niveaux.map((n) => (
              <option key={n.id} value={n.id}>
                {n.nom}
              </option>
            ))}
          </Select>
        ) : null}
        <div role="radiogroup" aria-label="Vue" className="flex rounded-[10px] bg-neutre-100 p-1">
          {VUES.map((v) => (
            <button
              key={v.vue}
              type="button"
              role="radio"
              aria-checked={etat.vue === v.vue}
              onClick={() => dispatch({ type: 'vue', vue: v.vue })}
              className={`min-h-11 cursor-pointer rounded-lg border-0 px-3 text-sm font-bold ${etat.vue === v.vue ? 'bg-blanc text-texte shadow-sm' : 'bg-transparent text-neutre-800'}`}
            >
              {v.libelle}
            </button>
          ))}
        </div>
      </header>
      <main className="relative min-h-0 flex-1">
        {etat.vue === 'plan' ? (
          <Plan2D etat={etat} dispatch={dispatch} fond={null} ortho={null} />
        ) : etat.vue === 'visite' ? (
          <Visite etat={etat} />
        ) : etat.vue === 'facades' ? (
          <Facades etat={etat} dispatch={dispatch} />
        ) : (
          <Vue3D etat={etat} dispatch={dispatch} />
        )}
      </main>
      <p className="m-0 border-t border-neutre-200 px-3 py-2 text-center text-xs text-neutre-800">
        Plan partagé avec Portail Travaux · indicatif, cotes à vérifier sur place
      </p>
    </div>
  );
}
