'use client';

import {
  debutsPlans,
  deplacerPlan,
  dureePlan,
  rognerPlan,
  SCENES_CAPTURE,
  type PlanMontage,
  type PlanVideo,
} from '@ph/core/studio';
import type { PointerEvent as EvtPointeur } from 'react';
import { useGlisser } from './glisserFrise';
import { PisteAnimations } from './PisteAnimations';
import type { Lecture } from './useLectureMontage';

export type Selection =
  { type: 'plan'; i: number } | { type: 'calque'; i: number; k: number } | null;

const LARGEUR_MS = 0.06; // px par ms au zoom 1 (60 px par seconde)
const sec = (ms: number) => `${Math.round(ms / 100) / 10} s`;

function nomPlan(x: PlanVideo, p: PlanMontage): string {
  if (x.visuel === 'carton') return x.carton ?? 'Carton';
  if (x.visuel === 'capture') {
    const c = p.captures.find((y) => y.id === x.captureId);
    return c ? SCENES_CAPTURE[c.scene].libelle : 'Capture';
  }
  return x.visuel === 'ecran' ? 'Mon écran' : 'Face caméra';
}

const TEINTE: Record<PlanVideo['visuel'], string> = {
  ecran: 'bg-info-fond',
  camera: 'bg-succes-fond',
  capture: 'bg-accent-100',
  carton: 'bg-neutre-200',
};

/**
 * Frise façon logiciel de montage : règle et tête de lecture, piste des plans (glisser pour
 * déplacer, bords pour raccourcir), piste des animations (glisser pour décaler, bords pour la
 * durée). Chaque geste part d'une copie du plan (`onDebut`), puis met à jour le brouillon.
 */
export function FriseMontage({
  plan,
  dureePriseMs,
  lecture,
  zoom,
  selection,
  onSelection,
  onDebut,
  onChange,
}: {
  plan: PlanMontage;
  dureePriseMs: number;
  lecture: Lecture;
  zoom: number;
  selection: Selection;
  onSelection: (s: Selection) => void;
  /** Début d'un geste : l'éditeur garde l'état d'avant pour « Annuler ». */
  onDebut: () => void;
  onChange: (p: PlanMontage) => void;
}) {
  const px = LARGEUR_MS * zoom;
  const duree = dureePlan(plan);
  const debuts = debutsPlans(plan);
  const largeur = Math.max(320, duree * px + 24);

  /** Glisser : `appliquer(dxMs, départ)` rend le plan modifié. */
  const glisser = useGlisser(px, plan, onDebut, onChange);

  /** Déplacer un plan : il passe devant le premier plan dont le milieu est dépassé. */
  const reordonner = (i: number) => (dx: number, depart: PlanMontage) => {
    const d0 = debutsPlans(depart);
    const x = depart.plans[i]!;
    const centre = d0[i]! + (x.source.fin - x.source.debut) / 2 + dx;
    let cible = depart.plans.findIndex(
      (y, j) => j !== i && centre < d0[j]! + (y.source.fin - y.source.debut) / 2,
    );
    if (cible === -1) cible = depart.plans.length - 1;
    else if (cible > i) cible -= 1;
    return deplacerPlan(depart, i, cible);
  };

  const allerA = (e: EvtPointeur<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    lecture.aller((e.clientX - r.left) / px);
  };
  const graduations = Array.from({ length: Math.floor(duree / 1000) + 1 }, (_, s) => s);

  return (
    <div className="overflow-x-auto rounded-card border border-trait bg-neutre-100">
      <div className="relative select-none" style={{ width: largeur }}>
        {/* Règle : cliquer ou glisser déplace la tête de lecture. */}
        <div
          className="relative h-7 cursor-pointer border-b border-trait bg-blanc"
          onPointerDown={(e) => {
            allerA(e);
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => (e.buttons ? allerA(e) : undefined)}
          role="slider"
          tabIndex={0}
          aria-label="Position dans la vidéo"
          aria-valuemin={0}
          aria-valuemax={Math.round(duree / 1000)}
          aria-valuenow={Math.round(lecture.affiche / 1000)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') lecture.aller(lecture.affiche + 500);
            if (e.key === 'ArrowLeft') lecture.aller(lecture.affiche - 500);
          }}
        >
          {graduations.map((s) => (
            <span
              key={s}
              className="absolute bottom-0 border-l border-neutre-400 pl-0.5 text-[10px] text-neutre-700"
              style={{ left: s * 1000 * px, height: s % 5 === 0 ? 14 : 6 }}
            >
              {s % 5 === 0 && zoom >= 0.75 ? `${s}s` : s % 5 === 0 ? s : ''}
            </span>
          ))}
        </div>

        {/* Piste des plans. */}
        <div className="relative h-16 border-b border-trait">
          {plan.plans.map((x, i) => {
            const d = x.source.fin - x.source.debut;
            const choisi = selection?.type === 'plan' && selection.i === i;
            const bord = 'absolute inset-y-0 w-2.5 cursor-ew-resize bg-texte/25 hover:bg-texte/50';
            return (
              <div
                key={x.id}
                role="button"
                tabIndex={0}
                aria-pressed={choisi}
                aria-label={`Plan ${i + 1} : ${nomPlan(x, plan)}, ${sec(d)}`}
                onClick={() => onSelection({ type: 'plan', i })}
                onKeyDown={(e) =>
                  e.key === 'Enter' ? onSelection({ type: 'plan', i }) : undefined
                }
                onPointerDown={glisser(reordonner(i), () => onSelection({ type: 'plan', i }))}
                className={`absolute top-1.5 bottom-1.5 cursor-grab overflow-hidden rounded-[6px] border px-3 py-1 text-xs ${TEINTE[x.visuel]} ${choisi ? 'border-accent ring-2 ring-accent' : 'border-trait'}`}
                style={{ left: debuts[i]! * px + 1, width: Math.max(8, d * px - 2) }}
              >
                <span className="block truncate font-semibold">{nomPlan(x, plan)}</span>
                <span className="block text-neutre-700">{sec(d)}</span>
                <span
                  aria-hidden="true"
                  className={`${bord} left-0`}
                  onPointerDown={glisser((dx, depart) =>
                    rognerPlan(
                      depart,
                      i,
                      { debut: depart.plans[i]!.source.debut + dx },
                      dureePriseMs,
                    ),
                  )}
                />
                <span
                  aria-hidden="true"
                  className={`${bord} right-0`}
                  onPointerDown={glisser((dx, depart) =>
                    rognerPlan(depart, i, { fin: depart.plans[i]!.source.fin + dx }, dureePriseMs),
                  )}
                />
              </div>
            );
          })}
        </div>

        <PisteAnimations
          plan={plan}
          px={px}
          selection={selection}
          onSelection={onSelection}
          glisser={glisser}
        />

        {/* Tête de lecture. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-danger"
          style={{ left: lecture.affiche * px }}
        />
      </div>
    </div>
  );
}
