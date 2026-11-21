'use client';

import { Banner, BoutonAction, Button } from '@ph/ui';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { routes } from '@/lib/routes';
import { useAppelSite } from './appelSite';
import type { ResultatPublication } from './publication';

/**
 * « Publier » : le site part en ligne quand l'artisan le décide (SITE-09). Une seule confirmation
 * claire, qui reste affichée (`?publie=1`) ; les liens incomplets ne sont simplement pas
 * cliquables sur le site, sans liste d'erreurs techniques.
 */
export function BoutonPublier({ libelle }: { libelle: string }) {
  const router = useRouter();
  const { appeler, erreur, enCours } = useAppelSite();
  const publier = async () => {
    const r = await appeler<ResultatPublication>('publier', {});
    if (r) router.replace(`${routes.proSite}?publie=1` as Route);
  };
  return (
    <div className="grid gap-2">
      <Button chargement={enCours} onClick={() => void publier()} disabled={enCours}>
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
