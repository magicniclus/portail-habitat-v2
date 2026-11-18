'use client';

import { Banner, Button, Field, Input } from '@ph/ui';
import { useState, type Dispatch } from 'react';
import { enregistrerFond, type EspaceDessin } from './api';
import { sceneDe, type Action, type EtatEditeur } from './etat';
import { pdfEnImage } from './pdfEnImage';
import { reduireImage } from './useFond';

/**
 * Importer un plan (D91) : un PDF ou une image (photo, scan, capture) posé en calque sous le dessin,
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
    const pdf = fichier.type === 'application/pdf';
    if (!pdf && !/^image\/(jpeg|png|webp)$/.test(fichier.type))
      return setErreur('Choisissez un PDF ou une image JPEG, PNG ou WebP.');
    setEnvoi(true);
    let base64: string;
    try {
      // Un PDF : sa première page devient une image, envoyée comme les autres.
      base64 = pdf ? await pdfEnImage(fichier) : await reduireImage(fichier);
    } catch {
      setEnvoi(false);
      return setErreur('Ce fichier n’a pas pu être lu. Essayez une autre version ou une capture.');
    }
    const r = await enregistrerFond(espace, { planId, type: 'image/jpeg', base64 });
    setEnvoi(false);
    if (r.ok) dispatch({ type: 'poserFond', storagePath: r.data.storagePath });
    else setErreur(r.message);
  };

  return (
    <div className="grid gap-4">
      <Field
        label={fond ? 'Remplacer le plan' : 'Plan à importer'}
        aide="PDF (première page) ou image JPEG, PNG, WebP ; réduit à 3 000 px avant l’envoi."
      >
        <Input
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          disabled={envoi}
          onChange={(ev) => void importer(ev.target.files?.[0])}
        />
      </Field>
      {envoi ? (
        <p role="status" className="m-0 text-sm">
          Préparation et envoi du plan…
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
