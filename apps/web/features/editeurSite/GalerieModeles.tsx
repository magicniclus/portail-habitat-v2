'use client';

import { appliquerModeleSite, MODELES_SITE, type ModeleSite } from '@ph/core/sites';
import { Banner, Button } from '@ph/ui';
import { palettesSites } from '@ph/ui/tokens';
import { useState } from 'react';
import type { BrouillonSite } from './useBrouillonSite';

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
      <ul className="m-0 grid list-none gap-2 p-0">
        {MODELES_SITE.map((m) => {
          const p = paletteDe(m);
          const ouvert = choisi === m.id;
          return (
            <li key={m.id} className="grid gap-2 rounded-[12px] border border-trait p-3">
              <button
                type="button"
                aria-expanded={ouvert}
                onClick={() => setChoisi(ouvert ? null : m.id)}
                className="grid min-h-11 cursor-pointer gap-2 rounded-md border-0 bg-transparent p-0 text-left"
              >
                <span aria-hidden className="flex h-6 overflow-hidden rounded-sm">
                  {[p.primaire, p.accent, p.clair, p.sombre].map((c) => (
                    <span key={c} className="flex-1" style={{ background: c }} />
                  ))}
                </span>
                <span>
                  <b>{m.nom}</b>
                  <span className="block text-sm text-neutre-700">
                    {m.description} · {POLICE[m.polices]}
                  </span>
                </span>
              </button>
              {ouvert ? (
                <div className="flex flex-wrap gap-2">
                  <Button taille="sm" onClick={() => appliquer(m, true)}>
                    Appliquer à tout le site
                  </Button>
                  <Button taille="sm" variant="secondaire" onClick={() => appliquer(m, false)}>
                    Couleurs et polices seulement
                  </Button>
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
