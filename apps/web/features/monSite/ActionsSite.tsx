'use client';

import { Banner, Button } from '@ph/ui';
import { useAppelSite } from './appelSite';

/** « Publier » : liens et boutons vérifiés côté serveur, message clair si la publication est bloquée (SITE-09). */
export function BoutonPublier({ libelle }: { libelle: string }) {
  const { appeler, erreur, enCours } = useAppelSite();
  return (
    <div className="grid gap-2">
      <Button chargement={enCours} onClick={() => void appeler('publier', {})} disabled={enCours}>
        {enCours ? 'Publication…' : libelle}
      </Button>
      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
    </div>
  );
}

/** Remise en ligne d'une version publiée (SITE-08) ; le brouillon n'est pas touché. */
export function BoutonRetablir({ version }: { version: number }) {
  const { appeler, erreur, enCours } = useAppelSite();
  return (
    <span className="grid gap-1">
      <Button
        variant="secondaire"
        onClick={() => void appeler('retablir', { version })}
        disabled={enCours}
      >
        Remettre en ligne
      </Button>
      {erreur ? <span className="text-sm text-danger">{erreur}</span> : null}
    </span>
  );
}
