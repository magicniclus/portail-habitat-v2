'use client';

import {
  aimanter,
  debutsPlans,
  deplacerCalque,
  LIBELLES_CALQUE,
  modifierCalque,
  type PlanMontage,
} from '@ph/core/studio';
import type { useGlisser } from './glisserFrise';
import type { Selection } from './FriseMontage';

const HAUTEUR_VOIE = 28;

/** Animations rangées en voies sans chevauchement (temps de la vidéo finale). */
function voiesAnimations(plan: PlanMontage) {
  const debuts = debutsPlans(plan);
  const voies: { i: number; k: number; debut: number; fin: number }[][] = [];
  plan.plans.forEach((x, i) =>
    x.calques.forEach((c, k) => {
      const debut = debuts[i]! + c.debut;
      const fin = debuts[i]! + c.fin;
      const v = voies.find((li) => li.every((b) => b.fin <= debut || b.debut >= fin));
      if (v) v.push({ i, k, debut, fin });
      else voies.push([{ i, k, debut, fin }]);
    }),
  );
  return voies;
}

/**
 * Piste des effets : glisser pour décaler, bord droit pour la durée. Avec l'aimant, les bords se
 * calent sur le début et la fin du plan, la tête de lecture et les autres effets du plan.
 */
export function PisteAnimations({
  plan,
  px,
  tete,
  aimant,
  selection,
  onSelection,
  glisser,
}: {
  plan: PlanMontage;
  px: number;
  /** Tête de lecture (ms, vidéo finale). */
  tete: number;
  aimant: boolean;
  selection: Selection;
  onSelection: (s: Selection) => void;
  glisser: ReturnType<typeof useGlisser<PlanMontage>>;
}) {
  const debuts = debutsPlans(plan);
  const voies = voiesAnimations(plan);
  const seuil = aimant ? 8 / px : 0;
  /** Repères du plan `i` (temps dans le plan), sans l'effet `k` lui-même. */
  const reperes = (p: PlanMontage, i: number, k: number) => {
    const x = p.plans[i]!;
    const d = x.source.fin - x.source.debut;
    const t = tete - debutsPlans(p)[i]!;
    return [
      0,
      d,
      ...(t > 0 && t < d ? [t] : []),
      ...x.calques.flatMap((c, j) => (j === k ? [] : [c.debut, c.fin])),
    ];
  };
  return (
    <div className="relative" style={{ height: Math.max(1, voies.length) * HAUTEUR_VOIE + 6 }}>
      {voies.map((voie, n) =>
        voie.map(({ i, k, debut, fin }) => {
          const c = plan.plans[i]!.calques[k]!;
          const choisi = selection?.type === 'calque' && selection.i === i && selection.k === k;
          const libelle =
            'texte' in c ? c.texte : 'libelle' in c ? c.libelle : LIBELLES_CALQUE[c.type];
          return (
            <div
              key={`${i}-${k}`}
              role="button"
              tabIndex={0}
              aria-pressed={choisi}
              aria-label={`${LIBELLES_CALQUE[c.type]} : ${libelle}`}
              onClick={() => onSelection({ type: 'calque', i, k })}
              onKeyDown={(e) =>
                e.key === 'Enter' ? onSelection({ type: 'calque', i, k }) : undefined
              }
              onPointerDown={glisser(
                (dx, depart) => {
                  const a = depart.plans[i]!.calques[k]!;
                  const duree = a.fin - a.debut;
                  const r = reperes(depart, i, k);
                  const voulu = a.debut + dx;
                  const cale = aimanter(voulu, [...r, ...r.map((v) => v - duree)], seuil);
                  return deplacerCalque(depart, i, k, cale);
                },
                () => onSelection({ type: 'calque', i, k }),
              )}
              className={`group absolute h-[22px] cursor-grab truncate rounded-[4px] border bg-montage-piste-animation px-2 text-[11px] leading-5 text-montage-texte active:cursor-grabbing ${choisi ? 'border-montage-selection ring-1 ring-montage-selection' : 'border-transparent'}`}
              style={{
                top: 3 + n * HAUTEUR_VOIE,
                left: debut * px,
                width: Math.max(10, (fin - debut) * px),
              }}
            >
              {libelle}
              <span
                aria-hidden="true"
                className="absolute inset-y-0 right-0 w-2 cursor-ew-resize rounded-r-[4px] bg-montage-tete/0 group-hover:bg-montage-tete/60"
                onPointerDown={glisser((dx, depart) => {
                  const x = depart.plans[i]!;
                  const a = x.calques[k]!;
                  const max = x.source.fin - x.source.debut;
                  const fin = aimanter(a.fin + dx, reperes(depart, i, k), seuil);
                  return modifierCalque(depart, i, k, {
                    fin: Math.round(Math.min(max, Math.max(a.debut + 200, fin))),
                  });
                })}
              />
            </div>
          );
        }),
      )}
      {debuts.length && !voies.length ? (
        <p className="m-0 px-3 py-1.5 text-xs text-montage-texte-doux">
          Aucun effet : ajoutez un texte ou un effet depuis la bibliothèque.
        </p>
      ) : null}
    </div>
  );
}
