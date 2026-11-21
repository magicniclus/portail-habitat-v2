'use client';

import {
  estEtapeSuivie,
  etapeBloquee,
  etapesFabrication,
  ETAPES_SUIVI,
  LIBELLES_STATUT_STUDIO,
  type StatutProjetStudio,
} from '@ph/core/studio';
import { Chargeur } from '@ph/ui';
import { useEffect, useState, useTransition } from 'react';
import { relancer } from './actions';

const duree = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`;
};

/**
 * Où en est la vidéo que Claude fabrique (panneau IA du Studio) : étapes, chargeur et durée
 * habituelle de l'étape en cours, « Relancer » si elle échoue ou semble bloquée. La page est
 * relue toutes les 5 s par `EcouteProjet` ; le montage de Claude arrive dans les pistes.
 */
export function FabricationIA(p: {
  projetId: string;
  priseId: string;
  statut: StatutProjetStudio;
  /** Dernière activité du projet (ms). */
  depuis: number;
  erreur: string | null;
}) {
  const [maintenant, setMaintenant] = useState(p.depuis);
  const [message, setMessage] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const etapes = etapesFabrication(p.priseId);
  const courant = etapes.indexOf(p.statut);
  const suivie = estEtapeSuivie(p.statut) ? ETAPES_SUIVI[p.statut] : null;
  const actif = suivie !== null;
  const bloquee = etapeBloquee(p.statut, p.depuis, maintenant);
  useEffect(() => {
    if (!actif) return;
    const tic = () => setMaintenant(Date.now());
    const premier = setTimeout(tic, 0);
    const horloge = setInterval(tic, 1_000);
    return () => {
      clearTimeout(premier);
      clearInterval(horloge);
    };
  }, [actif]);
  if (!actif && p.statut !== 'erreur') return null;
  return (
    <section
      aria-label="Fabrication par Claude"
      aria-busy={actif}
      className="grid gap-3 rounded-[10px] border border-montage-selection/40 bg-montage-surface p-3"
    >
      {suivie ? (
        <div className="flex items-center gap-3">
          <Chargeur taille="md" decoratif />
          <div className="min-w-0">
            <p className="m-0 font-semibold" aria-live="polite">
              {LIBELLES_STATUT_STUDIO[p.statut]} en cours…
            </p>
            <p className="m-0 text-xs text-montage-texte-doux">
              Depuis {duree(maintenant - p.depuis)} · d’habitude {suivie.habituel}
            </p>
          </div>
        </div>
      ) : null}
      {suivie ? <p className="m-0 text-xs text-montage-texte-doux">{suivie.explication}</p> : null}
      <ol className="m-0 flex list-none flex-wrap gap-1.5 p-0 text-xs">
        {etapes.map((e, i) => (
          <li
            key={e}
            aria-current={i === courant ? 'step' : undefined}
            className={`rounded-full px-2.5 py-1 ${i < courant ? 'bg-montage-survol text-montage-selection' : i === courant ? 'bg-montage-selection font-semibold text-montage-fond' : 'bg-montage-survol text-montage-texte-doux'}`}
          >
            {i < courant ? '✓ ' : ''}
            {LIBELLES_STATUT_STUDIO[e]}
          </li>
        ))}
      </ol>
      {p.statut === 'erreur' ? (
        <p role="alert" className="m-0 text-sm text-danger">
          Une étape a échoué : {p.erreur}
        </p>
      ) : null}
      {bloquee ? (
        <p className="m-0 text-sm">
          C’est plus long que d’habitude : l’étape semble bloquée. Vous pouvez la relancer.
        </p>
      ) : null}
      {message ? (
        <p role="alert" className="m-0 text-sm text-danger">
          {message}
        </p>
      ) : null}
      {p.statut === 'erreur' || bloquee ? (
        <button
          type="button"
          disabled={enCours}
          onClick={() =>
            demarrer(async () => {
              const r = await relancer({ projetId: p.projetId });
              setMessage(r.ok ? null : r.message);
            })
          }
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] bg-montage-selection px-3 text-sm font-bold text-montage-fond disabled:opacity-60"
        >
          {enCours ? <Chargeur taille="xs" ton="courant" decoratif /> : null}
          {bloquee ? 'Relancer cette étape' : 'Relancer'}
        </button>
      ) : null}
    </section>
  );
}
