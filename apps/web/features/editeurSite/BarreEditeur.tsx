'use client';

import type { Appareil, PageSite } from '@ph/core/sites';
import {
  ArrowClockwiseIcon,
  ArrowCounterClockwiseIcon,
  CaretLeftIcon,
  DesktopIcon,
  DeviceMobileIcon,
  DeviceTabletIcon,
  EyeIcon,
} from '@phosphor-icons/react';
import { Button, cn } from '@ph/ui';
import Link from 'next/link';
import { routes } from '@/lib/routes';
import { LARGEURS } from './Canevas';
import { ICONES_RAIL } from './icones';

const APPAREILS = [
  ['desktop', 'Ordinateur', DesktopIcon],
  ['tablet', 'Tablette', DeviceTabletIcon],
  ['mobile', 'Mobile', DeviceMobileIcon],
] as const;
const icone =
  'grid size-11 place-items-center rounded-[8px] border border-trait bg-blanc text-neutre-800 hover:bg-neutre-100 disabled:opacity-40';

/** Barre du haut (maquette) : retour, site et page, appareil et échelle, historique, état, Aperçu, Publier. */
export function BarreEditeur(p: {
  nomSite: string;
  pages: Record<string, PageSite>;
  pageId: string;
  onPage: (id: string) => void;
  appareil: Appareil;
  onAppareil: (a: Appareil) => void;
  echelle: number;
  onAnnuler: () => void;
  onRetablir: () => void;
  peutAnnuler: boolean;
  peutRetablir: boolean;
  etat: string;
  apercu: boolean;
  onApercu: () => void;
  onPublier: () => unknown;
  enCours: boolean;
  /** Aperçu gratuit de l'IA affiché : rien à publier (SITE-IA-01). */
  publicationBloquee?: boolean;
}) {
  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-trait bg-blanc px-3.5 py-1.5 min-[900px]:h-14 min-[900px]:flex-nowrap">
      <Link
        href={routes.proSite}
        title="Retour au tableau de bord du site"
        className="flex min-h-11 items-center gap-2 rounded-[8px] border border-trait px-2.5 text-sm font-semibold text-neutre-800 no-underline hover:bg-neutre-100"
      >
        <CaretLeftIcon size={16} aria-hidden="true" />
        Retour
      </Link>
      <span className="grid min-w-0 leading-[1.15]">
        <span className="truncate text-xs text-neutre-600">{p.nomSite}</span>
        <label className="sr-only" htmlFor="editeur-page">
          Page affichée
        </label>
        <select
          id="editeur-page"
          value={p.pageId}
          onChange={(e) => p.onPage(e.target.value)}
          className="max-w-60 cursor-pointer border-0 bg-transparent p-0 text-[15px] font-bold text-texte"
        >
          {Object.entries(p.pages)
            .sort(([, a], [, b]) => a.ordre - b.ordre)
            .map(([id, x]) => (
              <option key={id} value={id}>
                {x.nom}
              </option>
            ))}
        </select>
      </span>
      <div className="mx-auto flex items-center gap-2.5">
        <div
          role="group"
          aria-label="Appareil"
          className="flex overflow-hidden rounded-[9px] border border-trait"
        >
          {APPAREILS.map(([a, l, I]) => (
            <button
              key={a}
              type="button"
              title={l}
              aria-label={l}
              aria-pressed={p.appareil === a}
              onClick={() => p.onAppareil(a)}
              className={cn(
                'grid h-11 w-12 place-items-center border-r border-trait last:border-r-0',
                p.appareil === a
                  ? 'bg-accent text-blanc'
                  : 'bg-blanc text-neutre-800 hover:bg-neutre-100',
              )}
            >
              <I size={18} aria-hidden="true" />
            </button>
          ))}
        </div>
        <span className="hidden w-[120px] text-[13px] text-neutre-700 min-[1100px]:inline">
          {LARGEURS[p.appareil]} px · {Math.round(p.echelle * 100)} %
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className={icone}
          onClick={p.onAnnuler}
          disabled={!p.peutAnnuler}
          title="Annuler (Ctrl Z)"
          aria-label="Annuler (Ctrl Z)"
        >
          <ArrowCounterClockwiseIcon size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={icone}
          onClick={p.onRetablir}
          disabled={!p.peutRetablir}
          title="Rétablir (Ctrl ⇧ Z)"
          aria-label="Rétablir (Ctrl ⇧ Z)"
        >
          <ArrowClockwiseIcon size={16} aria-hidden="true" />
        </button>
        <span role="status" className="px-2 text-[13px] whitespace-nowrap text-neutre-600">
          {p.etat}
        </span>
        <Button variant="secondaire" onClick={p.onApercu} aria-pressed={p.apercu}>
          <EyeIcon size={16} aria-hidden="true" />
          {p.apercu ? 'Quitter l’aperçu' : 'Aperçu'}
        </Button>
        <Button
          chargement={p.enCours}
          onClick={p.onPublier}
          disabled={p.enCours || p.publicationBloquee}
        >
          Publier
        </Button>
      </div>
    </header>
  );
}

export type Panneau = keyof typeof ICONES_RAIL;
const RAIL: [Panneau, string, string][] = [
  ['ajouter', 'Ajouter', 'Ajouter'],
  ['structure', 'Structure', 'Structure'],
  ['pages', 'Pages du site', 'Pages'],
  ['seo', 'Référencement', 'SEO'],
  ['styles', 'Styles du site', 'Styles'],
  ['modeles', 'Modèles de site', 'Modèles'],
  ['versions', 'Historique des versions', 'Versions'],
  ['ia', 'Assistant IA', 'IA'],
];
/** Titres des panneaux (maquette) ; le rail garde des infobulles plus longues. */
export const TITRES_PANNEAU: Record<Panneau, string> = {
  ajouter: 'Ajouter',
  structure: 'Structure',
  pages: 'Pages du site',
  seo: 'Référencement',
  styles: 'Styles du site',
  modeles: 'Modèles',
  versions: 'Historique des versions',
  ia: 'Assistant IA',
};

/** Barre d'outils de gauche : un clic ouvre le panneau, un second le ferme. */
export function Rail({
  actif,
  onChoisir,
}: {
  actif: Panneau | null;
  onChoisir: (p: Panneau) => void;
}) {
  return (
    <nav
      aria-label="Outils de l’éditeur"
      className="flex gap-1 overflow-x-auto border-b border-trait bg-blanc px-1 py-1.5 min-[900px]:h-full min-[900px]:w-16 min-[900px]:flex-col min-[900px]:items-center min-[900px]:border-r min-[900px]:border-b-0 min-[900px]:px-0 min-[900px]:py-2.5"
    >
      {RAIL.map(([id, titre, court]) => {
        const I = ICONES_RAIL[id];
        const on = actif === id;
        return (
          <button
            key={id}
            type="button"
            title={titre}
            aria-pressed={on}
            onClick={() => onChoisir(id)}
            className={cn(
              'grid w-[58px] flex-none justify-items-center gap-[3px] rounded-[10px] pt-2 pb-1.5',
              on ? 'bg-accent-100 text-accent-800' : 'text-neutre-700 hover:bg-neutre-100',
            )}
          >
            <I size={20} aria-hidden="true" />
            <span className="text-[11px] font-semibold">{court}</span>
          </button>
        );
      })}
    </nav>
  );
}
