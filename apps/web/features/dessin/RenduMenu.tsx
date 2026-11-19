'use client';

import { LIBELLES_CALQUE, type CalqueScene } from '@ph/core/dessin';
import { Button } from '@ph/ui';
import type { Dispatch } from 'react';
import type { EspaceDessin } from './api';
import { sceneDe, type Action, type EtatEditeur, type Vue } from './etat';
import { CompteRequis, useEssai } from './essai';
import { GaleriePhotos } from './GaleriePhotos';
import { PartageMenu } from './PartageMenu';

const VUES: { vue: Vue; libelle: string }[] = [
  { vue: 'plan', libelle: 'Plan 2D' },
  { vue: '3d', libelle: 'Vue 3D' },
  { vue: 'visite', libelle: 'Visite' },
  { vue: 'photo', libelle: 'Photo' },
  { vue: 'facades', libelle: 'Façades et coupes' },
];

const interrupteur = 'flex min-h-11 cursor-pointer items-center justify-between gap-3 px-1 text-sm';

/** Menu Rendu (DES-33) : vue, heure du soleil, maison de poupée, niveau isolé. */
export function RenduMenu({
  etat,
  dispatch,
  espace,
  planId,
}: {
  etat: EtatEditeur;
  dispatch: Dispatch<Action>;
  espace: EspaceDessin;
  planId: string;
}) {
  const r = etat.rendu;
  const essai = useEssai();
  const regler = (reglages: Partial<EtatEditeur['rendu']>) => dispatch({ type: 'rendu', reglages });
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-2">
        {VUES.map((v) => (
          <Button
            key={v.vue}
            variant={etat.vue === v.vue ? 'primaire' : 'secondaire'}
            aria-pressed={etat.vue === v.vue}
            onClick={() => dispatch({ type: 'vue', vue: v.vue })}
          >
            {v.libelle}
          </Button>
        ))}
      </div>
      <label className="grid gap-1 px-1 text-[13px] font-semibold">
        Soleil · {r.heure} h
        <input
          type="range"
          min={6}
          max={20}
          step={1}
          value={r.heure}
          onChange={(ev) => regler({ heure: Number(ev.target.value) })}
          className="h-11 cursor-pointer accent-accent"
        />
      </label>
      <label className={interrupteur}>
        Maison de poupée (murs avant abaissés)
        <input
          type="checkbox"
          className="size-5 accent-accent"
          checked={r.poupee}
          onChange={(ev) => regler({ poupee: ev.target.checked })}
        />
      </label>
      <label className={interrupteur}>
        Murs transparents (voir au travers)
        <input
          type="checkbox"
          className="size-5 accent-accent"
          checked={r.mursTransparents}
          onChange={(ev) => regler({ mursTransparents: ev.target.checked })}
        />
      </label>
      <label className={interrupteur}>
        Afficher le toit (hors maison de poupée)
        <input
          type="checkbox"
          className="size-5 accent-accent"
          checked={r.toit}
          onChange={(ev) => regler({ toit: ev.target.checked })}
        />
      </label>
      <label className={interrupteur}>
        Afficher seulement ce niveau
        <input
          type="checkbox"
          className="size-5 accent-accent"
          checked={r.niveauSeul}
          onChange={(ev) => regler({ niveauSeul: ev.target.checked })}
        />
      </label>
      <label className={interrupteur}>
        Plan en noir et blanc (pour l’imprimer)
        <input
          type="checkbox"
          className="size-5 accent-accent"
          checked={etat.calques.noirEtBlanc}
          onChange={() => dispatch({ type: 'calque', cle: 'noirEtBlanc' })}
        />
      </label>
      <fieldset className="m-0 grid gap-0 border-0 p-0">
        <legend className="mb-1 px-1 text-[13px] font-bold">Calques du plan</legend>
        {(Object.keys(LIBELLES_CALQUE) as CalqueScene[]).map((cle) => (
          <label key={cle} className={interrupteur}>
            {LIBELLES_CALQUE[cle]}
            <input
              type="checkbox"
              className="size-5 accent-accent"
              checked={sceneDe(etat).calques[cle]}
              onChange={() => dispatch({ type: 'calqueScene', cle })}
            />
          </label>
        ))}
      </fieldset>
      <p className="m-0 px-1 text-[13px] leading-5 text-neutre-800">
        En 3D : faites tourner la vue en glissant, zoomez avec la molette ou deux doigts. Cliquez
        sur un meuble pour le déplacer ou le faire pivoter avec ses anneaux (Maj : sans crans). En
        visite : ZQSD ou flèches pour marcher, glisser pour regarder, joystick sur mobile.
      </p>
      {essai ? (
        <CompteRequis pour="garder vos photos et partager votre plan" />
      ) : (
        <>
          <GaleriePhotos espace={espace} planId={planId} revision={etat.revisionPhotos} />
          <PartageMenu espace={espace} planId={planId} />
        </>
      )}
    </div>
  );
}
