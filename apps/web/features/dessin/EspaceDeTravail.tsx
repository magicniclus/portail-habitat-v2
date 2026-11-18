'use client';

import type { Scene } from '@ph/core/dessin';
import { Banner, Button, Feuille } from '@ph/ui';
import type { Route } from 'next';
import { useEffect, useReducer, useRef, useState } from 'react';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { lirePlan, renommerPlan, type EspaceDessin } from './api';
import { BarreDessin } from './BarreDessin';
import { Bibliotheque } from './Bibliotheque';
import { CommandesPlan } from './CommandesPlan';
import { etatInitial, reduire, sceneDe } from './etat';
import { GuideDemarrage } from './GuideDemarrage';
import { Inspecteur } from './Inspecteur';
import { PaletteOutils } from './PaletteOutils';
import { Plan2D } from './Plan2D';
import { useSauvegarde } from './useSauvegarde';

const CLE_GUIDE = 'dessin-guide-masque';

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
  // Raccourcis actifs tant que l'éditeur est ouvert, où que soit le focus (hors champs).
  useEffect(() => {
    const ecouter = (ev: globalThis.KeyboardEvent) => raccourci(ev, dispatch);
    document.addEventListener('keydown', ecouter);
    return () => document.removeEventListener('keydown', ecouter);
  }, []);
  const racine = useRef<HTMLDivElement>(null);
  const [haut, setHaut] = useState(64);
  useEffect(() => {
    const el = racine.current;
    if (!el) return;
    const mesurer = () => setHaut(Math.max(0, el.getBoundingClientRect().top + window.scrollY));
    const o = new ResizeObserver(mesurer);
    o.observe(document.body);
    return () => o.disconnect();
  }, []);
  const telephone = useMediaQuery('(max-width: 899px)', false);
  const [feuille, setFeuille] = useState<'bibliotheque' | 'inspecteur' | null>(null);
  // Monté après le chargement du plan, côté navigateur uniquement : lecture directe.
  const [guide, setGuide] = useState(() => {
    try {
      return localStorage.getItem(CLE_GUIDE) !== '1';
    } catch {
      return true;
    }
  });
  const basculerGuide = () => {
    setGuide((g) => {
      try {
        localStorage.setItem(CLE_GUIDE, g ? '1' : '0');
      } catch {
        // Stockage indisponible : le choix vaut pour cette visite.
      }
      return !g;
    });
  };

  const resoudreConflit = async (garderLaMienne: boolean) => {
    const r = await lirePlan(p.espace, p.planId);
    if (!r.ok) return;
    s.resoudre(r.data, garderLaMienne);
    if (!garderLaMienne) dispatch({ type: 'remplacerScene', scene: r.data.scene });
  };

  return (
    <div
      ref={racine}
      // Hauteur disponible sous l'en-tête ; l'espace pro réserve la navigation du bas (téléphone).
      style={{ height: `calc(100dvh - ${haut}px - var(--marge-bas-dessin, 0px))` }}
      className="flex min-h-[480px] flex-col bg-blanc"
    >
      <BarreDessin
        titre={p.titre}
        renommer={(t) => void renommerPlan(p.espace, p.planId, t)}
        retour={p.retour}
        etat={etat}
        dispatch={dispatch}
        sauvegarde={s.etat}
        enregistrer={() => void s.enregistrerMaintenant('Enregistrement manuel')}
        basculerGuide={basculerGuide}
      />
      <div className="flex min-h-0 flex-1">
        {telephone ? null : (
          <aside
            aria-label="Bibliothèque"
            className="flex w-[300px] flex-none flex-col border-r border-trait"
          >
            <div className="min-h-0 flex-1">
              <Bibliotheque etat={etat} dispatch={dispatch} />
            </div>
            {guide ? (
              <div className="border-t border-trait p-2.5">
                <GuideDemarrage etat={etat} fermer={basculerGuide} />
              </div>
            ) : null}
          </aside>
        )}
        <main className="relative min-w-0 flex-1">
          <Plan2D etat={etat} dispatch={dispatch} />
          <div className="absolute top-3 left-3 right-3 grid gap-2">
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
          <div className="absolute max-[899px]:bottom-3 max-[899px]:left-1/2 max-[899px]:-translate-x-1/2 min-[900px]:top-1/2 min-[900px]:left-4 min-[900px]:-translate-y-1/2">
            <PaletteOutils etat={etat} dispatch={dispatch} />
          </div>
          <CommandesPlan
            etat={etat}
            dispatch={dispatch}
            telephone={telephone}
            ouvrir={setFeuille}
          />
        </main>
        {telephone ? null : (
          <aside
            aria-label="Propriétés"
            className="w-[290px] flex-none overflow-y-auto border-l border-trait p-4"
          >
            <Inspecteur etat={etat} dispatch={dispatch} />
          </aside>
        )}
      </div>
      {telephone ? (
        <Feuille
          mode="bas"
          open={feuille !== null}
          onOpenChange={(o) => !o && setFeuille(null)}
          titre={feuille === 'bibliotheque' ? 'Bibliothèque' : 'Propriétés'}
        >
          {feuille === 'bibliotheque' ? (
            <div className="h-[60dvh]">
              <Bibliotheque etat={etat} dispatch={dispatch} />
            </div>
          ) : (
            <Inspecteur etat={etat} dispatch={dispatch} />
          )}
        </Feuille>
      ) : null}
    </div>
  );
}
