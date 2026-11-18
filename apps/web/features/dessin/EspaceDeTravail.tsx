'use client';

import type { Scene } from '@ph/core/dessin';
import { Banner, Button } from '@ph/ui';
import type { Route } from 'next';
import dynamic from 'next/dynamic';
import { useEffect, useReducer } from 'react';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { lirePlan, renommerPlan, type EspaceDessin } from './api';
import { BarreDessin } from './BarreDessin';
import { ContenuMenu, TITRES_MENU } from './ContenuMenu';
import { etatInitial, reduire, sceneDe } from './etat';
import { Inspecteur } from './Inspecteur';
import { Panneau } from './Panneau';
import { Plan2D } from './Plan2D';

/** three.js n'est chargé qu'au passage en 3D (DESSIN.md §5 bis, budget EXPLOITATION §1). */
const chargement3D = () => (
  <p role="status" className="grid h-full place-items-center text-sm text-neutre-800">
    Préparation de la 3D…
  </p>
);
const Vue3D = dynamic(() => import('./vue3d/Vue3D'), { ssr: false, loading: chargement3D });
const Visite = dynamic(() => import('./vue3d/Visite'), { ssr: false, loading: chargement3D });
import { RailMenus, RailOutils } from './Rails';
import { useFond } from './useFond';
import { usePanneauxTelephone } from './usePanneauxTelephone';
import { useSauvegarde } from './useSauvegarde';

/** Raccourcis (DES-47) : ignorés pendant une saisie dans un champ. */
function raccourci(
  ev: globalThis.KeyboardEvent,
  dispatch: (a: Parameters<typeof reduire>[1]) => void,
) {
  const cible = ev.target as HTMLElement;
  if (cible.closest('input, textarea, select, [contenteditable="true"]')) return;
  const mod = ev.metaKey || ev.ctrlKey;
  const k = ev.key.toLowerCase();
  const pas = ev.shiftKey ? 100 : 10;
  const fleches: Record<string, { x: number; y: number }> = {
    arrowleft: { x: -pas, y: 0 },
    arrowright: { x: pas, y: 0 },
    arrowup: { x: 0, y: -pas },
    arrowdown: { x: 0, y: pas },
  };
  if (mod && k === 'z') dispatch({ type: ev.shiftKey ? 'retablir' : 'annuler' });
  else if (mod && k === 'y') dispatch({ type: 'retablir' });
  else if (k === 'escape') dispatch({ type: 'terminerTrace' });
  else if (k === 'r' && !mod) dispatch({ type: 'tournerSelection' });
  else if (k === 'delete' || k === 'backspace') dispatch({ type: 'supprimerSelection' });
  else if (fleches[k]) {
    dispatch({ type: 'deplacerClavier', delta: fleches[k] });
    dispatch({ type: 'finGeste' });
  } else return;
  ev.preventDefault();
}

/**
 * Éditeur plein écran (DESSIN.md §7) : barre en haut, rail des menus à gauche et rail des
 * outils à droite, chacun avec son panneau repliable ; le plan occupe tout le reste.
 */
export function EspaceDeTravail(p: {
  espace: EspaceDessin;
  planId: string;
  titre: string;
  scene: Scene;
  revision: number;
  retour: Route;
}) {
  const [etat, dispatch] = useReducer(reduire, p.scene, etatInitial);
  const s = useSauvegarde({
    espace: p.espace,
    planId: p.planId,
    scene: sceneDe(etat),
    revisionInitiale: p.revision,
  });
  const fond = useFond(p.espace, p.planId, sceneDe(etat).fondImage?.storagePath ?? null);
  const telephone = useMediaQuery('(max-width: 899px)', false);

  // Raccourcis actifs tant que l'éditeur est ouvert, où que soit le focus (hors champs).
  useEffect(() => {
    const ecouter = (ev: globalThis.KeyboardEvent) => raccourci(ev, dispatch);
    document.addEventListener('keydown', ecouter);
    return () => document.removeEventListener('keydown', ecouter);
  }, []);
  usePanneauxTelephone(telephone, etat, dispatch);
  useEffect(() => {
    dispatch({ type: 'ajuster' });
  }, [etat.menu, etat.proprietes]);

  const resoudreConflit = async (garderLaMienne: boolean) => {
    const r = await lirePlan(p.espace, p.planId);
    if (!r.ok) return;
    s.resoudre(r.data, garderLaMienne);
    if (!garderLaMienne) dispatch({ type: 'remplacerScene', scene: r.data.scene });
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-blanc">
      <BarreDessin
        titre={p.titre}
        renommer={(t) => void renommerPlan(p.espace, p.planId, t)}
        retour={p.retour}
        etat={etat}
        dispatch={dispatch}
        sauvegarde={s.etat}
        enregistrer={() => void s.enregistrerMaintenant('Enregistrement manuel')}
      />
      <div className="relative flex min-h-0 flex-1">
        <RailMenus etat={etat} dispatch={dispatch} />
        {etat.menu ? (
          <Panneau
            cote="gauche"
            titre={TITRES_MENU[etat.menu]}
            replier={() => dispatch({ type: 'menu', menu: null })}
          >
            <ContenuMenu
              menu={etat.menu}
              etat={etat}
              dispatch={dispatch}
              espace={p.espace}
              planId={p.planId}
            />
          </Panneau>
        ) : null}
        <main className="relative min-w-0 flex-1">
          {etat.vue === 'plan' ? (
            <Plan2D etat={etat} dispatch={dispatch} fond={fond} />
          ) : etat.vue === 'visite' ? (
            <Visite etat={etat} />
          ) : (
            <Vue3D etat={etat} dispatch={dispatch} />
          )}
          <div className="pointer-events-none absolute inset-x-3 top-3 grid gap-2 [&>*]:pointer-events-auto">
            {s.etat === 'conflit' ? (
              <Banner tone="danger" titre="Ce plan a été modifié ailleurs">
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button taille="sm" onClick={() => void resoudreConflit(false)}>
                    Prendre la version enregistrée
                  </Button>
                  <Button
                    taille="sm"
                    variant="secondaire"
                    onClick={() => void resoudreConflit(true)}
                  >
                    Garder la mienne
                  </Button>
                </div>
              </Banner>
            ) : null}
            {s.etat === 'erreur' && s.message ? <Banner tone="danger">{s.message}</Banner> : null}
            {etat.erreur ? (
              <Banner
                tone="attention"
                action={
                  <Button
                    taille="sm"
                    variant="secondaire"
                    onClick={() => dispatch({ type: 'effacerErreur' })}
                  >
                    OK
                  </Button>
                }
              >
                {etat.erreur}
              </Banner>
            ) : null}
          </div>
        </main>
        {etat.proprietes ? (
          <Panneau
            cote="droite"
            titre="Propriétés"
            replier={() => dispatch({ type: 'proprietes', ouvert: false })}
          >
            <Inspecteur etat={etat} dispatch={dispatch} />
          </Panneau>
        ) : null}
        <RailOutils etat={etat} dispatch={dispatch} />
      </div>
    </div>
  );
}
