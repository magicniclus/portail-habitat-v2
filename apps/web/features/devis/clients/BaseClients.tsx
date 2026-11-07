'use client';

import type { ClientCarnet } from '@ph/firebase/devis';
import { Banner, Button, ConfirmDialog, EmptyState, Feuille, Input } from '@ph/ui';
import { MagnifyingGlassIcon, PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { posterJson } from '@/lib/posterJson';
import { filtrerClients } from './filtrerClients';
import { FormulaireClient } from './FormulaireClient';

const icone =
  'grid size-11 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-neutre-800 hover:bg-neutre-100 focus-visible:outline-2 focus-visible:outline-accent';

const resume = (c: ClientCarnet) =>
  [
    c.typeClient === 'pro' ? 'Professionnel' : 'Particulier',
    [c.codePostal, c.ville].filter(Boolean).join(' '),
    c.email,
  ]
    .filter(Boolean)
    .join(' · ');

/** Onglet Clients : la base clients des devis et factures (recherche, ajout, fiche, suppression). */
export function BaseClients({
  clients,
  peutGerer,
}: {
  clients: ClientCarnet[];
  peutGerer: boolean;
}) {
  const router = useRouter();
  const [recherche, setRecherche] = useState('');
  const [fiche, setFiche] = useState<ClientCarnet | 'nouveau' | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const visibles = filtrerClients(clients, recherche);
  const fini = () => {
    setFiche(null);
    router.refresh();
  };
  const supprimer = async (c: ClientCarnet) => {
    setErreur(null);
    const r = await posterJson<{ id: string }>('/api/pro/clients', {
      action: 'supprimer',
      id: c.id,
    });
    if (!r.ok) return setErreur(r.message);
    router.refresh();
  };

  return (
    <section aria-label="Clients" className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-0 flex-[1_1_260px]">
          <span className="sr-only">Rechercher un client</span>
          <MagnifyingGlassIcon
            size={18}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-neutre-700"
          />
          <Input
            type="search"
            placeholder="Rechercher un client…"
            value={recherche}
            onChange={(x) => setRecherche(x.target.value)}
            className="pl-10"
          />
        </label>
        {peutGerer ? <Button onClick={() => setFiche('nouveau')}>Ajouter un client</Button> : null}
      </div>
      {erreur ? (
        <div role="alert">
          <Banner tone="danger">{erreur}</Banner>
        </div>
      ) : null}
      {!clients.length ? (
        <EmptyState titre="Aucun client enregistré">
          Ajoutez vos clients ici, ou cochez « Enregistrer ce client dans ma base » dans un devis.
        </EmptyState>
      ) : (
        <ul className="m-0 grid list-none gap-2 p-0" aria-label="Base clients">
          {visibles.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-3 rounded-[12px] border border-trait bg-blanc px-4 py-2"
            >
              <span className="grid min-w-0 flex-1">
                <strong className="truncate font-semibold">{c.nom}</strong>
                <span className="truncate text-sm text-neutre-700">{resume(c)}</span>
              </span>
              {peutGerer ? (
                <>
                  <button
                    type="button"
                    aria-label={`Modifier ${c.nom}`}
                    onClick={() => setFiche(c)}
                    className={icone}
                  >
                    <PencilSimpleIcon size={20} aria-hidden="true" />
                  </button>
                  <ConfirmDialog
                    titre={`Supprimer ${c.nom} ?`}
                    libelleConfirmer="Supprimer"
                    danger
                    onConfirmer={() => supprimer(c)}
                    declencheur={
                      <button type="button" aria-label={`Supprimer ${c.nom}`} className={icone}>
                        <TrashIcon size={20} aria-hidden="true" />
                      </button>
                    }
                  >
                    La fiche disparaît de votre base. Les devis et factures déjà faits gardent ce
                    client.
                  </ConfirmDialog>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <Feuille
        open={fiche !== null}
        onOpenChange={(o) => (o ? undefined : setFiche(null))}
        titre={fiche === 'nouveau' ? 'Nouveau client' : 'Fiche client'}
      >
        {fiche ? (
          <FormulaireClient
            key={fiche === 'nouveau' ? 'n' : fiche.id}
            client={fiche === 'nouveau' ? undefined : fiche}
            onFini={fini}
          />
        ) : null}
      </Feuille>
    </section>
  );
}
