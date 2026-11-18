'use client';

import { Banner, Button, Field, Input } from '@ph/ui';
import { useState, type Dispatch } from 'react';
import { enregistrerFond, type EspaceDessin } from './api';
import { sceneDe, type Action, type EtatEditeur } from './etat';
import { reduireImage } from './useFond';

/**
 * Importer un plan (D91) : une image (photo, scan, capture) posée en calque sous le dessin,
 * opacité réglable, mise à l'échelle en cliquant deux points d'une cote connue.
 */
export function FondMenu({
  etat,
  dispatch,
  espace,
  planId,
}: {
  etat: EtatEditeur;
  dispatch: Dispatch<Action>;
  espace: EspaceDessin;
  planId: string;
}) {
  const fond = sceneDe(etat).fondImage;
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [distance, setDistance] = useState('');

  const importer = async (fichier: File | undefined) => {
    if (!fichier) return;
    setErreur(null);
    if (!/^image\/(jpeg|png|webp)$/.test(fichier.type))
      return setErreur('Choisissez une image JPEG, PNG ou WebP (export PDF : faites une capture).');
    setEnvoi(true);
    const r = await enregistrerFond(espace, {
      planId,
      type: 'image/jpeg',
      base64: await reduireImage(fichier),
    });
    setEnvoi(false);
    if (r.ok) dispatch({ type: 'poserFond', storagePath: r.data.storagePath });
    else setErreur(r.message);
  };

  return (
    <div className="grid gap-4">
      <Field
        label={fond ? 'Remplacer l’image' : 'Image du plan'}
        aide="JPEG, PNG ou WebP ; réduite à 3 000 px avant l’envoi."
      >
        <Input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={envoi}
          onChange={(ev) => void importer(ev.target.files?.[0])}
        />
      </Field>
      {envoi ? (
        <p role="status" className="m-0 text-sm">
          Envoi de l’image…
        </p>
      ) : null}
      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
      {fond ? (
        <>
          <Field label={`Opacité : ${fond.opacite} %`}>
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={fond.opacite}
              onChange={(ev) => dispatch({ type: 'reglerFond', opacite: Number(ev.target.value) })}
              className="min-h-11 w-full accent-accent-action"
            />
          </Field>
          <div className="grid gap-2 rounded-[10px] bg-neutre-100 p-3">
            <p className="m-0 text-sm font-bold">Mettre à l’échelle</p>
            {etat.echelle ? (
              <form
                className="grid gap-2"
                onSubmit={(ev) => {
                  ev.preventDefault();
                  const cm = Number(distance.replace(',', '.'));
                  if (cm > 0) dispatch({ type: 'mettreAEchelle', distance: Math.round(cm * 10) });
                }}
              >
                <Field label="Longueur réelle entre les deux points (cm)">
                  <Input
                    inputMode="decimal"
                    value={distance}
                    onChange={(ev) => setDistance(ev.target.value)}
                    autoFocus
                  />
                </Field>
                <Button taille="sm" type="submit">
                  Appliquer l’échelle
                </Button>
              </form>
            ) : (
              <>
                <p className="m-0 text-[13px] leading-5 text-neutre-800">
                  Cliquez sur les deux extrémités d’une cote connue de l’image, puis saisissez sa
                  longueur.
                </p>
                <Button
                  taille="sm"
                  variant={etat.outil === 'echelle' ? 'primaire' : 'secondaire'}
                  onClick={() => dispatch({ type: 'outil', outil: 'echelle' })}
                >
                  {etat.outil === 'echelle'
                    ? 'Cliquez deux points sur le plan…'
                    : 'Choisir deux points'}
                </Button>
              </>
            )}
          </div>
          <Button
            taille="sm"
            variant="secondaire"
            onClick={() => dispatch({ type: 'retirerFond' })}
          >
            Retirer l’image
          </Button>
        </>
      ) : null}
    </div>
  );
}
