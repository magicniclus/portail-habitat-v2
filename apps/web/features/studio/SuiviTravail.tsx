'use client';

import {
  estEtapeSuivie,
  etapeBloquee,
  etapesFabrication,
  ETAPES_SUIVI,
  LIBELLES_STATUT_STUDIO,
  type StatutProjetStudio,
} from '@ph/core/studio';
import { Banner, Button } from '@ph/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { relancer } from './actions';

const duree = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`;
};

/**
 * Étape 3 : où en est la vidéo. Étape en cours expliquée (ce qui se passe, depuis quand, durée
 * habituelle), page relue toutes les 5 s, « Relancer » en cas d'échec ou d'étape bloquée. Pendant
 * ce temps, on peut quitter la page : la pastille de la coque suit la vidéo.
 */
export function SuiviTravail({
  projetId,
  priseId,
  statut,
  depuis,
  erreur,
}: {
  projetId: string;
  priseId: string;
  statut: StatutProjetStudio;
  /** Dernière activité du projet (ms). */
  depuis: number;
  erreur: string | null;
}) {
  const router = useRouter();
  const [maintenant, setMaintenant] = useState(depuis);
  const [message, setMessage] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const etapes = etapesFabrication(priseId);
  const courant = etapes.indexOf(statut);
  const actif = estEtapeSuivie(statut);
  const bloquee = etapeBloquee(statut, depuis, maintenant);

  useEffect(() => {
    if (!actif) return;
    const tic = () => setMaintenant(Date.now());
    const premier = setTimeout(tic, 0);
    const horloge = setInterval(tic, 1_000);
    const relire = setInterval(() => router.refresh(), 5_000);
    return () => {
      clearTimeout(premier);
      clearInterval(horloge);
      clearInterval(relire);
    };
  }, [actif, router]);

  const relance = () =>
    demarrer(async () => {
      const r = await relancer({ projetId });
      setMessage(r.ok ? null : r.message);
    });

  return (
    <section
      aria-labelledby="suivi-studio"
      className="grid gap-3 rounded-card border border-trait bg-blanc p-4"
    >
      <h2 id="suivi-studio" className="m-0 text-lg">
        3. Fabrication
      </h2>
      <ol className="m-0 flex list-none flex-wrap gap-2 p-0">
        {etapes.map((e, i) => (
          <li
            key={e}
            aria-current={i === courant ? 'step' : undefined}
            className={`rounded-full px-3 py-1.5 text-sm ${i < courant || statut === 'pret' ? 'bg-succes-fond text-succes' : i === courant ? 'bg-accent-100 font-semibold text-accent-800' : 'bg-neutre-100 text-neutre-700'}`}
          >
            {i < courant || statut === 'pret' ? '✓ ' : ''}
            {LIBELLES_STATUT_STUDIO[e]}
          </li>
        ))}
      </ol>
      {actif ? (
        <div className="grid gap-2 rounded-card bg-neutre-100 p-3">
          <p className="m-0 font-semibold" aria-live="polite">
            {LIBELLES_STATUT_STUDIO[statut]} en cours
          </p>
          <p className="m-0 text-sm">{ETAPES_SUIVI[statut].explication}</p>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-neutre-200"
            role="progressbar"
            aria-label={`${LIBELLES_STATUT_STUDIO[statut]} en cours`}
            aria-valuetext={`depuis ${duree(maintenant - depuis)}`}
          >
            <div className="h-full w-1/3 rounded-full bg-accent motion-safe:animate-[va-et-vient_1.6s_ease-in-out_infinite]" />
          </div>
          <p className="m-0 text-sm text-neutre-700">
            Depuis {duree(maintenant - depuis)} · d’habitude {ETAPES_SUIVI[statut].habituel}. Vous
            pouvez quitter cette page : une pastille en bas à droite suit la vidéo.
          </p>
        </div>
      ) : null}
      {bloquee ? (
        <Banner tone="attention" titre="C’est plus long que d’habitude">
          L’étape semble bloquée (page fermée pendant le travail, ou service indisponible). Vous
          pouvez la relancer.
        </Banner>
      ) : null}
      {statut === 'erreur' ? (
        <Banner tone="danger" titre="Une étape a échoué">
          {erreur}
        </Banner>
      ) : null}
      {message ? <Banner tone="danger">{message}</Banner> : null}
      {statut === 'erreur' || bloquee ? (
        <div>
          <Button disabled={enCours} onClick={relance}>
            {bloquee ? 'Relancer cette étape' : 'Relancer'}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
