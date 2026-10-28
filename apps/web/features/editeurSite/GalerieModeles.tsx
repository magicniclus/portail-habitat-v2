'use client';

import { appliquerModeleSite, MODELES_SITE, type ModeleSite } from '@ph/core/sites';
import { Banner, Button } from '@ph/ui';
import { palettesSites } from '@ph/ui/tokens';
import { useState } from 'react';
import type { BrouillonSite } from './useBrouillonSite';
import { VignetteModele } from './VignetteModele';

const POLICE: Record<ModeleSite['polices'], string> = {
  archivo: 'Archivo',
  dmserif: 'DM Serif',
  barlow: 'Barlow Condensed',
};

const paletteDe = (m: ModeleSite) => {
  const { nom: _n, ...p } = palettesSites[m.palette] ?? palettesSites[0]!;
  return p;
};

/**
 * Les 6 modèles fournis (SITE_INTERNET §4.7) : « Appliquer à tout le site » (thème et mise en
 * page, textes et photos gardés) ou « Couleurs et polices seulement ». Chaque modèle part du site
 * d'avant le premier modèle appliqué, que « Revenir à l'état précédent » restaure.
 */
export function GalerieModeles({
  site,
  onAppliquer,
}: {
  site: BrouillonSite;
  onAppliquer: (b: BrouillonSite) => void;
}) {
  const [choisi, setChoisi] = useState<string | null>(null);
  const [avant, setAvant] = useState<BrouillonSite | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const appliquer = (m: ModeleSite, tout: boolean) => {
    const base = avant ?? site;
    setAvant(base);
    onAppliquer(appliquerModeleSite(base, m, paletteDe(m), tout));
    setChoisi(null);
    setMessage(
      `Modèle « ${m.nom} » appliqué${tout ? ` à ${Object.keys(base.pages).length} pages` : ' (couleurs et polices)'}. Vos textes et photos sont conservés.`,
    );
  };
  return (
    <section aria-labelledby="galerie-modeles" className="grid gap-3">
      <h2 id="galerie-modeles" className="m-0 text-lg">
        Modèles de site
      </h2>
      <p className="m-0 text-[13px] text-neutre-700">
        Chaque modèle reprend vos textes, photos et pages. Cliquez pour voir les options.
      </p>
      <ul className="m-0 grid list-none gap-3 p-0">
        {MODELES_SITE.map((m) => {
          const p = paletteDe(m);
          const ouvert = choisi === m.id;
          return (
            <li
              key={m.id}
              className={`grid gap-2.5 rounded-[10px] bg-blanc p-2 ${ouvert ? 'border-2 border-accent' : 'm-px border border-trait'}`}
            >
              <button
                type="button"
                aria-expanded={ouvert}
                onClick={() => setChoisi(ouvert ? null : m.id)}
                className="grid min-h-11 cursor-pointer gap-2 rounded-md border-0 bg-transparent p-0 text-left"
              >
                <VignetteModele m={m} p={p} />
                <span>
                  <b>{m.nom}</b>
                  <span className="block text-sm text-neutre-700">
                    {m.description} · {POLICE[m.polices]}
                  </span>
                </span>
              </button>
              {ouvert ? (
                <div className="grid gap-1.5">
                  <Button taille="sm" pleineLargeur onClick={() => appliquer(m, true)}>
                    Appliquer à tout le site
                  </Button>
                  <Button
                    taille="sm"
                    variant="secondaire"
                    pleineLargeur
                    onClick={() => appliquer(m, false)}
                  >
                    Couleurs et polices seulement
                  </Button>
                  <span className="text-xs text-neutre-600">
                    « Tout le site » remplace la mise en page de chaque page. Vous pouvez revenir en
                    arrière.
                  </span>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      {message ? <Banner tone="succes">{message}</Banner> : null}
      {avant ? (
        <Button
          variant="fantome"
          onClick={() => {
            onAppliquer(avant);
            setAvant(null);
            setMessage('Site d’avant le modèle restauré.');
          }}
        >
          Revenir à l’état précédent
        </Button>
      ) : null}
    </section>
  );
}
