'use client';

import { Banner, Button } from '@ph/ui';
import { useEffect, useState } from 'react';
import { posterJson } from '@/lib/posterJson';
import { GalerieModeles } from './GalerieModeles';
import type { BrouillonSite } from './useBrouillonSite';

type Modele = { id: string; nom: string } & Pick<BrouillonSite, 'pages'> &
  Partial<Pick<BrouillonSite, 'navigation' | 'theme'>>;

/**
 * Modèles fournis (galerie) puis Mes modèles (SITE-IA-09) : appliquer ou restaurer remplace le
 * brouillon en une étape (Ctrl Z annule).
 */
export function PanneauModeles({
  site,
  onRestaurer,
}: {
  site: BrouillonSite;
  onRestaurer: (m: Pick<BrouillonSite, 'pages'> & Partial<BrouillonSite>) => void;
}) {
  const [modeles, setModeles] = useState<Modele[] | null>(null);
  const [message, setMessage] = useState<{ ton: 'succes' | 'danger'; texte: string } | null>(null);
  useEffect(() => {
    void posterJson<Modele[]>('/api/pro/site/modeles', {}).then((r) =>
      r.ok ? setModeles(r.data) : setMessage({ ton: 'danger', texte: r.message }),
    );
  }, []);
  return (
    <>
      <GalerieModeles site={site} onAppliquer={onRestaurer} />
      <section aria-labelledby="mes-modeles" className="grid gap-3">
        <h2 id="mes-modeles" className="m-0 text-lg">
          Mes modèles
        </h2>
        {modeles && !modeles.length ? (
          <p className="m-0 text-[15px] text-neutre-800">
            Aucun modèle pour l’instant. Avant chaque création par l’IA, votre site est gardé ici.
          </p>
        ) : null}
        <ul className="m-0 grid list-none gap-2 p-0">
          {modeles?.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-2 rounded-[12px] border border-trait p-3"
            >
              <span>
                <b>{m.nom}</b>
                <span className="block text-sm text-neutre-700">
                  {Object.keys(m.pages).length} pages
                </span>
              </span>
              <Button
                taille="sm"
                variant="secondaire"
                onClick={() => {
                  onRestaurer(m);
                  setMessage({
                    ton: 'succes',
                    texte: `« ${m.nom} » restauré dans l’éditeur. Enregistrez pour le garder, Ctrl Z pour revenir.`,
                  });
                }}
              >
                Restaurer
              </Button>
            </li>
          ))}
        </ul>
        {message ? <Banner tone={message.ton}>{message.texte}</Banner> : null}
      </section>
    </>
  );
}
