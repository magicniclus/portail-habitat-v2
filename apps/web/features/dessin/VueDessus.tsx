'use client';

import {
  contoursRaccordes,
  niveauSuperieur,
  niveauxTries,
  toit3D,
  type Point3,
} from '@ph/core/dessin';
import { Button } from '@ph/ui';
import { COULEURS_COUVERTURE, COULEURS_PLAN } from '@ph/ui/tokens';
import { useMemo, useRef, type Dispatch } from 'react';
import { cadreDe } from './cadre';
import { sceneDe, type Action, type EtatEditeur } from './etat';
import { points } from './svg';
import { papier } from './papier';
import { useCamera } from './useCamera';
import { usePanoramique } from './usePanoramique';

/** Ombrage d'un pan selon son orientation : lumière venant du haut à gauche. */
function ombre(pan: readonly Point3[]): number {
  const [a, b, c] = pan as [Point3, Point3, Point3];
  const u = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
  const v = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z };
  let n = { x: u.y * v.z - u.z * v.y, y: u.z * v.x - u.x * v.z, z: u.x * v.y - u.y * v.x };
  if (n.z < 0) n = { x: -n.x, y: -n.y, z: -n.z };
  const l = Math.hypot(n.x, n.y, n.z) || 1;
  const lumiere = (-n.x - n.y + 2 * n.z) / (l * Math.sqrt(6));
  return Math.max(0, Math.min(0.45, (1 - lumiere) * 0.6));
}

const auSol = (pan: readonly Point3[]) => points(pan.map((p) => ({ x: p.x, y: p.y })));

/**
 * Vue extérieure en 2D : la maison fermée vue de dessus, tous niveaux, toits à la couleur de
 * leur couverture et ombrés selon leur pente. Lecture seule : on choisit un niveau pour éditer.
 */
export function VueDessus({ etat, dispatch }: { etat: EtatEditeur; dispatch: Dispatch<Action> }) {
  const scene = sceneDe(etat);
  const niveaux = useMemo(() => niveauxTries(scene), [scene]);
  const cadre = useMemo(() => {
    const cs = niveaux.map((n) => cadreDe(n, scene.terrain?.parcelle));
    const x = Math.min(...cs.map((c) => c.x));
    const y = Math.min(...cs.map((c) => c.y));
    const l = Math.max(...cs.map((c) => c.x + c.l)) - x;
    const h = Math.max(...cs.map((c) => c.y + c.h)) - y;
    return { x, y, l, h };
  }, [niveaux, scene.terrain?.parcelle]);
  const conteneur = useRef<HTMLDivElement>(null);
  // Même navigation que le plan : molette, bouton du milieu ou espace, doigt sur le fond.
  const { vue, taille, mmParPx, moteur } = useCamera(conteneur, etat, dispatch, () => cadre, 0);
  const pan = usePanoramique(conteneur, moteur);
  const dessin = useMemo(
    () =>
      niveaux.map((n) => ({
        n,
        murs: [...contoursRaccordes(n.murs).values()],
        toit: toit3D(n, niveauSuperieur(scene, n.id)),
      })),
    [niveaux, scene],
  );
  const aucunToit = dessin.every((d) => !d.toit);
  return (
    <div className="relative h-full w-full">
      <div
        ref={conteneur}
        className={`relative h-full w-full touch-none overflow-hidden ${pan.curseur ?? ''}`}
        style={papier(vue, mmParPx)}
        data-testid="vue-dessus"
        onPointerDown={(ev) => ev.pointerType === 'touch' && pan.demarrer(ev)}
      >
        <svg
          role="img"
          aria-label="Maison fermée vue de dessus"
          className="absolute inset-0"
          width={taille.w}
          height={taille.h}
          viewBox={`${vue.x} ${vue.y} ${vue.l} ${vue.h}`}
        >
          {dessin.map(({ n, murs, toit }) => (
            <g key={n.id}>
              {n.pieces.map((p) => (
                <polygon key={p.id} points={points(p.contour)} fill={COULEURS_PLAN.coteTrait} />
              ))}
              {murs.map((c, i) => (
                <polygon key={i} points={points(c)} fill={COULEURS_PLAN.mur} />
              ))}
              {toit?.pans.map((pan, i) => (
                <g key={i}>
                  <polygon
                    points={auSol(pan)}
                    fill={
                      COULEURS_COUVERTURE[
                        (n.toiture?.couverture.famille ??
                          'tuile') as keyof typeof COULEURS_COUVERTURE
                      ] ?? COULEURS_COUVERTURE.tuile
                    }
                  />
                  <polygon
                    points={auSol(pan)}
                    fill={COULEURS_PLAN.mur}
                    fillOpacity={ombre(pan)}
                    stroke={COULEURS_PLAN.mur}
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              ))}
            </g>
          ))}
        </svg>
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center px-4">
        <p className="pointer-events-auto m-0 flex items-center gap-3 rounded-xl bg-blanc px-4 py-2 text-sm shadow-md ring-1 ring-neutre-200">
          {aucunToit
            ? 'Aucun toit pour l’instant : Structure › Toiture & combles.'
            : 'Vue extérieure, lecture seule.'}
          <Button
            variant="secondaire"
            onClick={() => dispatch({ type: 'changerNiveau', niveauId: etat.niveauId })}
          >
            Modifier le plan
          </Button>
        </p>
      </div>
    </div>
  );
}
