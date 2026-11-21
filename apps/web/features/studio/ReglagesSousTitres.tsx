'use client';

import {
  ecrireSousTitres,
  lignesFrise,
  modifierLigneSousTitres,
  sousTitresDeLaVoix,
  tempsMontage,
  type Frise,
  type MotTranscrit,
} from '@ph/core/studio';
import { useState } from 'react';
import { Interrupteur } from './Curseur';

const CHAMP =
  'min-h-10 w-full rounded-[8px] border border-montage-trait bg-montage-surface px-2 text-base text-montage-texte';
const BOUTON =
  'min-h-10 rounded-[8px] bg-montage-surface px-3 text-sm font-semibold hover:bg-montage-survol';

/**
 * Sous-titres : les afficher, corriger le texte de chaque ligne (gardé sur le même temps),
 * écrire un texte d'un bloc s'il n'y a pas de voix, revenir à la voix, recentrer.
 * On les déplace aussi en les glissant sur l'aperçu.
 */
export function ReglagesSousTitres({
  frise: f,
  mots,
  changer,
}: {
  frise: Frise;
  mots: readonly MotTranscrit[];
  changer: (f: Frise) => void;
}) {
  const lignes = lignesFrise(f, mots);
  const [bloc, setBloc] = useState('');
  return (
    <div className="grid gap-3">
      <h3 className="m-0 text-sm font-semibold">Sous-titres</h3>
      <Interrupteur
        libelle="Afficher les sous-titres"
        coche={f.sousTitres}
        onChange={(v) => changer({ ...f, sousTitres: v })}
      />
      <p className="m-0 text-xs text-montage-texte-doux">
        Glissez-les sur l’aperçu pour les déplacer.
      </p>
      {lignes.length ? (
        <ol className="m-0 grid list-none gap-2 p-0">
          {lignes.map((l, i) => (
            <li key={`${l.debut}-${i}`} className="grid gap-1">
              <span className="text-[11px] text-montage-texte-doux tabular-nums">
                {tempsMontage(l.debut)}
              </span>
              <input
                aria-label={`Ligne ${i + 1} des sous-titres`}
                defaultValue={l.mots.map((m) => m.texte).join(' ')}
                maxLength={120}
                onBlur={(e) => {
                  const avant = l.mots.map((m) => m.texte).join(' ');
                  if (e.target.value.trim() !== avant)
                    changer(modifierLigneSousTitres(f, mots, i, e.target.value));
                }}
                onKeyDown={(e) => (e.key === 'Enter' ? e.currentTarget.blur() : undefined)}
                className={CHAMP}
              />
            </li>
          ))}
        </ol>
      ) : null}
      <label className="grid gap-1 text-xs">
        <span className="text-montage-texte-doux">
          {lignes.length ? 'Tout réécrire (réparti sur la vidéo)' : 'Écrire les sous-titres'}
        </span>
        <textarea
          value={bloc}
          rows={3}
          maxLength={4_000}
          onChange={(e) => setBloc(e.target.value)}
          className="rounded-[8px] border border-montage-trait bg-montage-surface p-2 text-base text-montage-texte"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={BOUTON}
          disabled={!bloc.trim()}
          onClick={() => changer(ecrireSousTitres(f, bloc))}
        >
          Placer ce texte
        </button>
        {f.motsEdites && mots.length ? (
          <button type="button" className={BOUTON} onClick={() => changer(sousTitresDeLaVoix(f))}>
            Revenir à la voix
          </button>
        ) : null}
        {f.decalageSousTitres ? (
          <button
            type="button"
            className={BOUTON}
            onClick={() => {
              const { decalageSousTitres: _d, ...reste } = f;
              changer(reste);
            }}
          >
            Remettre en place
          </button>
        ) : null}
      </div>
    </div>
  );
}
