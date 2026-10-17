import type { ReactNode } from 'react';
import { cn } from '../cn';

export interface PageErreurProps {
  /** « Erreur 404 », « Maintenance »… */
  surtitre: string;
  titre: string;
  /** Mot mis en avant, en Source Serif italique dans l'accent. */
  motCle: string;
  texte: ReactNode;
  /** Grand chiffre du panneau décoratif (« 404 », « 500 », « ··· »). */
  visuel: string;
  /** Recherche, identifiant d'incident, heure de retour… */
  complement?: ReactNode;
  actions: ReactNode;
  /** Liens « pages souvent recherchées ». */
  liens?: ReactNode;
  entete: ReactNode;
  pied: ReactNode;
}

/** Pages 404, 500 et maintenance des trois espaces (maquette Pages Erreur). */
export function PageErreur({
  surtitre,
  titre,
  motCle,
  texte,
  visuel,
  complement,
  actions,
  liens,
  entete,
  pied,
}: PageErreurProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-blanc text-texte">
      <header className="border-b border-trait px-page py-4">{entete}</header>
      <main className="flex flex-1 items-center px-page py-[clamp(32px,7vw,96px)]">
        <div className="mx-auto grid w-full max-w-[1180px] items-center gap-[clamp(24px,5vw,72px)] md:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
          <div className="flex max-w-[600px] flex-col gap-[18px]">
            <span className="text-sm font-bold tracking-[0.08em] text-accent-700 uppercase">
              {surtitre}
            </span>
            <h1 className="m-0 text-[clamp(32px,4.5vw,54px)] leading-[1.06]">
              {titre} <span className="accent-editorial">{motCle}</span>
            </h1>
            <p className="m-0 text-lg leading-relaxed text-neutre-800">{texte}</p>
            {complement}
            <div className="flex flex-wrap gap-2.5">{actions}</div>
            {liens && (
              <div className="flex flex-col gap-2 pt-2">
                <span className="text-sm font-bold text-neutre-700">Pages souvent recherchées</span>
                <div className="flex flex-wrap gap-2">{liens}</div>
              </div>
            )}
          </div>
          <div
            aria-hidden="true"
            className={cn(
              'hidden aspect-[4/5] place-items-center overflow-hidden rounded-panel bg-accent-100 md:grid',
            )}
          >
            <span className="text-[clamp(96px,14vw,200px)] leading-none font-bold tracking-[-0.04em] text-accent-300">
              {visuel}
            </span>
          </div>
        </div>
      </main>
      <footer className="flex flex-wrap gap-x-5 gap-y-2 border-t border-trait px-page py-[18px] text-sm text-neutre-700">
        {pied}
      </footer>
    </div>
  );
}
