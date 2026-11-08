'use client';

import {
  EFFETS_VIDEO,
  LIBELLES_EFFET_VIDEO,
  LIBELLES_TRANSITION,
  modifierClip,
  modifierPiste,
  TRANSITIONS,
  type Clip,
  type EffetVideo,
  type Frise,
  type Piste,
  type Transition,
} from '@ph/core/studio';
import { Curseur, secondes } from './Curseur';

const CHAMP =
  'min-h-11 w-full rounded-[8px] border border-montage-trait bg-montage-surface px-3 text-base text-montage-texte';
const PUCE =
  'min-h-9 rounded-full border border-montage-trait px-3 text-xs aria-pressed:border-montage-selection aria-pressed:bg-montage-selection aria-pressed:text-montage-fond';

/** Transition d'entrée du clip (depuis la séquence d'avant) et sa durée. */
export function ReglageTransition({
  frise,
  clip: c,
  changer,
}: {
  frise: Frise;
  clip: Clip;
  changer: (f: Frise) => void;
}) {
  const tr = c.transition;
  return (
    <div className="grid gap-2">
      <label className="grid gap-1 text-xs">
        <span className="text-montage-texte-doux">Transition d’entrée</span>
        <select
          value={tr?.type ?? ''}
          onChange={(e) =>
            changer(
              modifierClip(frise, c.id, {
                transition: e.target.value
                  ? { type: e.target.value as Transition, duree: tr?.duree ?? 500 }
                  : undefined,
              }),
            )
          }
          className={CHAMP}
        >
          <option value="">Aucune (coupe franche)</option>
          {TRANSITIONS.map((t) => (
            <option key={t} value={t}>
              {LIBELLES_TRANSITION[t]}
            </option>
          ))}
        </select>
      </label>
      {tr ? (
        <Curseur
          libelle="Durée de la transition"
          valeur={tr.duree}
          min={100}
          max={Math.min(3_000, c.duree)}
          pas={100}
          neutre={500}
          affichage={secondes}
          onChange={(v) => changer(modifierClip(frise, c.id, { transition: { ...tr, duree: v } }))}
        />
      ) : null}
    </div>
  );
}

const basculer = (liste: readonly EffetVideo[] | undefined, e: EffetVideo) => {
  const l = liste ?? [];
  return l.includes(e) ? l.filter((x) => x !== e) : [...l, e].slice(-5);
};

/** Effets vidéo du clip, et ceux de toute sa piste (5 au plus chacun). */
export function EffetsVideo({
  frise,
  piste,
  clip: c,
  changer,
}: {
  frise: Frise;
  piste: Piste;
  clip: Clip;
  changer: (f: Frise) => void;
}) {
  const groupe = (
    titre: string,
    actifs: readonly EffetVideo[] | undefined,
    agir: (e: EffetVideo) => void,
  ) => (
    <fieldset className="grid gap-2 rounded-[8px] border border-montage-trait p-2">
      <legend className="px-1 text-xs font-semibold">{titre}</legend>
      <div className="flex flex-wrap gap-1.5">
        {EFFETS_VIDEO.map((e) => (
          <button
            key={e}
            type="button"
            aria-pressed={Boolean(actifs?.includes(e))}
            onClick={() => agir(e)}
            className={PUCE}
          >
            {LIBELLES_EFFET_VIDEO[e]}
          </button>
        ))}
      </div>
    </fieldset>
  );
  return (
    <div className="grid gap-3">
      {groupe('Effets vidéo du clip', c.effets, (e) =>
        changer(modifierClip(frise, c.id, { effets: basculer(c.effets, e) })),
      )}
      {groupe(`Effets de toute la piste « ${piste.nom} »`, piste.effets, (e) =>
        changer(modifierPiste(frise, piste.id, { effets: basculer(piste.effets, e) })),
      )}
    </div>
  );
}
