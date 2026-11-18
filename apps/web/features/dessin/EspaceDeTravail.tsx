'use client';

import type { Scene } from '@ph/core/dessin';
import { Banner, Button } from '@ph/ui';
import type { Route } from 'next';
import { useEffect, useReducer } from 'react';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { lirePlan, renommerPlan, type EspaceDessin } from './api';
import { BarreDessin } from './BarreDessin';
import { ContenuMenu, TITRES_MENU } from './ContenuMenu';
import { etatInitial, reduire, sceneDe } from './etat';
import { Inspecteur } from './Inspecteur';
import { Panneau } from './Panneau';
import { Plan2D } from './Plan2D';
import { RailMenus, RailOutils } from './Rails';
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
  const telephone = useMediaQuery('(max-width: 899px)', false);

  // Raccourcis actifs tant que l'éditeur est ouvert, où que soit le focus (hors champs).
  useEffect(() => {
    const ecouter = (ev: globalThis.KeyboardEvent) => raccourci(ev, dispatch);
    document.addEventListener('keydown', ecouter);
    return () => document.removeEventListener('keydown', ecouter);
  }, []);
  // Sur téléphone, les panneaux passent par-dessus le plan : on démarre replié.
  useEffect(() => {
    if (!telephone) return;
    dispatch({ type: 'menu', menu: null });
    dispatch({ type: 'proprietes', ouvert: false });
  }, [telephone]);

  // Les panneaux changent la place du plan : on le recadre.
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
            <ContenuMenu menu={etat.menu} etat={etat} dispatch={dispatch} />
          </Panneau>
        ) : null}
        <main className="relative min-w-0 flex-1">
          <Plan2D etat={etat} dispatch={dispatch} />
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
