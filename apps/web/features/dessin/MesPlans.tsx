'use client';

import { formatDate } from '@ph/core/format';
import { CopyIcon, PlusIcon, TrashIcon, ArrowUUpLeftIcon } from '@phosphor-icons/react';
import { Banner, Button, EmptyState, IconButton, Skeleton } from '@ph/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { routes } from '@/lib/routes';
import { actionPlan, creerPlan, listerPlans, type EspaceDessin, type PlanListe } from './api';
import { NouveauPlan } from './NouveauPlan';

type Etat =
  | { etat: 'chargement' }
  | { etat: 'erreur'; message: string }
  | { etat: 'pret'; plans: PlanListe[] };

/** Mes plans (DES-02) : liste, création depuis une forme, copie, corbeille de 30 jours. */
export function MesPlans({ espace }: { espace: EspaceDessin }) {
  const router = useRouter();
  const [e, setE] = useState<Etat>({ etat: 'chargement' });
  const [nouveau, setNouveau] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const lien = (id: string) =>
    espace === 'particulier' ? routes.monEspaceUnPlan(id) : routes.proUnPlan(id);

  const [version, setVersion] = useState(0);
  const recharger = () => setVersion((v) => v + 1);
  useEffect(() => {
    let actif = true;
    void listerPlans(espace).then((r) => {
      if (!actif) return;
      if (r.ok) setE({ etat: 'pret', plans: r.data });
      else if (r.code === 'NON_AUTHENTIFIE')
        router.replace(routes.connexionSuite(window.location.pathname));
      else setE({ etat: 'erreur', message: r.message });
    });
    return () => {
      actif = false;
    };
  }, [espace, router, version]);

  const agir = async (operation: 'dupliquer' | 'corbeille' | 'restaurer', planId: string) => {
    const r = await actionPlan(espace, operation, planId);
    setMessage(r.ok ? null : r.message);
    recharger();
  };

  if (e.etat === 'chargement')
    return (
      <div
        aria-busy="true"
        aria-label="Chargement de vos plans"
        className="grid gap-3 min-[700px]:grid-cols-3"
      >
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
      </div>
    );
  if (e.etat === 'erreur') return <Banner tone="danger">{e.message}</Banner>;

  const actifs = e.plans.filter((p) => !p.supprimeLe);
  const corbeille = e.plans.filter((p) => p.supprimeLe);
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 text-neutre-800">
          Dessinez votre logement en 2D, obtenez le métré, puis faites chiffrer vos travaux.
        </p>
        <Button onClick={() => setNouveau(true)}>
          <PlusIcon aria-hidden="true" /> Nouveau plan
        </Button>
      </div>
      {message ? <Banner tone="attention">{message}</Banner> : null}
      {actifs.length === 0 ? (
        <EmptyState
          titre="Aucun plan pour l’instant"
          action={<Button onClick={() => setNouveau(true)}>Créer mon premier plan</Button>}
        >
          Partez d’un rectangle ou d’une forme en L, U ou T, puis ajustez les murs.
        </EmptyState>
      ) : (
        <ul className="m-0 grid list-none gap-3 p-0 min-[700px]:grid-cols-2 min-[1100px]:grid-cols-3">
          {actifs.map((p) => (
            <li
              key={p.planId}
              className="flex items-center gap-2 rounded-card border border-trait bg-blanc p-4"
            >
              <Link href={lien(p.planId)} className="min-w-0 flex-1 text-texte no-underline">
                <span className="block truncate text-[17px] font-bold">{p.titre}</span>
                <span className="text-sm text-neutre-700">
                  Modifié le {formatDate(new Date(p.majLe))}
                </span>
              </Link>
              <IconButton
                aria-label={`Dupliquer ${p.titre}`}
                icone={<CopyIcon />}
                onClick={() => void agir('dupliquer', p.planId)}
              />
              <IconButton
                aria-label={`Mettre ${p.titre} à la corbeille`}
                icone={<TrashIcon />}
                onClick={() => void agir('corbeille', p.planId)}
              />
            </li>
          ))}
        </ul>
      )}
      {corbeille.length > 0 ? (
        <details className="rounded-card border border-trait p-4">
          <summary className="cursor-pointer font-semibold">
            Corbeille ({corbeille.length}) : supprimés définitivement après 30 jours
          </summary>
          <ul className="m-0 mt-3 grid list-none gap-2 p-0">
            {corbeille.map((p) => (
              <li key={p.planId} className="flex items-center gap-2">
                <span className="flex-1">{p.titre}</span>
                <Button
                  taille="sm"
                  variant="secondaire"
                  onClick={() => void agir('restaurer', p.planId)}
                >
                  <ArrowUUpLeftIcon aria-hidden="true" /> Restaurer
                </Button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      <NouveauPlan
        ouvert={nouveau}
        fermer={() => setNouveau(false)}
        creer={async (titre, scene) => {
          const r = await creerPlan(espace, titre, scene);
          if (!r.ok) return r.message;
          router.push(lien(r.data.planId));
          return null;
        }}
      />
    </div>
  );
}
