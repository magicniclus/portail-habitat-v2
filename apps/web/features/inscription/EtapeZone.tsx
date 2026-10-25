'use client';

import { intensiteZone, statutZone } from '@ph/core/onboarding';
import { Banner, Combobox, type OptionCombobox } from '@ph/ui';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { libelleSource, useDemandesEstimees } from '@/features/pro/useDemandesEstimees';
import { posterJson } from '@/lib/posterJson';
import { BarreEtape } from './BarreEtape';
import { CadreInscription } from './CadreInscription';
import { CarteZone } from './CarteZone';
import { useLieux, type Lieu } from './useLieux';

const SURTITRE = 'm-0 text-xs font-bold tracking-[0.08em] text-accent-700 uppercase';

/** Étape 2 (maquette Onboarding Etape 2) : ville sur la carte, rayon, estimation des demandes du secteur. */
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
  const total = lieu ? (estimation?.total ?? null) : null;

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
    <CadreInscription
      etape={2}
      aside={
        <>
          <div aria-live="polite">
            <p className={`${SURTITRE} mb-2.5`}>L&apos;activité de votre secteur</p>
            {lieu && total ? (
              <>
                <h2 className="m-0 mb-2.5 text-[clamp(22px,2.4vw,28px)] leading-[1.18] font-normal">
                  <strong>
                    ≈ {total} demandes {libelleSource(estimation!)}
                  </strong>{' '}
                  ce mois-ci pour un {nomMetier.toLowerCase()} à {lieu.nom}, dans un rayon de{' '}
                  {rayon} km.
                </h2>
                <p className="m-0 inline-flex items-center gap-2 rounded-pill bg-blanc px-3 py-1.5 text-sm font-semibold text-accent-700">
                  <span aria-hidden="true" className="size-2 rounded-full bg-accent" />
                  {intensiteZone(total)}
                </p>
              </>
            ) : (
              <>
                <h2 className="m-0 mb-2.5 text-[clamp(22px,2.4vw,28px)] leading-[1.18]">
                  Des demandes déposées chaque jour, partout en France.
                </h2>
                <p className="m-0 text-[15px] leading-[23px] text-neutre-800">
                  Saisissez votre ville : nous affichons une estimation du nombre de demandes pour
                  votre métier dans votre rayon d&apos;intervention.
                </p>
              </>
            )}
          </div>
          <p className="m-0 text-[13px] leading-5 text-neutre-800">
            <strong>Transparence :</strong>{' '}
            {estimation?.source === 'reel'
              ? 'chiffres des 30 derniers jours pour votre métier et votre zone.'
              : 'estimation basée sur la population de la zone, la saison et la part de votre métier ; remplacée par le décompte réel dès 3 mois d’historique.'}{' '}
            Fond de carte ©{' '}
            <a href="https://www.openstreetmap.org/copyright" rel="noopener" target="_blank">
              OpenStreetMap
            </a>
          </p>
        </>
      }
    >
      <form id="form-zone" onSubmit={envoyer} className="grid gap-5">
        <div>
          <h1 className="m-0 mb-2 text-[clamp(26px,3vw,34px)] leading-[1.12]">
            Où voulez-vous recevoir vos <span className="accent-editorial">chantiers</span> ?
          </h1>
          <p className="m-0 text-[15px] leading-[23px] text-neutre-800">
            Indiquez votre ville et votre rayon d&apos;intervention : une estimation des demandes de
            ce secteur s&apos;affiche tout de suite.
          </p>
        </div>
        {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
        <CarteZone
          centre={lieu?.centre ?? null}
          rayon={rayon}
          onRayon={setRayon}
          recherche={
            <div className="relative">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
                className="pointer-events-none absolute top-[15px] left-3.5 z-10 text-neutre-700"
              >
                <circle cx="11" cy="11" r="6.5" />
                <path d="m16 16 4 4" />
              </svg>
              <Combobox
                label="Votre ville"
                labelMasque
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
                placeholder="Saisissez votre ville"
                className="[&_input]:rounded-[10px] [&_input]:border-2 [&_input]:border-accent [&_input]:pl-11 [&_input]:shadow-md"
              />
            </div>
          }
        />
        {lieu ? null : (
          <p className="m-0 text-sm leading-[22px] text-neutre-700">
            Choisissez votre ville sur la carte pour découvrir l&apos;activité de votre secteur.
          </p>
        )}
        <BarreEtape
          etape="Étape 2 sur 3 · Votre zone"
          statut={s.statut}
          complete={s.complete}
          libelle="Étape suivante →"
          formulaire="form-zone"
          enCours={enCours}
        />
      </form>
    </CadreInscription>
  );
}
