'use client';

import {
  niveauInferieur,
  niveauSuperieur,
  objetsVisibles,
  tremies,
  type Aimantage,
} from '@ph/core/dessin';
import { AnnotationsSvg } from './AnnotationsSvg';
import { useEffect, useMemo, useRef, useState, type Dispatch } from 'react';
import { EtiquettesPieces, MursSvg, PiecesSvg } from './CalquesPlan';
import { Cotes } from './CotesSvg';
import { TracesEnCours } from './Mesures';
import { niveauDe, sceneDe, type Action, type EtatEditeur } from './etat';
import { ObjetsSvg, ZonesSvg } from './AmenagementSvg';
import { cadreDe } from './cadre';
import { ExterieurSvg } from './ExterieurSvg';
import { ParcelleSvg } from './ParcelleSvg';
import { FondSvg } from './FondSvg';
import { LimitesSvg, OrthophotoSvg } from './ImplantationSvg';
import type { FondCharge } from './useFond';
import { GuidesSvg } from './GuidesSvg';
import { ToitSvg } from './ToitSvg';
import { DefsMotifs } from './Motifs';
import { SaisieLongueur } from './SaisieLongueur';
import { MultiSelectionSvg, useSelectionMultiple, ZoneSelectionSvg } from './SelectionMultiple';
import { useAimant } from './useAimant';
import { papier, useReserveTelephone } from './papier';
import { useCamera } from './useCamera';
import { usePanoramique } from './usePanoramique';
import { useDefilementAuto } from './useDefilementAuto';
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
  const conteneur = useRef<HTMLDivElement>(null);
  // Téléphone, panneau ouvert : la feuille du bas couvre le bas, le plan se cadre au-dessus.
  const reserve = useReserveTelephone(Boolean(etat.menu || etat.proprietes));
  const camera = useCamera(conteneur, etat, dispatch, () => cadreDe(n, parcelle), reserve);
  const { vue, mmParPx, moteur } = camera;
  const versMm = moteur.versMm;
  const pan = usePanoramique(conteneur, moteur);
  const aimante = useAimant(n, etat);

  const trace = etat.outil !== 'selection';
  const glisser = useGlisser(n, dispatch, versMm, trace);
  const g = useRappelsGlisser(glisser);
  const selectionne = useRef(false);
  useEffect(() => {
    selectionne.current = etat.selection !== null;
  }, [etat.selection]);
  const gestes = useGestesTactiles(moteur, pan.annuler, dispatch, selectionne);
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
  const defil = useDefilementAuto(conteneur, moteur.deplacer);

  return (
    <div className="relative h-full w-full">
      <div
        ref={conteneur}
        className={`relative h-full w-full touch-none overflow-hidden ${pan.curseur ?? ''}`}
        // Papier pointillé du plan (maquette) : un point tous les 24 px, qui suit la vue.
        style={papier(vue, mmParPx)}
        data-testid="plan-2d"
        {...gestes}
      >
        <svg
          ref={svg}
          role="img"
          aria-label={`Plan 2D du niveau ${n.nom}`}
          width={camera.taille.w}
          height={camera.taille.h}
          viewBox={`${vue.x} ${vue.y} ${vue.l} ${vue.h}`}
          data-cadre={Object.values(cadreDe(n, parcelle)).join(' ')}
          className={`absolute inset-0 select-none ${trace ? 'plan-trace' : 'plan-selection'} ${glisser.actif ? 'plan-geste' : ''}`}
          onPointerDownCapture={multi.capter}
          onPointerMove={(ev) => defil.suivre(ev, bouger)}
          onPointerDown={(ev) => {
            if (ev.target !== ev.currentTarget && !trace) return;
            const p = versMm(ev);
            if (!p) return;
            if (ev.pointerType === 'touch' && !trace) return pan.demarrer(ev);
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

            <DefsMotifs niveau={n} mmParPx={mmParPx} />
            <ExterieurSvg niveau={n} etat={etat} dispatch={d} />
            <ParcelleSvg
              parcelle={parcelle ?? null}
              etat={etat}
              dispatch={d}
              mmParPx={mmParPx}
              {...g}
            />
            <PiecesSvg niveau={n} etat={etat} dispatch={d} />
            <ZonesSvg niveau={n} etat={etat} dispatch={d} />
            <ReperesNiveauSvg
              dessous={niveauInferieur(scene, n.id)}
              tremies={tremies(scene, n.id)}
            />
            <EscaliersSvg niveau={n} etat={etat} dispatch={d} />
            <ObjetsSvg niveau={objets} etat={etat} dispatch={d} demarrerGlisser={g.demarrerObjet} />
            <MursSvg
              niveau={n}
              etat={etat}
              dispatch={d}
              demarrerGlisser={g.demarrerMur}
              demarrerExtremite={g.demarrerExtremite}
            />
            <OuverturesSvg niveau={n} etat={etat} dispatch={d} {...g} />
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
              <LimitesSvg scene={scene} mmParPx={mmParPx} coin={{ x: vue.x + vue.l, y: vue.y }} />
            ) : null}
            <MultiSelectionSvg niveau={n} multi={etat.multi} />
            <ZoneSelectionSvg zone={multi.zone} />
            <TracesEnCours etat={etat} curseur={trace ? curseur : null} mmParPx={mmParPx} />
          </g>
        </svg>
      </div>
      {etat.outil === 'mur' && etat.trace ? (
        <SaisieLongueur trace={etat.trace} curseur={curseur?.point ?? null} dispatch={dispatch} />
      ) : null}
    </div>
  );
}
