'use client';

import { normaliser } from '@ph/core/recherche';
import { bouton, Field, Input } from '@ph/ui';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { routes } from '@/lib/routes';
import { initiales } from '@ph/core/format';
import { resumeNote, type ArtisanAvis } from './types';

/** Étape 1 : retrouver l'artisan (nom, ville ou métier). */
export function ChoixArtisan({ onChoisir }: { onChoisir: (a: ArtisanAvis) => void }) {
  const [q, setQ] = useState('');
  const [artisans, setArtisans] = useState<ArtisanAvis[] | null>(null);

  useEffect(() => {
    let actif = true;
    void fetch('/api/avis/artisans')
      .then((r) => r.json() as Promise<{ artisans: ArtisanAvis[] }>)
      .then((d) => actif && setArtisans(d.artisans))
      .catch(() => actif && setArtisans([]));
    return () => {
      actif = false;
    };
  }, []);

  const nq = normaliser(q);
  const liste = (artisans ?? [])
    .filter((a) => nq.length < 2 || normaliser(`${a.nom} ${a.ville} ${a.metier}`).includes(nq))
    .slice(0, 20);

  return (
    <div>
      <h1 className="m-0 mb-3 max-w-[24ch] text-[clamp(30px,3.8vw,44px)] leading-[1.08]">
        Votre avis aide le prochain <span className="accent-editorial">particulier</span> à bien
        choisir
      </h1>
      <p className="m-0 mb-7 max-w-[58ch] text-[17.5px] leading-7 text-neutre-800">
        Retrouvez l&apos;artisan qui a réalisé vos travaux. Deux minutes suffisent : une note,
        quelques détails, et votre avis est vérifié avant publication.
      </p>
      <div className="mb-5 rounded-[16px] bg-blanc p-[clamp(20px,3vw,30px)] shadow-md">
        <Field label="Nom de l’entreprise, de l’artisan, ville ou métier">
          <Input
            type="search"
            autoComplete="off"
            enterKeyHint="search"
            placeholder="Ex. Bertrand Rénovation, Mérignac, plombier…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="min-h-[52px]"
          />
        </Field>
        <p className="m-0 mt-3.5 text-sm text-neutre-800">
          Vous ne trouvez pas l&apos;entreprise ?{' '}
          <Link href={routes.aideSujet('ajout-artisan')}>Signalez-la nous</Link> et nous créons la
          fiche.
        </p>
      </div>
      <p className="m-0 mb-3.5 text-[14.5px] font-semibold text-neutre-800" aria-live="polite">
        {artisans === null
          ? 'Chargement des artisans…'
          : `${liste.length} artisan${liste.length > 1 ? 's' : ''} trouvé${liste.length > 1 ? 's' : ''}`}
      </p>
      <ul className="m-0 grid list-none gap-3.5 p-0">
        {liste.map((a) => (
          <li
            key={a.id}
            className="flex flex-wrap items-center gap-4 rounded-[14px] bg-blanc p-4.5 shadow-sm"
          >
            <span
              aria-hidden="true"
              className="grid size-[58px] flex-none place-items-center rounded-[14px] bg-accent-100 text-[19px] font-bold text-accent-700"
            >
              {initiales(a.nom)}
            </span>
            <span className="flex min-w-0 flex-[1_1_220px] flex-col gap-1">
              <strong className="text-[18.5px]">{a.nom}</strong>
              <span className="text-[14.5px] text-neutre-800">{a.metier}</span>
              <span className="text-sm text-neutre-700">
                {a.ville} ·{' '}
                <span aria-hidden="true" className="text-etoile">
                  ★
                </span>{' '}
                {resumeNote(a)}
              </span>
            </span>
            <button type="button" onClick={() => onChoisir(a)} className={bouton()}>
              Laisser un avis<span className="sr-only"> sur {a.nom}</span>
            </button>
          </li>
        ))}
      </ul>
      {artisans !== null && liste.length === 0 ? (
        <div className="rounded-[14px] bg-blanc p-6 text-center">
          <p className="m-0 mb-2 text-[17px] font-semibold">
            Aucune entreprise ne correspond à « {q} »
          </p>
          <p className="m-0 mb-4 text-[15px] text-neutre-800">
            Essayez le nom exact de l&apos;entreprise ou la ville figurant sur votre devis.
          </p>
          <Link
            href={routes.aideSujet('ajout-artisan')}
            className={bouton({ variant: 'secondaire' })}
          >
            Demander l&apos;ajout d&apos;un artisan
          </Link>
        </div>
      ) : null}
    </div>
  );
}
