'use client';

import {
  trouverNoeud,
  type Bloc,
  type Element,
  type Ligne,
  type PageSite,
  type Section,
} from '@ph/core/sites';
import { cn } from '@ph/ui';
import { niveauxEditeur } from '@ph/ui/tokens';
import { useState, type ReactNode } from 'react';
import { IconeAction } from '../icones';
import type { InfoSelection, OpSelection } from '../selection';
import type { ContexteReglages } from './contexte';
import { ReglagesBloc, ReglagesLigne, ReglagesZone } from './ReglagesConteneurs';
import { ReglagesContenu } from './ReglagesContenu';

export type OngletProprietes = 'general' | 'mobile' | 'avance';

const RACCOURCIS = [
  ['Annuler / rétablir', 'Ctrl Z · Ctrl ⇧ Z'],
  ['Dupliquer', 'Ctrl D'],
  ['Supprimer', 'Suppr'],
  ['Sélectionner le parent', 'Échap'],
] as const;

/** Identifiants HTML de la page, pour signaler un doublon. */
function idsDe(page: PageSite): string[] {
  return page.sections.flatMap((z) => [
    z.p.ancre,
    ...z.rows.flatMap((r) => [
      r.p.htmlId ?? '',
      ...r.cols.flatMap((c) => [c.p.htmlId ?? '', ...c.els.map((e) => e.p.htmlId)]),
    ]),
  ]);
}

/**
 * Panneau de droite (maquette Editeur de Site) : la sélection, ses actions, onglets Général et
 * Avancé (et Mobile pour la navigation) ; sans sélection, l'aide et les raccourcis.
 */
export function PanneauProprietes({
  page,
  info,
  c,
  onAction,
  navigation,
  onBlocs,
  onDisposition,
  onEnregistrerZone,
}: {
  page: PageSite;
  info: InfoSelection | null;
  c: ContexteReglages;
  onAction: (op: OpSelection) => void;
  /** Réglages de la navigation (composant global), rendus par l'éditeur. */
  navigation: (onglet: OngletProprietes) => ReactNode;
  onBlocs: (n: number) => void;
  onDisposition: (largeurs: readonly number[]) => void;
  onEnregistrerZone: (z: Section) => void;
}) {
  const [onglet, setOnglet] = useState<OngletProprietes>('general');
  if (!info)
    return (
      <div className="grid gap-3 p-4">
        <strong className="text-base">Rien de sélectionné</strong>
        <p className="m-0 text-sm text-neutre-700">
          Cliquez sur un contenu de la page. La structure (barre de gauche) et la touche Échap
          permettent de remonter à son bloc, sa section et sa zone.
        </p>
        <dl className="m-0 grid gap-1.5 text-[13px]">
          {RACCOURCIS.map(([l, t]) => (
            <div key={l} className="flex justify-between gap-2">
              <dt className="text-neutre-800">{l}</dt>
              <dd className="m-0 font-semibold text-neutre-700">{t}</dd>
            </div>
          ))}
        </dl>
      </div>
    );
  const onglets: [OngletProprietes, string][] =
    info.niveau === 'nav'
      ? [
          ['general', 'Général'],
          ['mobile', 'Mobile'],
          ['avance', 'Avancé'],
        ]
      : [
          ['general', 'Général'],
          ['avance', 'Avancé'],
        ];
  const actif = onglets.some(([o]) => o === onglet) ? onglet : 'general';
  const ids = idsDe(page);
  const idPris = (v: string) => Boolean(v) && ids.filter((x) => x === v).length > 1;
  const f = info.niveau === 'nav' ? null : trouverNoeud(page, info.id);
  const og = actif === 'mobile' ? 'general' : actif;
  return (
    <div>
      <div className="sticky top-0 z-[2] grid gap-2.5 border-b border-trait bg-blanc px-4 pt-3">
        <div className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={cn(
              'size-2.5 flex-none',
              info.niveau === 'element' ? 'rounded-full' : 'rounded-[2px]',
              info.niveau === 'nav' && 'rotate-45',
            )}
            style={{ background: niveauxEditeur[info.niveau] }}
          />
          <h2 className="m-0 min-w-0 flex-1 truncate text-base font-bold">{info.nom}</h2>
          {info.actions.map((a) => (
            <button
              key={a.op}
              type="button"
              title={a.label}
              aria-label={a.label}
              onClick={() => onAction(a.op)}
              className="grid size-11 place-items-center rounded-[8px] border border-trait bg-blanc text-neutre-800 hover:bg-neutre-100"
            >
              <IconeAction op={a.op} />
            </button>
          ))}
        </div>
        <div role="tablist" aria-label="Réglages" className="flex">
          {onglets.map(([o, l]) => (
            <button
              key={o}
              type="button"
              role="tab"
              aria-selected={actif === o}
              onClick={() => setOnglet(o)}
              className={cn(
                'min-h-11 border-b-[3px] px-3 text-sm',
                actif === o
                  ? 'border-accent font-bold text-texte'
                  : 'border-transparent font-medium text-neutre-700',
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      <div role="tabpanel" className="grid gap-[22px] px-4 pt-4 pb-10">
        {info.niveau === 'nav' ? navigation(actif) : null}
        {f?.niveau === 'zone' ? (
          <ReglagesZone
            zone={f.noeud as Section}
            onglet={og}
            c={c}
            idPris={idPris}
            onEnregistrer={() => onEnregistrerZone(f.noeud as Section)}
          />
        ) : null}
        {f?.niveau === 'section' ? (
          <ReglagesLigne
            ligne={f.noeud as Ligne}
            onglet={og}
            c={c}
            idPris={idPris}
            onBlocs={onBlocs}
            onDisposition={onDisposition}
          />
        ) : null}
        {f?.niveau === 'bloc' ? (
          <ReglagesBloc bloc={f.noeud as Bloc} onglet={og} c={c} idPris={idPris} />
        ) : null}
        {f?.niveau === 'element' ? (
          <ReglagesContenu el={f.noeud as Element} onglet={og} c={c} idPris={idPris} />
        ) : null}
      </div>
    </div>
  );
}
