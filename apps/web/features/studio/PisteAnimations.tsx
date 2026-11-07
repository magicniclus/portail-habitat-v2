'use client';

import {
  debutsPlans,
  deplacerCalque,
  LIBELLES_CALQUE,
  modifierCalque,
  type PlanMontage,
} from '@ph/core/studio';
import type { useGlisser } from './glisserFrise';
import type { Selection } from './FriseMontage';

/** Pistes des animations : rangées en lignes sans chevauchement, glisser pour décaler, bord pour la durée. */
export function PisteAnimations({
  plan,
  px,
  selection,
  onSelection,
  glisser,
}: {
  plan: PlanMontage;
  px: number;
  selection: Selection;
  onSelection: (s: Selection) => void;
  glisser: ReturnType<typeof useGlisser>;
}) {
  const debuts = debutsPlans(plan);
  const lignes: { i: number; k: number; debut: number; fin: number }[][] = [];
  plan.plans.forEach((x, i) =>
    x.calques.forEach((c, k) => {
      const debut = debuts[i]! + c.debut;
      const fin = debuts[i]! + c.fin;
      const l = lignes.find((li) => li.every((b) => b.fin <= debut || b.debut >= fin));
      if (l) l.push({ i, k, debut, fin });
      else lignes.push([{ i, k, debut, fin }]);
    }),
  );
  return (
    <div className="relative" style={{ height: Math.max(1, lignes.length) * 30 + 8 }}>
      {lignes.length === 0 ? (
        <p className="m-0 px-3 py-2 text-xs text-neutre-700">
          Aucune animation : ajoutez-en une avec « + Ajouter ».
        </p>
      ) : null}
      {lignes.map((li, n) =>
        li.map(({ i, k, debut, fin }) => {
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
                (dx, depart) =>
                  deplacerCalque(depart, i, k, depart.plans[i]!.calques[k]!.debut + dx),
                () => onSelection({ type: 'calque', i, k }),
              )}
              className={`absolute h-6 cursor-grab truncate rounded-[5px] bg-accent px-2 text-[11px] leading-6 text-blanc ${choisi ? 'ring-2 ring-texte' : ''}`}
              style={{
                top: 4 + n * 30,
                left: debut * px,
                width: Math.max(10, (fin - debut) * px),
              }}
            >
              {libelle}
              <span
                aria-hidden="true"
                className="absolute inset-y-0 right-0 w-2 cursor-ew-resize bg-texte/30"
                onPointerDown={glisser((dx, depart) => {
                  const x = depart.plans[i]!;
                  const a = x.calques[k]!;
                  const max = x.source.fin - x.source.debut;
                  return modifierCalque(depart, i, k, {
                    fin: Math.round(Math.min(max, Math.max(a.debut + 200, a.fin + dx))),
                  });
                })}
              />
            </div>
          );
        }),
      )}
    </div>
  );
}
