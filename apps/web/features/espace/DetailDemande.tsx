'use client';

import { ETAPES_SUIVI, etapeSuivi } from '@ph/core/espace';
import { formatDate, formatFourchette } from '@ph/core/format';
import type { Resultat } from '@ph/core/resultat';
import type { DetailDemande as Detail } from '@ph/firebase/espace';
import { Banner, Skeleton } from '@ph/ui';
import { useCallback, useEffect, useState } from 'react';
import { chargerDemande } from './api';
import { ArtisansDemande } from './ArtisansDemande';
import { FilMessages } from './FilMessages';

type Etat =
  { etat: 'chargement' } | { etat: 'erreur'; message: string } | { etat: 'pret'; d: Detail };

const versEtat = (r: Resultat<Detail>): Etat =>
  r.ok
    ? { etat: 'pret', d: r.data }
    : {
        etat: 'erreur',
        message:
          r.code === 'INTROUVABLE'
            ? 'Cette demande est introuvable. Elle n’existe pas ou n’est pas rattachée à votre compte.'
            : r.message,
      };

/** Détail d'une demande : suivi, artisans et devis, messages (ESP-01 à 03). */
export function DetailDemande({ demandeId }: { demandeId: string }) {
  const [e, setE] = useState<Etat>({ etat: 'chargement' });
  const [artisanId, setArtisanId] = useState<string | null>(null);

  const recharger = useCallback(async () => {
    setE(versEtat(await chargerDemande(demandeId)));
  }, [demandeId]);

  useEffect(() => {
    let actif = true;
    void chargerDemande(demandeId).then((r) => actif && setE(versEtat(r)));
    return () => {
      actif = false;
    };
  }, [demandeId]);

  if (e.etat === 'chargement') return <Skeleton className="h-80" />;
  if (e.etat === 'erreur') return <Banner tone="danger">{e.message}</Banner>;
  const d = e.d;
  const etape = etapeSuivi(d.statut);
  const fil = d.artisans.find((a) => a.artisanId === artisanId) ?? d.artisans[0];

  return (
    <section
      aria-labelledby="titre-demande"
      className="grid min-w-0 gap-6 rounded-[16px] border border-trait p-[clamp(18px,2.5vw,28px)]"
    >
      <div>
        <p className="m-0 mb-1 text-[13px] font-bold tracking-[0.08em] text-accent-700 uppercase">
          {d.reference}
        </p>
        <h2 id="titre-demande" className="m-0 text-[clamp(22px,2.6vw,28px)] leading-[1.15]">
          {d.titre}
        </h2>
        <p className="m-0 mt-1.5 text-[15px] text-neutre-700">
          {d.ville} · envoyée le {formatDate(d.envoyeeLe)} · estimation{' '}
          {formatFourchette(d.estimation.minCentimes, d.estimation.maxCentimes)}
        </p>
      </div>

      <ol aria-label="Avancement" className="m-0 grid list-none grid-cols-4 gap-2 p-0">
        {ETAPES_SUIVI.map((libelle, k) => (
          <li
            key={libelle}
            aria-current={k === etape - 1 ? 'step' : undefined}
            className="flex flex-col gap-1.5"
          >
            <span
              aria-hidden="true"
              className={`h-1.5 rounded-pill ${k < etape ? 'bg-accent' : 'bg-neutre-200'}`}
            />
            <span
              className={`text-[13.5px] ${k === etape - 1 ? 'font-bold' : 'font-medium'} ${k < etape ? 'text-texte' : 'text-neutre-700'}`}
            >
              {libelle}
            </span>
          </li>
        ))}
      </ol>

      <ArtisansDemande artisans={d.artisans} etape={etape} onEcrire={setArtisanId} />
      {fil ? (
        <FilMessages
          demandeId={d.id}
          artisan={fil}
          messages={d.messages.filter((m) => m.artisanId === fil.artisanId)}
          onEnvoye={recharger}
        />
      ) : null}
    </section>
  );
}
