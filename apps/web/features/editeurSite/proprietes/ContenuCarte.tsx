'use client';

import type { Element } from '@ph/core/sites';
import { BoutonAction } from '@ph/ui';
import { useState } from 'react';
import { posterJson } from '@/lib/posterJson';
import { Champ } from './Champ';
import { Curseur, Info } from './controles';
import type { ContexteReglages } from './contexte';

type Lieu = { latitude: number; longitude: number; libelle: string } | null;

/**
 * Carte : l'adresse est cherchée par le géocodage public (côté serveur), puis affichée sur un fond
 * OpenStreetMap avec un repère et un lien « Itinéraire ». Zoom réglable.
 */
export function ContenuCarte({
  el,
  c,
}: {
  el: Extract<Element, { type: 'carte' }>;
  c: ContexteReglages;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const placer = async () => {
    setMessage(null);
    const adresse = (el.p.adresse ?? '').trim();
    if (adresse.length < 3) return setMessage('Saisissez d’abord l’adresse.');
    const r = await posterJson<{ lieu: Lieu }>('/api/pro/site/geocoder', { adresse });
    if (!r.ok) return setMessage(r.message);
    if (!r.data.lieu)
      return setMessage('Adresse introuvable : précisez la ville ou le code postal.');
    const { libelle, ...geo } = r.data.lieu;
    c.maj({ geo, adresse: libelle, zoom: el.p.zoom ?? 15 });
  };
  return (
    <>
      <Champ
        libelle="Adresse"
        valeur={el.p.adresse ?? ''}
        onChange={(adresse) => c.maj({ adresse })}
      />
      <div>
        <BoutonAction variant="secondaire" taille="sm" onClick={placer}>
          {el.p.geo ? 'Replacer sur la carte' : 'Placer sur la carte'}
        </BoutonAction>
      </div>
      {message ? (
        <p role="alert" className="m-0 text-[13px] font-semibold text-danger">
          {message}
        </p>
      ) : null}
      {el.p.geo ? (
        <Curseur
          libelle="Zoom"
          valeur={el.p.zoom ?? 15}
          min={11}
          max={18}
          unite=""
          onChange={(zoom) => c.maj({ zoom })}
        />
      ) : (
        <Info>Sans position, la carte reste un encart avec l’adresse.</Info>
      )}
    </>
  );
}
