'use client';

import {
  aimanter,
  arrondir,
  niveauInferieur,
  niveauSuperieur,
  toleranceEnMm,
  tremies,
  type Point,
} from '@ph/core/dessin';
import { COULEURS_PLAN } from '@ph/ui/tokens';
import { useEffect, useMemo, useRef, useState, type Dispatch, type PointerEvent } from 'react';
import { EtiquettesPieces, MursSvg, PiecesSvg } from './CalquesPlan';
import { Cotes, TraceEnCours } from './Mesures';
import { niveauDe, sceneDe, type Action, type EtatEditeur } from './etat';
import { ObjetsSvg, ZonesSvg } from './AmenagementSvg';
import { cadreDe } from './cadre';
import { ExterieurSvg } from './ExterieurSvg';
import { FondSvg } from './FondSvg';
import { LimitesSvg, OrthophotoSvg } from './ImplantationSvg';
import type { FondCharge } from './useFond';
import { GuidesSvg } from './GuidesSvg';
import { ToitSvg } from './ToitSvg';
import { DefsMotifs } from './Motifs';
import { useGlisser } from './useGlisser';
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
  const fondVisible = scene.fondImage?.niveauId === n.id ? scene.fondImage : null;
  const svg = useRef<SVGSVGElement>(null);
  const [curseur, setCurseur] = useState<Point | null>(null);
  const parcelle = scene.terrain?.parcelle;
  const cadre = useMemo(() => cadreDe(n, parcelle), [n, parcelle]);
  const conteneur = useRef<HTMLDivElement>(null);
  const cadreCourant = useRef(cadre);
  useEffect(() => {
    cadreCourant.current = cadre;
  }, [cadre]);

  // Ajuster à l'écran : à l'ouverture et à la demande (bouton du zoom).
  useEffect(() => {
    const el = conteneur.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const c = cadreCourant.current;
    if (width > 0 && height > 0)
      dispatch({ type: 'zoom', zoom: Math.min((width / c.l) * 1000, (height / c.h) * 1000) });
  }, [etat.ajustement, dispatch]);
  const mmParPx = 1000 / etat.zoom;

  const cibles = useMemo(
    () => ({
      points: n.murs.flatMap((m) => [m.a, m.b]),
      segments: n.murs.map((m) => [m.a, m.b] as const),
    }),
    [n.murs],
  );

  const versMm = (ev: PointerEvent): Point | null => {
    const el = svg.current;
    const matrice = el?.getScreenCTM();
    if (!el || !matrice) return null;
    const p = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(matrice.inverse());
    return { x: p.x, y: p.y };
  };
  const aimante = (p: Point): Point =>
    etat.aimant
      ? aimanter(p, cibles, {
          tolerance: toleranceEnMm(12, etat.zoom),
          grille: 50,
          ...(etat.trace ? { origine: etat.trace } : {}),
        }).point
      : arrondir(p);

  const trace = etat.outil !== 'selection';
  const glisser = useGlisser(n, dispatch, versMm, trace);

  return (
    <div
      ref={conteneur}
      className="h-full w-full overflow-auto"
      // Papier pointillé du plan (maquette) : un point tous les 24 px.
      style={{
        backgroundColor: COULEURS_PLAN.fond,
        backgroundImage: `radial-gradient(${COULEURS_PLAN.grille} 1px, transparent 1.2px)`,
        backgroundSize: '24px 24px',
      }}
      data-testid="plan-2d"
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
          onPointerMove={(ev) => {
            const p = versMm(ev);
            if (!p) return;
            if (glisser.bouger(p, ev.altKey)) return;
            if (trace) setCurseur(aimante(p));
          }}
          onPointerDown={(ev) => {
            if (ev.target !== ev.currentTarget && !trace) return;
            const p = versMm(ev);
            if (!p) return;
            if (trace) dispatch({ type: 'poserPoint', point: aimante(p) });
            else dispatch({ type: 'selectionner', selection: null });
          }}
          onPointerUp={glisser.finir}
          onDoubleClick={() => dispatch({ type: 'terminerTrace' })}
        >
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
            dispatch={dispatch}
          />
          <PiecesSvg niveau={n} etat={etat} dispatch={dispatch} />
          <ZonesSvg niveau={n} etat={etat} dispatch={dispatch} />
          <ReperesNiveauSvg dessous={niveauInferieur(scene, n.id)} tremies={tremies(scene, n.id)} />
          <EscaliersSvg niveau={n} etat={etat} dispatch={dispatch} />
          <ObjetsSvg
            niveau={n}
            etat={etat}
            dispatch={dispatch}
            demarrerGlisser={(id, ev) => glisser.demarrer('objet', id, ev)}
          />
          <MursSvg
            niveau={n}
            etat={etat}
            dispatch={dispatch}
            demarrerGlisser={(id, ev) => glisser.demarrer('mur', id, ev)}
          />
          <OuverturesSvg niveau={n} etat={etat} dispatch={dispatch} />
          <ToitSvg niveau={n} dessus={niveauSuperieur(scene, n.id)} />
          <GuidesSvg guides={etat.guides} />
          {etat.calques.cotes ? (
            <Cotes niveau={n} mmParPx={mmParPx} dispatch={dispatch} cliquables={!trace} />
          ) : null}
          <EtiquettesPieces niveau={n} etat={etat} mmParPx={mmParPx} />
          {scene.terrain || scene.orientationNord ? (
            <LimitesSvg
              scene={scene}
              mmParPx={mmParPx}
              coin={{ x: cadre.x + cadre.l, y: cadre.y }}
            />
          ) : null}
          {trace ? <TraceEnCours etat={etat} curseur={curseur} mmParPx={mmParPx} /> : null}
          {etat.echelle ? (
            <TraceEnCours
              etat={{ ...etat, outil: 'echelle', trace: etat.echelle.a }}
              curseur={etat.echelle.b}
              mmParPx={mmParPx}
            />
          ) : null}
        </svg>
      </div>
    </div>
  );
}
