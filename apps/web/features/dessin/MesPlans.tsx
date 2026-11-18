'use client';

import { ArrowUUpLeftIcon, PlusIcon } from '@phosphor-icons/react';
import { Banner, Button, EmptyState, Field, Input, Select, Skeleton } from '@ph/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { routes } from '@/lib/routes';
import { actionPlan, creerPlan, listerPlans, type EspaceDessin, type PlanListe } from './api';
import { CartePlan } from './CartePlan';
import { NouveauPlan } from './NouveauPlan';
import { useRepriseEssai } from './useRepriseEssai';

/** Recherche sans accents ni majuscules. */
const normaliser = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

type Etat =
  | { etat: 'chargement' }
  | { etat: 'erreur'; message: string }
  | { etat: 'pret'; plans: PlanListe[] };

/** Mes plans (DES-02) : aperçus, recherche, tri, création, copie, corbeille de 30 jours. */
export function MesPlans({ espace }: { espace: EspaceDessin }) {
  const router = useRouter();
  const [e, setE] = useState<Etat>({ etat: 'chargement' });
  const [nouveau, setNouveau] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const reprise = useRepriseEssai(espace === 'particulier');
  const lien = (id: string) =>
    espace === 'particulier' ? routes.editeurPlan(id) : routes.proEditeurPlan(id);

  const [recherche, setRecherche] = useState('');
  const [tri, setTri] = useState<'date' | 'titre'>('date');
  const [version, setVersion] = useState(0);
  const recharger = () => setVersion((v) => v + 1);
  useEffect(() => {
    let actif = true;
    void listerPlans(espace).then((r) => {
      if (!actif) return;
      if (r.ok) setE({ etat: 'pret', plans: r.data });
      else if (r.code === 'NON_AUTHENTIFIE')
        router.replace(routes.connexionSuite(window.location.pathname + window.location.search));
      else setE({ etat: 'erreur', message: r.message });
    });
    return () => {
      actif = false;
    };
  }, [espace, router, version]);

  // Une action à la fois : un double clic ne crée pas deux copies.
  const [enCours, setEnCours] = useState(false);
  const agir = async (operation: 'dupliquer' | 'corbeille' | 'restaurer', planId: string) => {
    if (enCours) return;
    setEnCours(true);
    const r = await actionPlan(espace, operation, planId);
    setEnCours(false);
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
  const cle = normaliser(recherche);
  const visibles = actifs
    .filter((p) => !cle || normaliser(p.titre).includes(cle))
    .sort((a, b) => (tri === 'titre' ? a.titre.localeCompare(b.titre, 'fr') : 0));
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
      {reprise ? <Banner tone="attention">{reprise}</Banner> : null}
      {message ? <Banner tone="attention">{message}</Banner> : null}
      {actifs.length === 0 ? (
        <EmptyState
          titre="Aucun plan pour l’instant"
          action={<Button onClick={() => setNouveau(true)}>Créer mon premier plan</Button>}
        >
          Partez d’un rectangle ou d’une forme en L, U ou T, puis ajustez les murs.
        </EmptyState>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <Field label="Rechercher un plan" className="min-w-0 flex-1">
              <Input
                type="search"
                value={recherche}
                onChange={(ev) => setRecherche(ev.target.value)}
              />
            </Field>
            <Field label="Trier par">
              <Select value={tri} onChange={(ev) => setTri(ev.target.value as 'date' | 'titre')}>
                <option value="date">Modifiés récemment</option>
                <option value="titre">Titre (A à Z)</option>
              </Select>
            </Field>
          </div>
          {visibles.length === 0 ? (
            <p className="m-0 text-neutre-800">Aucun plan ne correspond à « {recherche} ».</p>
          ) : null}
          <ul className="m-0 grid list-none gap-3 p-0 min-[700px]:grid-cols-2 min-[1100px]:grid-cols-3">
            {visibles.map((p) => (
              <CartePlan
                key={p.planId}
                plan={p}
                lien={lien(p.planId)}
                agir={(op, id) => void agir(op, id)}
              />
            ))}
          </ul>
        </>
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
