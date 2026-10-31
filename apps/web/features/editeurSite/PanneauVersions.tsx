'use client';

import { formatDate } from '@ph/core/format';
import type { Navigation, PageSite, Theme } from '@ph/core/sites';
import { Banner, Badge, BoutonAction } from '@ph/ui';
import { useState } from 'react';
import { posterJson } from '@/lib/posterJson';
import type { ProprietesEditeur } from './proprietes';
import type { useBrouillonSite } from './useBrouillonSite';

type Contenu = { pages: Record<string, PageSite>; navigation: Navigation; theme: Theme };

/**
 * Historique des versions (les 20 dernières publications) : remettre une version en ligne
 * (instantané, le brouillon n'est pas touché, SITE-08) ou la reprendre dans l'éditeur (ses pages
 * remplacent celles du brouillon ; les pages jamais publiées restent ; Ctrl Z annule).
 */
export function PanneauVersions({
  s,
  props: { versions, versionPubliee },
  flash,
}: {
  s: ReturnType<typeof useBrouillonSite>;
  props: Pick<ProprietesEditeur, 'versions' | 'versionPubliee'>;
  flash: (m: string) => void;
}) {
  const [enLigne, setEnLigne] = useState(versionPubliee);
  const [erreur, setErreur] = useState<string | null>(null);
  if (!versions.length)
    return (
      <p className="m-0 text-[15px] text-neutre-800">
        Aucune version publiée pour l’instant. Chaque clic sur « Publier » en garde une ici, pour
        revenir en arrière en un clic.
      </p>
    );
  const reprendre = async (n: number) => {
    setErreur(null);
    const r = await posterJson<Contenu>('/api/pro/site/version', { version: n });
    if (!r.ok) return setErreur(r.message);
    // Pages de la version à la place des mêmes pages ; celles jamais publiées restent.
    s.restaurer({
      pages: { ...s.b.pages, ...r.data.pages },
      navigation: r.data.navigation,
      theme: r.data.theme,
    });
    flash(`Version ${n} reprise dans l’éditeur · Ctrl+Z pour annuler`);
  };
  const remettre = async (n: number) => {
    setErreur(null);
    const r = await posterJson<null>('/api/pro/site/retablir', { version: n });
    if (!r.ok) return setErreur(r.message);
    setEnLigne(n);
    flash(`Version ${n} remise en ligne`);
  };
  return (
    <div className="grid gap-3">
      <p className="m-0 text-sm text-neutre-700">
        « Remettre en ligne » change le site visible tout de suite. « Reprendre » charge la version
        dans l’éditeur pour la modifier.
      </p>
      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
      <ol aria-label="Versions publiées" className="m-0 grid list-none gap-2 p-0">
        {versions.map((v) => (
          <li key={v.n} className="grid gap-2 rounded-[12px] border border-trait bg-blanc p-3">
            <span className="flex flex-wrap items-center justify-between gap-2">
              <span className="grid">
                <strong className="text-[15px]">Version {v.n}</strong>
                <span className="text-[13px] text-neutre-700">
                  {formatDate(new Date(v.publieLe), 'dateHeure')}
                </span>
              </span>
              {v.n === enLigne ? <Badge tone="succes">En ligne</Badge> : null}
            </span>
            <span className="flex flex-wrap gap-2">
              <BoutonAction taille="sm" variant="secondaire" onClick={() => reprendre(v.n)}>
                Reprendre
              </BoutonAction>
              {v.n === enLigne ? null : (
                <BoutonAction taille="sm" variant="fantome" onClick={() => remettre(v.n)}>
                  Remettre en ligne
                </BoutonAction>
              )}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
