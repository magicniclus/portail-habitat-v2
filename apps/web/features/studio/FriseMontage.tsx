'use client';

import {
  aimanter,
  debutsPlans,
  deplacerPlan,
  dureePlan,
  rognerPlan,
  SCENES_CAPTURE,
  tempsMontage,
  type MotTranscrit,
  type PlanMontage,
  type PlanVideo,
} from '@ph/core/studio';
import { FilmStripIcon, SparkleIcon } from '@phosphor-icons/react';
import type { PointerEvent as EvtPointeur } from 'react';
import { useGlisser } from './glisserFrise';
import { LARGEUR_ETIQUETTE, LigneFrise } from './LigneFrise';
import { PisteAnimations } from './PisteAnimations';
import { PistesSon } from './PistesSon';
import type { Lecture } from './useLectureMontage';

export type Selection =
  { type: 'plan'; i: number } | { type: 'calque'; i: number; k: number } | null;

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
  ecran: 'bg-montage-piste-ecran',
  camera: 'bg-montage-piste-camera',
  capture: 'bg-montage-piste-capture',
  carton: 'bg-montage-piste-carton',
};
const POIGNEE =
  'absolute inset-y-0 z-10 w-2.5 cursor-ew-resize bg-montage-tete/0 group-hover:bg-montage-tete/70 group-aria-pressed:bg-montage-tete';

/**
 * Pistes de la frise (vidéo finale, de gauche à droite) : règle et tête de lecture, plans
 * (glisser pour déplacer, bords pour couper), effets, sous-titres, voix et musique.
 */
export function FriseMontage(p: {
  plan: PlanMontage;
  dureePriseMs: number;
  lecture: Lecture;
  /** Pixels par milliseconde (zoom). */
  px: number;
  aimant: boolean;
  /** Largeur visible : la frise remplit au moins l'écran. */
  largeurVisible: number;
  mots: MotTranscrit[];
  voix: boolean;
  selection: Selection;
  onSelection: (s: Selection) => void;
  onDebut: () => void;
  onChange: (p: PlanMontage) => void;
}) {
  const { plan, px, lecture } = p;
  const duree = dureePlan(plan);
  const debuts = debutsPlans(plan);
  const largeur = Math.max(p.largeurVisible - LARGEUR_ETIQUETTE, duree * px + 80);
  const glisser = useGlisser(px, plan, p.onDebut, p.onChange);
  const seuil = p.aimant ? 8 / px : 0;

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
    lecture.aller(aimanter((e.clientX - r.left) / px, debuts, seuil));
  };
  // Une graduation lisible : au moins ~40 px entre deux repères.
  const pas = px * 1000 >= 40 ? 1 : px * 1000 >= 10 ? 5 : 10;
  const graduations = Array.from({ length: Math.floor(duree / 1000 / pas) + 2 }, (_, n) => n * pas);

  return (
    <div className="relative min-w-max select-none">
      <LigneFrise libelle={tempsMontage(lecture.affiche)} hauteur={28} largeur={largeur}>
        <div
          className="absolute inset-0 cursor-pointer"
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
          aria-valuetext={tempsMontage(lecture.affiche)}
        >
          {graduations.map((s) => (
            <span
              key={s}
              className="absolute bottom-0 h-2.5 border-l border-montage-texte-doux/60 pl-1 text-[10px] leading-none text-montage-texte-doux"
              style={{ left: s * 1000 * px }}
            >
              <span className="absolute -top-3.5 left-1">{s}s</span>
            </span>
          ))}
        </div>
      </LigneFrise>

      <LigneFrise
        libelle="Vidéo"
        icone={<FilmStripIcon size={16} aria-hidden="true" />}
        hauteur={64}
        largeur={largeur}
      >
        {plan.plans.map((x, i) => {
          const d = x.source.fin - x.source.debut;
          const choisi = p.selection?.type === 'plan' && p.selection.i === i;
          return (
            <div
              key={x.id}
              role="button"
              tabIndex={0}
              aria-pressed={choisi}
              aria-label={`Plan ${i + 1} : ${nomPlan(x, plan)}, ${sec(d)}`}
              onClick={() => p.onSelection({ type: 'plan', i })}
              onKeyDown={(e) =>
                e.key === 'Enter' ? p.onSelection({ type: 'plan', i }) : undefined
              }
              onPointerDown={glisser(reordonner(i), () => p.onSelection({ type: 'plan', i }))}
              className={`group absolute top-1.5 bottom-1.5 cursor-grab overflow-hidden rounded-[6px] border-2 px-3 py-1 text-xs text-montage-texte active:cursor-grabbing ${TEINTE[x.visuel]} ${choisi ? 'border-montage-selection' : 'border-transparent'}`}
              style={{ left: debuts[i]! * px + 1, width: Math.max(8, d * px - 2) }}
            >
              <span className="block truncate font-semibold">{nomPlan(x, plan)}</span>
              <span className="block text-montage-texte-doux">{sec(d)}</span>
              <span
                aria-hidden="true"
                className={`${POIGNEE} left-0`}
                onPointerDown={glisser((dx, depart) =>
                  rognerPlan(
                    depart,
                    i,
                    { debut: depart.plans[i]!.source.debut + dx },
                    p.dureePriseMs,
                  ),
                )}
              />
              <span
                aria-hidden="true"
                className={`${POIGNEE} right-0`}
                onPointerDown={glisser((dx, depart) =>
                  rognerPlan(depart, i, { fin: depart.plans[i]!.source.fin + dx }, p.dureePriseMs),
                )}
              />
            </div>
          );
        })}
      </LigneFrise>

      <LigneFrise
        libelle="Effets"
        icone={<SparkleIcon size={16} aria-hidden="true" />}
        largeur={largeur}
      >
        <PisteAnimations
          plan={plan}
          px={px}
          tete={lecture.affiche}
          aimant={p.aimant}
          selection={p.selection}
          onSelection={p.onSelection}
          glisser={glisser}
        />
      </LigneFrise>
      <PistesSon plan={plan} mots={p.mots} voix={p.voix} px={px} largeur={largeur} />

      {/* Tête de lecture : poignée dans la règle, trait sur toutes les pistes. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 bottom-0 z-30 w-0.5 bg-montage-tete"
        style={{ left: LARGEUR_ETIQUETTE + lecture.affiche * px - 1 }}
      >
        <span className="absolute -top-0 left-1/2 h-3.5 w-3 -translate-x-1/2 rounded-b-[3px] bg-montage-tete" />
      </div>
    </div>
  );
}
