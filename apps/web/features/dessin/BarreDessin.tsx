'use client';

import {
  ArrowClockwiseIcon,
  ArrowCounterClockwiseIcon,
  ArrowLeftIcon,
  CubeIcon,
  EyeIcon,
  FloppyDiskIcon,
  SquareIcon,
  type Icon,
} from '@phosphor-icons/react';
import { niveauxTries, peutAnnuler, peutRetablir } from '@ph/core/dessin';
import { Button, IconButton } from '@ph/ui';
import type { Route } from 'next';
import Link from 'next/link';
import type { Dispatch } from 'react';
import type { Action, EtatEditeur, Vue } from './etat';
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

const VUES: { vue: Vue; libelle: string; Icone: Icon; prete: boolean }[] = [
  { vue: 'plan', libelle: 'Plan', Icone: SquareIcon, prete: true },
  { vue: '3d', libelle: '3D', Icone: CubeIcon, prete: true },
  { vue: 'visite', libelle: 'Visite', Icone: EyeIcon, prete: true },
];

/** Barre de l'éditeur plein écran : retour, projet, enregistrement, annuler, vues. Une ligne. */
export function BarreDessin({
  titre,
  renommer,
  retour,
  etat,
  dispatch,
  sauvegarde,
  enregistrer,
}: {
  titre: string;
  renommer: (titre: string) => void;
  retour: Route;
  etat: EtatEditeur;
  dispatch: Dispatch<Action>;
  sauvegarde: EtatSauvegarde;
  enregistrer: () => void;
}) {
  return (
    <header className="flex h-16 flex-none items-center gap-3 border-b border-trait bg-blanc px-3">
      <Link
        href={retour}
        className="inline-flex min-h-11 flex-none items-center gap-2 rounded-control px-2.5 text-[15px] font-semibold text-texte no-underline hover:bg-neutre-100"
      >
        <ArrowLeftIcon size={20} aria-hidden="true" />
        <span className="max-[699px]:sr-only">Mes plans</span>
      </Link>
      <span aria-hidden="true" className="h-8 w-px flex-none bg-trait" />
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <label htmlFor="dessin-titre" className="sr-only">
          Nom du projet
        </label>
        <input
          id="dessin-titre"
          defaultValue={titre}
          maxLength={120}
          onBlur={(ev) => {
            const t = ev.target.value.trim();
            if (t && t !== titre) renommer(t);
          }}
          className="min-w-0 flex-1 truncate rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-[17px] font-bold text-texte hover:border-neutre-300 focus:border-accent min-[900px]:max-w-[320px]"
        />
        <span
          role="status"
          className="flex flex-none items-center gap-1.5 text-[13px] whitespace-nowrap text-neutre-800"
        >
          <span aria-hidden="true" className={`size-2 rounded-full ${PASTILLE[sauvegarde]}`} />
          <span className="max-[1099px]:sr-only">{LIBELLES_SAUVEGARDE[sauvegarde]}</span>
        </span>
      </div>

      <label className="flex flex-none items-center gap-2 text-sm font-semibold max-[699px]:sr-only">
        <span className="max-[1099px]:sr-only">Niveau</span>
        <select
          value={etat.niveauId}
          onChange={(ev) => dispatch({ type: 'changerNiveau', niveauId: ev.target.value })}
          className="min-h-11 rounded-control border border-neutre-300 bg-blanc px-2.5 text-[15px] font-semibold"
        >
          {[...niveauxTries(etat.historique.present)].reverse().map((n) => (
            <option key={n.id} value={n.id}>
              {n.nom}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-none">
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
        className="flex flex-none rounded-[10px] bg-neutre-100 p-1 max-[899px]:hidden"
      >
        {VUES.map(({ vue, libelle, Icone, prete }) => (
          <button
            key={libelle}
            type="button"
            role="radio"
            aria-checked={etat.vue === vue}
            disabled={!prete}
            title={prete ? undefined : 'Disponible prochainement'}
            onClick={() => dispatch({ type: 'vue', vue })}
            className={`flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border-0 px-3 text-sm font-bold ${etat.vue === vue ? 'bg-blanc text-texte shadow-sm' : prete ? 'bg-transparent text-neutre-800' : 'cursor-not-allowed bg-transparent text-neutre-500'}`}
          >
            <Icone aria-hidden="true" /> {libelle}
          </button>
        ))}
      </div>

      <Button
        taille="sm"
        className="flex-none"
        onClick={enregistrer}
        aria-label="Enregistrer une version"
      >
        <FloppyDiskIcon aria-hidden="true" />
        <span className="max-[599px]:hidden">Enregistrer</span>
      </Button>
    </header>
  );
}
