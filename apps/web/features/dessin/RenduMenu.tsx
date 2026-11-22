'use client';

import { LIBELLES_CALQUE, type CalqueScene } from '@ph/core/dessin';
import { Button } from '@ph/ui';
import type { Dispatch } from 'react';
import type { EspaceDessin } from './api';
import { sceneDe, type Action, type EtatEditeur, type Vue } from './etat';
import { CompteRequis, useEssai } from './essai';
import { GaleriePhotos } from './GaleriePhotos';
import { PartageMenu } from './PartageMenu';
import { SousSection } from './LigneMenu';

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
  const coche = (libelle: string, oui: boolean, basculer: (v: boolean) => void) => (
    <li key={libelle}>
      <label className={interrupteur}>
        {libelle}
        <input
          type="checkbox"
          className="size-5 accent-accent"
          checked={oui}
          onChange={(ev) => basculer(ev.target.checked)}
        />
      </label>
    </li>
  );
  return (
    <div className="grid gap-1">
      <SousSection titre="Affichage" nombre={VUES.length}>
        <li className="grid grid-cols-2 gap-2 pb-1">
          {VUES.map((v, i) => (
            <Button
              key={v.vue}
              variant={etat.vue === v.vue ? 'primaire' : 'secondaire'}
              aria-pressed={etat.vue === v.vue}
              onClick={() => dispatch({ type: 'vue', vue: v.vue })}
              className={i === VUES.length - 1 ? 'col-span-2' : ''}
            >
              {v.libelle}
            </Button>
          ))}
        </li>
      </SousSection>
      <SousSection titre="3D et visite" nombre={5}>
        <li>
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
        </li>
        {coche('Maison de poupée (murs avant abaissés)', r.poupee, (v) => regler({ poupee: v }))}
        {coche('Murs transparents (voir au travers)', r.mursTransparents, (v) =>
          regler({ mursTransparents: v }),
        )}
        {coche('Afficher seulement ce niveau', r.niveauSeul, (v) => regler({ niveauSeul: v }))}
        <li>
          <p className="m-0 px-1 pt-1 text-[13px] leading-5 text-neutre-700">
            La 3D sert à voir : tout se modifie sur le plan 2D. Glissez pour déplacer la vue, Espace
            + glisser (ou clic droit) pour tourner, molette ou deux doigts pour zoomer. En visite :
            ZQSD ou flèches pour marcher (on traverse les murs), glisser pour regarder, joystick sur
            téléphone.
          </p>
        </li>
      </SousSection>
      <SousSection titre="Plan 2D" nombre={Object.keys(LIBELLES_CALQUE).length + 1}>
        {coche('Plan en noir et blanc (pour l’imprimer)', etat.calques.noirEtBlanc, () =>
          dispatch({ type: 'calque', cle: 'noirEtBlanc' }),
        )}
        {(Object.keys(LIBELLES_CALQUE) as CalqueScene[]).map((cle) =>
          coche(LIBELLES_CALQUE[cle], sceneDe(etat).calques[cle], () =>
            dispatch({ type: 'calqueScene', cle }),
          ),
        )}
      </SousSection>
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
