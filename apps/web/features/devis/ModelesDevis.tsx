'use client';

import { formatEuros } from '@ph/core/format';
import type { ModeleDevisResume } from '@ph/firebase/devis';
import { Button, EmptyState, bouton } from '@ph/ui';
import Link from 'next/link';
import { routes } from '@/lib/routes';
import { useAppelDevis } from './appelDevis';

/** Modèles de devis (maquette, onglet Modèles) : « Utiliser ce modèle » ouvre un devis prérempli. */
export function ModelesDevis({
  modeles,
  peutGerer,
}: {
  modeles: ModeleDevisResume[];
  peutGerer: boolean;
}) {
  const { appeler, enCours, erreur } = useAppelDevis();
  return (
    <section aria-labelledby="modeles-devis" className="grid gap-3">
      <h2 id="modeles-devis" className="m-0 text-lg">
        Modèles de devis
      </h2>
      {erreur}
      {modeles.length ? (
        <ul className="m-0 grid list-none gap-3 p-0 min-[600px]:grid-cols-[repeat(auto-fill,minmax(250px,1fr))]">
          {modeles.map((m) => (
            <li
              key={m.id}
              className="grid content-start gap-2 rounded-[14px] border border-trait p-4"
            >
              <strong className="text-base">{m.titre}</strong>
              <span className="text-sm text-neutre-700">
                {m.lignes.length} ligne{m.lignes.length > 1 ? 's' : ''} · à partir de{' '}
                {formatEuros(m.htCentimes, { decimales: 'toujours' })} HT
              </span>
              <span className="text-sm text-neutre-700">Utilisé {m.usage} fois</span>
              {peutGerer ? (
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={
                      `${routes.proDevisNouveau}?modele=${m.id}` as typeof routes.proDevisNouveau
                    }
                    className={bouton({ variant: 'secondaire' })}
                  >
                    Utiliser ce modèle
                  </Link>
                  <Button
                    chargement={enCours}
                    variant="fantome"
                    disabled={enCours}
                    aria-label={`Supprimer le modèle ${m.titre}`}
                    onClick={() =>
                      void appeler('/api/pro/devis/modeles', { action: 'supprimer', id: m.id })
                    }
                  >
                    Supprimer
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState titre="Pas encore de modèle">
          Ouvrez un devis et choisissez « Enregistrer comme modèle » pour réutiliser ses lignes.
        </EmptyState>
      )}
    </section>
  );
}
