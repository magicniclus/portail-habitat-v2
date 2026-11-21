'use client';

import {
  niveauInferieur,
  niveauSuperieur,
  objetsVisibles,
  tremies,
  type Aimantage,
} from '@ph/core/dessin';
import { AnnotationsSvg } from './AnnotationsSvg';
import { COULEURS_PLAN } from '@ph/ui/tokens';
import { useEffect, useMemo, useRef, useState, type Dispatch } from 'react';
import { EtiquettesPieces, MursSvg, PiecesSvg } from './CalquesPlan';
import { Cotes } from './CotesSvg';
import { TracesEnCours } from './Mesures';
import { niveauDe, sceneDe, type Action, type EtatEditeur } from './etat';
import { ObjetsSvg, ZonesSvg } from './AmenagementSvg';
import { useCadre } from './cadre';
import { ExterieurSvg } from './ExterieurSvg';
import { FondSvg } from './FondSvg';
import { LimitesSvg, OrthophotoSvg } from './ImplantationSvg';
import type { FondCharge } from './useFond';
import { GuidesSvg } from './GuidesSvg';
import { ToitSvg } from './ToitSvg';
import { DefsMotifs } from './Motifs';
import { SaisieLongueur } from './SaisieLongueur';
import { MultiSelectionSvg, useSelectionMultiple, ZoneSelectionSvg } from './SelectionMultiple';
import { useAimant } from './useAimant';
import { useAjustement } from './useAjustement';
import { useVue2D } from './useVue2D';
import { useDefilementAuto } from './useDefilementAuto';
import { versMmDuPlan } from './svg';
import { useGestesTactiles } from './useGestesTactiles';
import { useGlisser, useRappelsGlisser } from './useGlisser';
import { EscaliersSvg, OuverturesSvg, ReperesNiveauSvg } from './StructureSvg';

/** Plan 2D (DES-06, DES-32) : SVG en millimètres, net à tout zoom, exportable. */
export function Plan2D({
  etat,
  dispatch,
  fond,
  ortho,
}: {
  etat: EtatEditeur;
  dispatch: Dispatch<Action>;
  /** Image du plan importé, chargée par l'espace de travail. */
  fond: FondCharge | null;
  /** Photo aérienne de l'implantation (DES-35). */
  ortho: FondCharge | null;
}) {
  const n = niveauDe(etat);
  const scene = sceneDe(etat);
  const calques = scene.calques;
  const fondVisible =
    calques.fondImage && scene.fondImage?.niveauId === n.id ? scene.fondImage : null;
  // Calques du plan (DES-30) : mobilier, électricité, plomberie affichés ou masqués.
  const objets = useMemo(
    () => ({ objets: objetsVisibles(n.objets, calques) }),
    [n.objets, calques],
  );
  const svg = useRef<SVGSVGElement>(null);
  const [curseur, setCurseur] = useState<Aimantage | null>(null);
  const parcelle = scene.terrain?.parcelle;
  const cadre = useCadre(n, parcelle, [etat.trace, curseur?.point, ...etat.polygone]);
  const conteneur = useRef<HTMLDivElement>(null);
  useAjustement(conteneur, cadre, etat.ajustement, dispatch);
  useVue2D(conteneur, svg, etat.zoom, cadre, dispatch, etat.ajustement, etat.trace !== null);
  const mmParPx = 1000 / etat.zoom;

  const versMm = (ev: { clientX: number; clientY: number }) => versMmDuPlan(svg.current, ev);
  const aimante = useAimant(n, etat);

  const trace = etat.outil !== 'selection';
  const glisser = useGlisser(n, dispatch, versMm, trace);
  const { demarrerMur, demarrerObjet, demarrerExtremite } = useRappelsGlisser(glisser);
  const selectionne = useRef(false);
  useEffect(() => {
    selectionne.current = etat.selection !== null;
  }, [etat.selection]);
  const gestes = useGestesTactiles(etat.zoom, dispatch, selectionne);
  const multi = useSelectionMultiple(dispatch);
  const d = multi.dispatchPlan;
  /** Mouvement du pointeur ; `true` si un geste ou un tracé est en cours (défilement au bord). */
  const bouger = (ev: { clientX: number; clientY: number; altKey: boolean; shiftKey: boolean }) => {
    const p = versMm(ev);
    if (!p) return false;
    if (glisser.bouger(p, ev.altKey) || multi.bouger(p)) return true;
    if (trace) setCurseur(aimante(p, ev.shiftKey));
    return trace && etat.trace !== null;
  };
  const defil = useDefilementAuto(conteneur, bouger, cadre, mmParPx);

  return (
    <div className="relative h-full w-full">
      <div
        ref={conteneur}
        // Téléphone, panneau ouvert : la feuille du bas couvre le bas, le plan se cadre au-dessus.
        className={`h-full w-full overflow-auto ${etat.menu || etat.proprietes ? 'max-[899px]:pb-[60dvh]' : ''}`}
        // Papier pointillé du plan (maquette) : un point tous les 24 px.
        style={{
          backgroundColor: COULEURS_PLAN.fond,
          backgroundImage: `radial-gradient(${COULEURS_PLAN.grille} 1px, transparent 1.2px)`,
          backgroundSize: '24px 24px',
        }}
        data-testid="plan-2d"
        {...gestes}
      >
        {/* Centré quand il est plus petit que la zone, défilable quand il est plus grand. */}
        <div className="grid min-h-full min-w-full place-items-center w-max">
          <svg
            ref={svg}
            role="img"
            aria-label={`Plan 2D du niveau ${n.nom}`}
            width={Math.round(cadre.l / mmParPx)}
            height={Math.round(cadre.h / mmParPx)}
            viewBox={`${cadre.x} ${cadre.y} ${cadre.l} ${cadre.h}`}
            className={trace ? 'cursor-crosshair touch-none' : 'touch-none'}
            onPointerDownCapture={multi.capter}
            onPointerMove={(ev) => defil.suivre(ev, bouger)}
            onPointerDown={(ev) => {
              if (ev.target !== ev.currentTarget && !trace) return;
              const p = versMm(ev);
              if (!p) return;
              if (trace) dispatch({ type: 'poserPoint', point: aimante(p, ev.shiftKey).point });
              else if (!multi.demarrer(ev, p)) dispatch({ type: 'selectionner', selection: null });
            }}
            onPointerUp={() => {
              defil.arreter();
              glisser.finir();
              multi.finir(mmParPx);
            }}
            onDoubleClick={() => dispatch({ type: 'terminerTrace' })}
          >
            {/* Style noir et blanc imprimable (DES-32) : tout le dessin désaturé, export compris. */}
            <filter id="plan-noir-et-blanc">
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <g filter={etat.calques.noirEtBlanc ? 'url(#plan-noir-et-blanc)' : undefined}>
              <OrthophotoSvg scene={scene} image={ortho} />
              {fondVisible && fond ? <FondSvg fond={fondVisible} image={fond} /> : null}

              <DefsMotifs
                revetements={[
                  ...n.pieces.map((x) => x.sol),
                  ...n.zonesDeco.map((z) => z.revetement),
                  ...n.exterieur.terrasses.map((t) => t.revetement),
                ]}
                mmParPx={mmParPx}
              />
              <ExterieurSvg
                niveau={n}
                parcelle={scene.terrain?.parcelle ?? null}
                etat={etat}
                dispatch={d}
              />
              <PiecesSvg niveau={n} etat={etat} dispatch={d} />
              <ZonesSvg niveau={n} etat={etat} dispatch={d} />
              <ReperesNiveauSvg
                dessous={niveauInferieur(scene, n.id)}
                tremies={tremies(scene, n.id)}
              />
              <EscaliersSvg niveau={n} etat={etat} dispatch={d} />
              <ObjetsSvg niveau={objets} etat={etat} dispatch={d} demarrerGlisser={demarrerObjet} />
              <MursSvg
                niveau={n}
                etat={etat}
                dispatch={d}
                demarrerGlisser={demarrerMur}
                demarrerExtremite={demarrerExtremite}
              />
              <OuverturesSvg niveau={n} etat={etat} dispatch={d} />
              <ToitSvg niveau={n} dessus={niveauSuperieur(scene, n.id)} />
              <GuidesSvg guides={etat.guides} />
              {etat.calques.cotes ? (
                <Cotes niveau={n} etat={etat} mmParPx={mmParPx} dispatch={d} />
              ) : null}
              <EtiquettesPieces niveau={n} etat={etat} mmParPx={mmParPx} />
              {calques.annotations ? (
                <AnnotationsSvg niveau={n} etat={etat} dispatch={d} mmParPx={mmParPx} />
              ) : null}
              {scene.terrain || scene.orientationNord ? (
                <LimitesSvg
                  scene={scene}
                  mmParPx={mmParPx}
                  coin={{ x: cadre.x + cadre.l, y: cadre.y }}
                />
              ) : null}
              <MultiSelectionSvg niveau={n} multi={etat.multi} />
              <ZoneSelectionSvg zone={multi.zone} />
              <TracesEnCours etat={etat} curseur={trace ? curseur : null} mmParPx={mmParPx} />
            </g>
          </svg>
        </div>
      </div>
      {etat.outil === 'mur' && etat.trace ? (
        <SaisieLongueur trace={etat.trace} curseur={curseur?.point ?? null} dispatch={dispatch} />
      ) : null}
    </div>
  );
}
