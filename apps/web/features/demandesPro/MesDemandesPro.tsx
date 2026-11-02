'use client';

import {
  aRelancer,
  compterDemandesPro,
  compterEtapes,
  ETAPES_SUIVI,
  filtrerDemandesPro,
  LIBELLES_ETAPE,
  type EtapeSuivi,
  type EtatPro,
} from '@ph/core/espace-pro';
import type { DemandePro } from '@ph/firebase/pro';
import { Banner, cn, EmptyState, Field, Input } from '@ph/ui';
import { useState } from 'react';
import { posterJson } from '@/lib/posterJson';
import { CarteDemandePro, type ActionCarte } from './CarteDemandePro';
import { useDemandesPro } from './useDemandesPro';

const CARTES: { cle: 'total' | EtatPro; libelle: string; note: string }[] = [
  { cle: 'total', libelle: 'Total', note: 'demandes reçues' },
  { cle: 'nouveau', libelle: 'Nouvelles', note: 'à traiter' },
  { cle: 'contacte', libelle: 'Contactées', note: "en cours d'échange" },
  { cle: 'converti', libelle: 'Converties', note: 'clients signés' },
];

/** Maquette Mes Demandes : compteurs, recherche, filtre d'état, liste en temps réel (PRO-01 à 03). */
export function MesDemandesPro({
  initiales,
  artisanId,
  uid,
  peutDevis,
}: {
  initiales: DemandePro[];
  artisanId: string;
  uid: string;
  /** « Créer un devis » sur une demande acceptée (`devis.gerer`). */
  peutDevis: boolean;
}) {
  const { liste, recharger } = useDemandesPro(initiales, artisanId);
  const [q, setQ] = useState('');
  const [etape, setEtape] = useState<EtapeSuivi | 'relance' | ''>('');
  // Heure figée au premier rendu (relances « du jour ») : pas d'appel à Date.now pendant le rendu.
  const [maintenant] = useState(() => Date.now());
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const compte = compterDemandesPro(liste);
  const etapes = compterEtapes(liste, maintenant);
  const affichees = filtrerDemandesPro(liste, { q }).filter((d) =>
    etape === 'relance' ? aRelancer(d, maintenant) : !etape || d.suivi.etape === etape,
  );
  const filtres: { cle: EtapeSuivi | 'relance' | ''; libelle: string; n: number }[] = [
    { cle: '', libelle: 'Toutes', n: liste.length },
    { cle: 'relance', libelle: 'À relancer', n: etapes.relance },
    ...ETAPES_SUIVI.map((e) => ({ cle: e, libelle: LIBELLES_ETAPE[e], n: etapes[e] })),
  ];

  const agir = async (d: DemandePro, action: ActionCarte) => {
    setEnCours(d.demandeId);
    setErreur(null);
    const r =
      action === 'prendre'
        ? await posterJson<null>('/api/pro/demandes/prendre', { demandeId: d.demandeId })
        : await posterJson<unknown>('/api/pro/demandes/repondre', {
            demandeId: d.demandeId,
            action,
          });
    if (!r.ok) setErreur(r.message);
    await recharger();
    setEnCours(null);
  };

  return (
    <div className="grid gap-5">
      <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 md:grid-cols-4">
        {CARTES.map((c) => (
          <li
            key={c.cle}
            className="grid gap-1 rounded-[14px] border border-trait p-4 data-[fort=true]:border-accent-300 data-[fort=true]:bg-accent-100"
            data-fort={c.cle === 'nouveau' && compte.nouveau > 0}
          >
            <span className="text-sm font-semibold text-neutre-800">{c.libelle}</span>
            <span className="text-[30px] leading-none font-bold">{compte[c.cle]}</span>
            <span className="text-[13px] text-neutre-800">{c.note}</span>
          </li>
        ))}
      </ul>
      <Field label="Rechercher">
        <Input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Nom, projet, ville…"
        />
      </Field>
      {/* Filtre par étape du suivi (façon CRM), avec le nombre de demandes de chaque étape. */}
      <div role="group" aria-label="Étapes du suivi" className="flex flex-wrap gap-2">
        {filtres
          .filter((f) => f.cle === '' || f.cle === etape || f.n > 0)
          .map((f) => (
            <button
              key={f.cle || 'toutes'}
              type="button"
              aria-pressed={etape === f.cle}
              onClick={() => setEtape(f.cle)}
              className={cn(
                'inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-pill border px-3.5 text-sm font-semibold',
                etape === f.cle
                  ? 'border-accent bg-accent text-blanc'
                  : f.cle === 'relance'
                    ? 'border-accent-300 bg-accent-100 text-accent-800'
                    : 'border-trait bg-blanc text-neutre-800 hover:border-neutre-500',
              )}
            >
              {f.libelle}
              <span aria-hidden="true" className="tabular-nums opacity-80">
                {f.n}
              </span>
              <span className="sr-only">({f.n})</span>
            </button>
          ))}
      </div>
      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
      <p className="m-0 text-sm text-neutre-800" aria-live="polite">
        {affichees.length} demande{affichees.length > 1 ? 's' : ''} affichée
        {affichees.length > 1 ? 's' : ''}
      </p>
      {affichees.length ? (
        <ul aria-label="Demandes reçues" className="m-0 grid list-none gap-3 p-0">
          {affichees.map((d) => (
            <CarteDemandePro
              key={d.demandeId}
              d={d}
              uid={uid}
              peutDevis={peutDevis}
              enCours={enCours === d.demandeId}
              agir={(a) => agir(d, a)}
              recharger={recharger}
            />
          ))}
        </ul>
      ) : (
        <EmptyState titre={liste.length ? 'Aucune demande ne correspond' : 'Pas encore de demande'}>
          {liste.length
            ? 'Modifiez la recherche ou l’étape choisie.'
            : 'Les demandes des particuliers de votre zone apparaîtront ici dès leur arrivée, sans recharger la page.'}
        </EmptyState>
      )}
    </div>
  );
}
