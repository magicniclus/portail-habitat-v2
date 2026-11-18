'use client';

import {
  ArrowClockwiseIcon,
  ArrowCounterClockwiseIcon,
  ArrowLeftIcon,
  CubeIcon,
  EyeIcon,
  FloppyDiskIcon,
  QuestionIcon,
  SquareIcon,
} from '@phosphor-icons/react';
import { peutAnnuler, peutRetablir } from '@ph/core/dessin';
import { Button, IconButton } from '@ph/ui';
import type { Route } from 'next';
import Link from 'next/link';
import type { Dispatch } from 'react';
import type { Action, EtatEditeur } from './etat';
import type { EtatSauvegarde } from './useSauvegarde';

const LIBELLES_SAUVEGARDE: Record<EtatSauvegarde, string> = {
  enregistre: 'Enregistré',
  modifie: 'Modifications en attente',
  enregistrement: 'Enregistrement…',
  hors_ligne: 'Hors ligne : gardé sur cet appareil',
  conflit: 'Modifié ailleurs',
  erreur: 'Non enregistré',
};
const PASTILLE: Record<EtatSauvegarde, string> = {
  enregistre: 'bg-succes',
  modifie: 'bg-attention-vif',
  enregistrement: 'bg-attention-vif',
  hors_ligne: 'bg-attention-vif',
  conflit: 'bg-danger',
  erreur: 'bg-danger',
};

/** Barre d'application de l'éditeur (maquette) : projet, niveau, annuler, vues, enregistrer. */
export function BarreDessin({
  titre,
  renommer,
  retour,
  etat,
  dispatch,
  sauvegarde,
  enregistrer,
  basculerGuide,
}: {
  titre: string;
  renommer: (titre: string) => void;
  retour: Route;
  etat: EtatEditeur;
  dispatch: Dispatch<Action>;
  sauvegarde: EtatSauvegarde;
  enregistrer: () => void;
  basculerGuide: () => void;
}) {
  const niveaux = etat.historique.present.niveaux;
  return (
    <header className="flex flex-none flex-wrap items-center gap-x-4 gap-y-2 border-b border-trait bg-blanc px-3 py-2">
      <Link
        href={retour}
        aria-label="Retour à mes plans"
        className="inline-flex size-11 items-center justify-center rounded-control text-texte hover:bg-neutre-100"
      >
        <ArrowLeftIcon size={22} aria-hidden="true" />
      </Link>
      <div className="flex min-w-0 flex-col">
        <label
          htmlFor="dessin-titre"
          className="text-[11px] font-bold tracking-wide text-neutre-700 uppercase"
        >
          Projet
        </label>
        <input
          id="dessin-titre"
          defaultValue={titre}
          maxLength={120}
          onBlur={(ev) => {
            const t = ev.target.value.trim();
            if (t && t !== titre) renommer(t);
          }}
          className="w-[200px] max-w-[40vw] border-0 bg-transparent p-0 text-base font-semibold text-texte"
        />
      </div>
      <span
        role="status"
        className="flex items-center gap-1.5 text-[13px] whitespace-nowrap text-neutre-800"
      >
        <span aria-hidden="true" className={`size-2 rounded-full ${PASTILLE[sauvegarde]}`} />
        <span className="max-[599px]:sr-only">{LIBELLES_SAUVEGARDE[sauvegarde]}</span>
      </span>

      {/* Plusieurs niveaux : lot 15e. */}
      <p className="m-0 ml-auto flex gap-1 rounded-[10px] bg-neutre-100 p-1 max-[899px]:hidden">
        {niveaux.map((n) => (
          <span
            key={n.id}
            aria-current={n.id === etat.niveauId ? 'true' : undefined}
            className="inline-flex min-h-9 items-center rounded-lg bg-blanc px-3 text-sm font-bold shadow-sm"
          >
            {n.nom}
          </span>
        ))}
      </p>

      <div className="flex max-[899px]:ml-auto">
        <IconButton
          aria-label="Annuler"
          icone={<ArrowCounterClockwiseIcon />}
          disabled={!peutAnnuler(etat.historique)}
          onClick={() => dispatch({ type: 'annuler' })}
        />
        <IconButton
          aria-label="Rétablir"
          icone={<ArrowClockwiseIcon />}
          disabled={!peutRetablir(etat.historique)}
          onClick={() => dispatch({ type: 'retablir' })}
        />
      </div>

      <div
        role="radiogroup"
        aria-label="Vue"
        className="flex overflow-hidden rounded-[10px] border border-neutre-300 max-[899px]:hidden"
      >
        <button
          type="button"
          role="radio"
          aria-checked="true"
          className="flex min-h-10 items-center gap-1.5 border-0 bg-accent-100 px-3 text-sm font-bold text-accent-700"
        >
          <SquareIcon aria-hidden="true" /> Plan
        </button>
        {[
          { libelle: '3D', Icone: CubeIcon },
          { libelle: 'Visite', Icone: EyeIcon },
        ].map(({ libelle, Icone }) => (
          <button
            key={libelle}
            type="button"
            role="radio"
            aria-checked="false"
            disabled
            title="Disponible prochainement"
            className="flex min-h-10 cursor-not-allowed items-center gap-1.5 border-0 border-l border-neutre-300 bg-blanc px-3 text-sm font-bold text-neutre-500"
          >
            <Icone aria-hidden="true" /> {libelle}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <IconButton
          variant="secondaire"
          aria-label="Guide de démarrage"
          icone={<QuestionIcon />}
          onClick={basculerGuide}
          className="max-[899px]:hidden"
        />
        <Button taille="sm" onClick={enregistrer} aria-label="Enregistrer">
          <FloppyDiskIcon aria-hidden="true" className="min-[600px]:hidden" />
          <span className="max-[599px]:hidden">Enregistrer</span>
        </Button>
      </div>
    </header>
  );
}
