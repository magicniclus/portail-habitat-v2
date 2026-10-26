'use client';

import { Banner, Feuille } from '@ph/ui';
import { XIcon } from '@phosphor-icons/react';
import { useState, type ReactNode } from 'react';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { BarreEditeur } from './BarreEditeur';

/**
 * Cadre pleine page des éditeurs (captures du propriétaire) : barre du haut (fermer, titre,
 * « Options »), feuille au centre, panneau Options à droite au-dessus de 1100 px (refermable),
 * feuille du bas en dessous ; actions flottantes centrées en bas.
 */
export function CadreEditeur({
  titre,
  message,
  avant,
  feuille,
  options,
  actions,
}: {
  titre: string;
  message: { ton: 'succes' | 'danger'; texte: string } | null;
  /** Au-dessus de la feuille (« En réponse à la demande… »). */
  avant?: ReactNode;
  feuille: ReactNode;
  options: ReactNode;
  actions: ReactNode;
}) {
  const large = useMediaQuery('(min-width: 1100px)');
  const [ouvert, setOuvert] = useState(true);
  const [feuilleBas, setFeuilleBas] = useState(false);
  const panneauVisible = large && ouvert;
  return (
    <div className="min-h-dvh bg-neutre-100 pb-32">
      <BarreEditeur
        titre={titre}
        onOptions={() => (large ? setOuvert((o) => !o) : setFeuilleBas(true))}
        optionsOuvertes={panneauVisible}
      />
      <div
        className={`grid grid-cols-[minmax(0,1fr)] items-start gap-6 px-[clamp(8px,3vw,32px)] py-6 ${panneauVisible ? 'min-[1100px]:grid-cols-[minmax(0,1fr)_340px]' : ''}`}
      >
        <div className="grid min-w-0 gap-4">
          {message ? (
            <div
              role={message.ton === 'danger' ? 'alert' : 'status'}
              className="mx-auto w-full max-w-[900px]"
            >
              <Banner tone={message.ton}>{message.texte}</Banner>
            </div>
          ) : null}
          {avant}
          {feuille}
        </div>
        {panneauVisible ? (
          <aside
            aria-label="Options"
            className="sticky top-20 grid max-h-[calc(100dvh-180px)] gap-4 overflow-y-auto rounded-[14px] border border-trait bg-blanc p-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="m-0 text-lg">Options</h2>
              <button
                type="button"
                aria-label="Fermer les options"
                onClick={() => setOuvert(false)}
                className="grid size-11 place-items-center rounded-full hover:bg-neutre-100 focus-visible:outline-2 focus-visible:outline-accent"
              >
                <XIcon size={18} aria-hidden="true" />
              </button>
            </div>
            {options}
          </aside>
        ) : large ? null : (
          <Feuille open={feuilleBas} onOpenChange={setFeuilleBas} titre="Options" mode="bas">
            {options}
          </Feuille>
        )}
      </div>
      <div className="pointer-events-none fixed inset-x-0 bottom-[max(16px,env(safe-area-inset-bottom))] z-30 flex justify-center px-4">
        <div className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-2 rounded-[18px] border border-trait bg-blanc/95 p-2 shadow-lg backdrop-blur">
          {actions}
        </div>
      </div>
    </div>
  );
}
