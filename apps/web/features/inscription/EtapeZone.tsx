'use client';

import { statutZone } from '@ph/core/onboarding';
import { Banner, Combobox, type OptionCombobox } from '@ph/ui';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { libelleSource, useDemandesEstimees } from '@/features/pro/useDemandesEstimees';
import { posterJson } from '@/lib/posterJson';
import { BarreEtape } from './BarreEtape';
import { useLieux, type Lieu } from './useLieux';

const RAYONS = [30, 50, 100] as const;

/** Étape 2 (maquette Onboarding Etape 2) : ville, rayon, estimation des demandes du secteur. */
export function EtapeZone({
  metiers,
  nomMetier,
  zoneInitiale,
}: {
  metiers: string[];
  nomMetier: string;
  zoneInitiale?: { ville: string; centre: Lieu['centre']; rayonKm: number };
}) {
  const router = useRouter();
  const [saisie, setSaisie] = useState(zoneInitiale?.ville ?? '');
  const [lieu, setLieu] = useState<Lieu | null>(
    zoneInitiale ? { nom: zoneInitiale.ville, codePostal: '', centre: zoneInitiale.centre } : null,
  );
  const [rayon, setRayon] = useState<number>(zoneInitiale?.rayonKm ?? 30);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const estimation = useDemandesEstimees(lieu?.codePostal ?? '', metiers, rayon);
  const s = statutZone({ ville: lieu?.nom, rayonKm: rayon });
  const options = useLieux(saisie, lieu?.nom);

  const envoyer = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!lieu) return;
    setEnCours(true);
    const r = await posterJson<null>('/api/pro/inscription/zone', {
      ville: lieu.nom,
      centre: lieu.centre,
      rayonKm: rayon,
    });
    setEnCours(false);
    if (!r.ok) return setErreur(r.message);
    router.push('/pro/inscription/compte' as Parameters<typeof router.push>[0]);
  };

  const choisir = (o: OptionCombobox) => {
    const l = options.find((x) => `${x.nom}-${x.codePostal}` === o.id);
    if (!l) return;
    setLieu(l);
    setSaisie(l.nom);
  };

  return (
    <form id="form-zone" onSubmit={envoyer} className="grid gap-5">
      <div>
        <h1 className="m-0 mb-2 text-[clamp(28px,3.4vw,38px)] leading-[1.08]">
          Où voulez-vous recevoir vos <span className="accent-editorial">chantiers</span> ?
        </h1>
        <p className="m-0 text-base text-neutre-800">
          Indiquez votre ville et votre rayon d&apos;intervention : une estimation des demandes de
          ce secteur s&apos;affiche tout de suite.
        </p>
      </div>
      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
      <Combobox
        label="Votre ville"
        valeur={saisie}
        onValeurChange={(t) => {
          setSaisie(t);
          if (lieu && t !== lieu.nom) setLieu(null);
        }}
        options={options.map((l) => ({
          id: `${l.nom}-${l.codePostal}`,
          libelle: l.nom,
          complement: l.codePostal,
        }))}
        onSelection={choisir}
        placeholder="Mérignac, 33700…"
      />
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-2 p-0 text-[15px] font-semibold">Rayon d&apos;intervention</legend>
        <div className="flex flex-wrap gap-2">
          {RAYONS.map((r) => (
            <label
              key={r}
              className="inline-flex min-h-11 cursor-pointer items-center rounded-pill border border-trait px-4 text-sm font-semibold has-checked:border-accent has-checked:bg-accent has-checked:text-blanc has-focus-visible:outline-2 has-focus-visible:outline-accent"
            >
              <input
                type="radio"
                name="rayon"
                value={r}
                checked={rayon === r}
                onChange={() => setRayon(r)}
                className="sr-only"
              />
              {r} km
            </label>
          ))}
        </div>
      </fieldset>
      <section aria-live="polite" className="rounded-[14px] bg-accent-100 p-4.5">
        {lieu && estimation?.total ? (
          <p className="m-0 text-[17px] leading-[26px] text-accent-900">
            <strong>
              ≈ {estimation.total} demandes {libelleSource(estimation)}
            </strong>{' '}
            ce mois-ci pour un {nomMetier.toLowerCase()} à {lieu.nom}, dans un rayon de {rayon} km.
          </p>
        ) : (
          <p className="m-0 text-[15px] text-neutre-800">
            Choisissez votre ville pour découvrir l&apos;activité de votre secteur.
          </p>
        )}
        {estimation?.source === 'modele' && lieu ? (
          <p className="m-0 mt-2 text-[13px] text-neutre-700">
            Estimation basée sur la population de la zone, la saison et la part de votre métier ;
            remplacée par le décompte réel dès 3 mois d&apos;historique.
          </p>
        ) : null}
      </section>
      <BarreEtape
        etape="Étape 2 sur 3 · Votre zone"
        statut={s.statut}
        complete={s.complete}
        libelle="Étape suivante"
        formulaire="form-zone"
        enCours={enCours}
      />
    </form>
  );
}
