'use client';

import { filtrerPrestations } from '@ph/core/simulateur';
import { Chip, ChipGroup, Field, Input } from '@ph/ui';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { routes } from '@/lib/routes';
import { Icone } from './Icone';
import type { CatalogueSimulateur, PrestationSimulateur } from './types';

/** Étape 1 : recherche, 15 familles et 112 prestations estimables (maquette). */
export function EtapePrestation({
  catalogue,
  rechercheInitiale,
  choisie,
  onChoisir,
}: {
  catalogue: CatalogueSimulateur;
  rechercheInitiale: string;
  choisie: string | null;
  onChoisir: (p: PrestationSimulateur) => void;
}) {
  const [cherche, setCherche] = useState(rechercheInitiale);
  const [famille, setFamille] = useState('toutes');
  const [moteur, setMoteur] = useState<{ q: string; ids: string[] }>({ q: '', ids: [] });

  // Moteur de recherche (≈ 16 Ko) chargé seulement si une recherche est saisie.
  useEffect(() => {
    if (cherche.trim().length < 2) return;
    let actif = true;
    void import('./moteur').then((m) => {
      if (actif) setMoteur({ q: cherche, ids: m.prestationsTrouvees(cherche) });
    });
    return () => {
      actif = false;
    };
  }, [cherche]);

  const ids = moteur.q === cherche ? moteur.ids : [];
  const base = filtrerPrestations(catalogue.prestations, cherche, ids, 'toutes');
  const liste = famille === 'toutes' ? base : base.filter((p) => p.famille === famille);
  const familles = [
    { id: 'toutes', nom: 'Toutes', n: base.length },
    ...catalogue.familles
      .map((f) => ({ ...f, n: base.filter((p) => p.famille === f.id).length }))
      .filter((f) => f.n > 0),
  ];
  const nomFamille = new Map(catalogue.familles.map((f) => [f.id, f.nom]));
  const n = liste.length;

  return (
    <div>
      <h1 className="m-0 mb-3 max-w-[22ch] text-[clamp(28px,3.6vw,42px)] leading-[1.08]">
        Quel type de travaux voulez-vous <span className="accent-editorial">estimer</span> ?
      </h1>
      <p className="m-0 mb-6 max-w-[56ch] text-[17px] leading-7 text-neutre-800">
        Les questions s&apos;adaptent ensuite au métier choisi : surfaces, nombre de prises, gamme
        d&apos;équipement… Comptez deux minutes.
      </p>
      <div className="mb-6 grid gap-3.5">
        <Field label="Rechercher un type de travaux ou un métier" className="max-w-[560px]">
          <Input
            type="search"
            autoComplete="off"
            enterKeyHint="search"
            placeholder="Ex. douche italienne, couvreur, pompe à chaleur…"
            value={cherche}
            onChange={(e) => {
              setCherche(e.target.value);
              setFamille('toutes');
            }}
            className="min-h-12 bg-blanc"
          />
        </Field>
        <ChipGroup libelle="Familles de travaux">
          {familles.map((f) => (
            <Chip key={f.id} selectionne={famille === f.id} onClick={() => setFamille(f.id)}>
              {f.nom} <span className="font-medium opacity-70">{f.n}</span>
            </Chip>
          ))}
        </ChipGroup>
        <p className="m-0 text-sm text-neutre-700" aria-live="polite">
          {n} type{n > 1 ? 's' : ''} de travaux estimable{n > 1 ? 's' : ''} en ligne
        </p>
      </div>
      {n === 0 ? (
        <div className="mb-4 max-w-[640px] rounded-[14px] bg-blanc p-5 shadow-sm">
          <p className="m-0 mb-1.5 text-[17px] font-bold">
            Aucun type de travaux ne correspond à « {cherche} »
          </p>
          <p className="m-0 text-[15px] leading-[23px] text-neutre-800">
            Essayez un mot plus court ou le nom du métier (plombier, couvreur, électricien…). Vous
            pouvez aussi <Link href={routes.accueil}>décrire votre projet librement</Link>.
          </p>
        </div>
      ) : null}
      <ul className="m-0 grid list-none gap-4 p-0 [grid-template-columns:repeat(auto-fill,minmax(min(100%,215px),1fr))]">
        {liste.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onChoisir(p)}
              aria-current={choisie === p.id ? 'true' : undefined}
              className="flex h-full w-full cursor-pointer flex-col gap-3 rounded-[14px] border-2 border-transparent bg-blanc p-5 text-left shadow-sm transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md aria-[current]:border-accent motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <Icone trace={p.icone} />
              <span>
                <span className="mb-1 block text-lg font-bold">{p.nom}</span>
                <span className="block text-sm leading-[21px] text-neutre-800">{p.pitch}</span>
              </span>
              <span className="mt-auto text-[13px] text-neutre-700">
                {nomFamille.get(p.famille)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
