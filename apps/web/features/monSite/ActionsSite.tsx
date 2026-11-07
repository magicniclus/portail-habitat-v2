'use client';

import { Banner, BoutonAction, Button } from '@ph/ui';
import { useState } from 'react';
import { useAppelSite } from './appelSite';
import { messagePublication, type ResultatPublication } from './publication';

/**
 * « Publier » : le site part en ligne quand l'artisan le décide (SITE-09) ; les liens, boutons et
 * textes « [à compléter] » à revoir sont signalés ensuite, sans bloquer.
 */
export function BoutonPublier({ libelle }: { libelle: string }) {
  const { appeler, erreur, enCours } = useAppelSite();
  const [resultat, setResultat] = useState<ResultatPublication | null>(null);
  const publier = async () => {
    setResultat(null);
    setResultat(await appeler<ResultatPublication>('publier', {}));
  };
  const m = resultat ? messagePublication(resultat) : null;
  return (
    <div className="grid gap-2">
      <Button chargement={enCours} onClick={() => void publier()} disabled={enCours}>
        {enCours ? 'Publication…' : libelle}
      </Button>
      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
      {m ? <Banner tone={m.ton}>{m.texte}</Banner> : null}
    </div>
  );
}

/** Remise en ligne d'une version publiée (SITE-08) ; le brouillon n'est pas touché. */
export function BoutonRetablir({ version }: { version: number }) {
  const { appeler, erreur, enCours } = useAppelSite();
  return (
    <span className="grid gap-1">
      <BoutonAction
        variant="secondaire"
        onClick={() => appeler('retablir', { version })}
        disabled={enCours}
      >
        Remettre en ligne
      </BoutonAction>
      {erreur ? <span className="text-sm text-danger">{erreur}</span> : null}
    </span>
  );
}
