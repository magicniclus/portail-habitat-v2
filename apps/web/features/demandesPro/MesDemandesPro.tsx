'use client';

import {
  compterDemandesPro,
  ETATS_PRO,
  filtrerDemandesPro,
  LIBELLES_ETAT_PRO,
  type EtatPro,
} from '@ph/core/espace-pro';
import type { DemandePro } from '@ph/firebase/pro';
import { Banner, EmptyState, Field, Input, Select } from '@ph/ui';
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
}: {
  initiales: DemandePro[];
  artisanId: string;
  uid: string;
}) {
  const { liste, recharger } = useDemandesPro(initiales, artisanId);
  const [q, setQ] = useState('');
  const [etat, setEtat] = useState<EtatPro | ''>('');
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const compte = compterDemandesPro(liste);
  const affichees = filtrerDemandesPro(liste, { q, ...(etat ? { etat } : {}) });

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
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
        <Field label="Rechercher">
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nom, projet, ville…"
          />
        </Field>
        <Field label="État">
          <Select value={etat} onChange={(e) => setEtat(e.target.value as EtatPro | '')}>
            <option value="">Tous les états</option>
            {ETATS_PRO.map((e) => (
              <option key={e} value={e}>
                {LIBELLES_ETAT_PRO[e]}
              </option>
            ))}
          </Select>
        </Field>
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
              enCours={enCours === d.demandeId}
              agir={(a) => void agir(d, a)}
            />
          ))}
        </ul>
      ) : (
        <EmptyState titre={liste.length ? 'Aucune demande ne correspond' : 'Pas encore de demande'}>
          {liste.length
            ? 'Modifiez la recherche ou le filtre.'
            : 'Les demandes des particuliers de votre zone apparaîtront ici dès leur arrivée, sans recharger la page.'}
        </EmptyState>
      )}
    </div>
  );
}
