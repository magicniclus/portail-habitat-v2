'use client';

import {
  cleLigneMetre,
  libelleLigneMetre,
  menuiseriesScene,
  metreCsv,
  metreScene,
  quantiteMetre,
} from '@ph/core/dessin';
import { Button } from '@ph/ui';
import { DownloadSimpleIcon } from '@phosphor-icons/react';
import type { Dispatch } from 'react';
import type { EspaceDessin } from './api';
import { sceneDe, type Action, type EtatEditeur } from './etat';
import { ExportPlan } from './ExportPlan';
import { horodatage, telechargerFichier } from './telecharger';

const ligne =
  'flex min-h-11 cursor-pointer items-center gap-2.5 border-t border-trait py-1.5 text-sm';

/**
 * Onglet « Chiffrer » (DES-41, DES-43) : métré de toute la maison, postes à cocher, CSV,
 * PDF à l'échelle et PNG. Les postes décochés sortent des exports.
 */
export function Chiffrage({
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
  const scene = sceneDe(etat);
  const lignes = metreScene(scene);
  const menuiseries = menuiseriesScene(scene);
  const coche = (cle: string) => !etat.metreExclus.includes(cle);
  const basculer = (cle: string) => dispatch({ type: 'basculerPoste', cle });
  const csv = () =>
    telechargerFichier(
      `metre-${horodatage()}.csv`,
      new Blob(
        [
          metreCsv(
            lignes.filter((l) => coche(cleLigneMetre(l))),
            coche('menuiseries') ? menuiseries : [],
          ),
        ],
        { type: 'text/csv;charset=utf-8' },
      ),
    );
  return (
    <div className="grid gap-3.5 px-1">
      <p className="m-0 text-sm leading-5 text-neutre-800">
        Les quantités se calculent depuis votre plan (tous les niveaux) et se mettent à jour à
        chaque modification. Décochez un poste pour le retirer des exports.
      </p>
      {lignes.length === 0 ? (
        <p className="m-0 text-sm text-neutre-800">Dessinez une pièce pour obtenir le métré.</p>
      ) : (
        <fieldset className="m-0 grid border-0 p-0">
          <legend className="pb-1.5 text-xs font-bold tracking-wide text-neutre-700 uppercase">
            Métré de la maison
          </legend>
          {lignes.map((l) => (
            <label key={cleLigneMetre(l)} className={ligne}>
              <input
                type="checkbox"
                className="size-5 flex-none accent-accent"
                checked={coche(cleLigneMetre(l))}
                onChange={() => basculer(cleLigneMetre(l))}
              />
              <span className="flex-1 text-neutre-800">{libelleLigneMetre(l)}</span>
              <span className="font-bold whitespace-nowrap">{quantiteMetre(l)}</span>
            </label>
          ))}
          {menuiseries.length ? (
            <label className={ligne}>
              <input
                type="checkbox"
                className="size-5 flex-none accent-accent"
                checked={coche('menuiseries')}
                onChange={() => basculer('menuiseries')}
              />
              <span className="flex-1 text-neutre-800">
                Menuiseries : {menuiseries.map((m) => `${m.libelle} × ${m.nombre}`).join(', ')}
              </span>
            </label>
          ) : null}
        </fieldset>
      )}
      {lignes.length ? (
        <Button variant="secondaire" onClick={csv}>
          <DownloadSimpleIcon aria-hidden="true" /> Métré en CSV (Excel)
        </Button>
      ) : null}
      <ExportPlan etat={etat} espace={espace} planId={planId} />
    </div>
  );
}
