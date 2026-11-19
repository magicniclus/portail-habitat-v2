'use client';

import type { Scene } from '@ph/core/dessin';
import type { Route } from 'next';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useReducer, useState } from 'react';
import { usePresence } from './usePresence';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { lirePlan, renommerPlan, type EspaceDessin } from './api';
import { BarreDessin } from './BarreDessin';
import { ContenuMenu, TITRES_MENU } from './ContenuMenu';
import { etatInitial, reduire, sceneDe } from './etat';
import { Inspecteur } from './Inspecteur';
import { Panneau } from './Panneau';
import { AideRaccourcis } from './AideRaccourcis';
import { AnnonceSelection } from './AnnonceSelection';
import { Bandeaux } from './Bandeaux';
import { connexionEssai, FournisseurEssai } from './essai';
import { Facades } from './Facades';
import { HistoriqueVersions } from './HistoriqueVersions';
import { Plan2D } from './Plan2D';

/** three.js n'est chargé qu'au passage en 3D (DESSIN.md §5 bis, budget EXPLOITATION §1). */
const chargement3D = () => (
  <p role="status" className="grid h-full place-items-center text-sm text-neutre-800">
    Préparation de la 3D…
  </p>
);
const Vue3D = dynamic(() => import('./vue3d/Vue3D'), { ssr: false, loading: chargement3D });
const Visite = dynamic(() => import('./vue3d/Visite'), { ssr: false, loading: chargement3D });
const Photo = dynamic(() => import('./vue3d/Photo'), { ssr: false, loading: chargement3D });
import { RailMenus, RailOutils } from './Rails';
import { useFond } from './useFond';
import { usePanneauxTelephone } from './usePanneauxTelephone';
import { useSauvegarde } from './useSauvegarde';
import { raccourci } from './raccourcis';

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
  /** Essai sans compte (DES-03) : rien n'est envoyé au serveur. */
  essai?: boolean;
}) {
  const [etat, dispatch] = useReducer(reduire, p.scene, etatInitial);
  const s = useSauvegarde({
    espace: p.espace,
    planId: p.planId,
    scene: sceneDe(etat),
    revisionInitiale: p.revision,
    ...(p.essai ? { essai: true } : {}),
  });
  const router = useRouter();
  const fond = useFond(p.espace, p.planId, sceneDe(etat).fondImage?.storagePath ?? null);
  const ortho = useFond(p.espace, p.planId, sceneDe(etat).terrain?.orthophoto?.storagePath ?? null);
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

  const [versions, setVersions] = useState(false);
  // Panneaux animés : gardés le temps de leur sortie.
  const menu = usePresence(etat.menu);
  const proprietes = usePresence(etat.proprietes || null);
  const resoudreConflit = async (garderLaMienne: boolean) => {
    const r = await lirePlan(p.espace, p.planId);
    if (!r.ok) return;
    s.resoudre(r.data, garderLaMienne);
    if (!garderLaMienne) dispatch({ type: 'remplacerScene', scene: r.data.scene });
  };

  return (
    <FournisseurEssai value={Boolean(p.essai)}>
      <div className="flex h-dvh flex-col overflow-hidden bg-blanc">
        <BarreDessin
          titre={p.titre}
          renommer={(t) => (p.essai ? undefined : void renommerPlan(p.espace, p.planId, t))}
          retour={p.retour}
          etat={etat}
          dispatch={dispatch}
          sauvegarde={s.etat}
          enregistrer={() =>
            p.essai
              ? void s.enregistrerMaintenant().then(() => router.push(connexionEssai()))
              : void s.enregistrerMaintenant('Enregistrement manuel')
          }
          {...(p.essai ? {} : { versions: () => setVersions(true) })}
        />
        <div className="relative flex min-h-0 flex-1">
          <RailMenus etat={etat} dispatch={dispatch} />
          {menu.rendu ? (
            <Panneau
              cote="gauche"
              titre={TITRES_MENU[menu.rendu]}
              replier={() => dispatch({ type: 'menu', menu: null })}
              sortie={menu.sortie}
            >
              <ContenuMenu
                menu={menu.rendu}
                etat={etat}
                dispatch={dispatch}
                espace={p.espace}
                planId={p.planId}
              />
            </Panneau>
          ) : null}
          <main className="relative min-w-0 flex-1">
            {etat.vue === 'plan' ? (
              <Plan2D etat={etat} dispatch={dispatch} fond={fond} ortho={ortho} />
            ) : etat.vue === 'visite' ? (
              <Visite etat={etat} />
            ) : etat.vue === 'facades' ? (
              <Facades etat={etat} dispatch={dispatch} />
            ) : etat.vue === 'photo' ? (
              <Photo etat={etat} dispatch={dispatch} espace={p.espace} planId={p.planId} />
            ) : (
              <Vue3D etat={etat} dispatch={dispatch} ortho={ortho?.url ?? null} />
            )}
            <Bandeaux
              etat={etat}
              dispatch={dispatch}
              sauvegarde={s}
              essai={Boolean(p.essai)}
              resoudreConflit={(garder) => void resoudreConflit(garder)}
            />
          </main>
          {proprietes.rendu ? (
            <Panneau
              cote="droite"
              titre="Propriétés"
              replier={() => dispatch({ type: 'proprietes', ouvert: false })}
              sortie={proprietes.sortie}
            >
              <Inspecteur etat={etat} dispatch={dispatch} />
            </Panneau>
          ) : null}
          <RailOutils etat={etat} dispatch={dispatch} />
          <AnnonceSelection etat={etat} />
          <AideRaccourcis />
        </div>
      </div>
      {p.essai ? null : (
        <HistoriqueVersions
          ouvert={versions}
          fermer={() => setVersions(false)}
          espace={p.espace}
          planId={p.planId}
          revision={() => s.revision.current}
          nommer={(nom) => s.enregistrerMaintenant(nom)}
          restauree={(plan) => {
            s.resoudre(plan, false);
            dispatch({ type: 'remplacerScene', scene: plan.scene });
          }}
        />
      )}
    </FournisseurEssai>
  );
}
