'use client';

import { demandesRecentes, RAYON_ZONE, statutZone } from '@ph/core/onboarding';
import { Banner, Combobox, type OptionCombobox } from '@ph/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { posterJson } from '@/lib/posterJson';
import { ActiviteSecteur, DemandesRecentes } from './ActiviteSecteur';
import { BarreEtape } from './BarreEtape';
import { CadreInscription } from './CadreInscription';
import { CarteZone } from './CarteZone';
import { useLieux, type Lieu } from './useLieux';

/**
 * Étape 2 (maquette Onboarding Etape 2) : ville proposée d'office d'après le code postal de l'étape 1
 * (modifiable), rayon au curseur de 10 à 100 km, demandes récentes de la zone (phrase fixe).
 */
export function EtapeZone({
  zoneInitiale,
  base,
}: {
  /** Demandes du mois à 30 km (métiers de l'artisan) et couverture du modèle, pour le nombre affiché. */
  base: {
    metiers: string[];
    mensuel30: number | null;
    couverture: Readonly<Record<string, number>>;
  };
  zoneInitiale?: { ville: string; codePostal?: string; centre: Lieu['centre']; rayonKm: number };
}) {
  const router = useRouter();
  const [saisie, setSaisie] = useState(zoneInitiale?.ville ?? '');
  const [lieu, setLieu] = useState<Lieu | null>(
    zoneInitiale
      ? {
          nom: zoneInitiale.ville,
          codePostal: zoneInitiale.codePostal ?? '',
          centre: zoneInitiale.centre,
        }
      : null,
  );
  const [rayon, setRayon] = useState<number>(zoneInitiale?.rayonKm ?? RAYON_ZONE.defaut);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const s = statutZone({ ville: lieu?.nom, rayonKm: rayon });
  // Autre ville choisie : base relue pour son département (même calcul que /pro, cache 6 h).
  const [mensuel30, setMensuel30] = useState(base.mensuel30);
  const cp = lieu?.codePostal;
  useEffect(() => {
    if (!cp || cp === zoneInitiale?.codePostal) return;
    let actif = true;
    void fetch(`/api/stats/demandes?cp=${cp}&metiers=${base.metiers.join(',')}&rayon=30`)
      .then((r) => r.json() as Promise<{ total: number | null }>)
      .then((d) => actif && setMensuel30(d.total))
      .catch(() => undefined);
    return () => {
      actif = false;
    };
  }, [cp, zoneInitiale?.codePostal, base.metiers]);
  const zoneAffichee = lieu
    ? {
        ville: lieu.nom,
        rayonKm: rayon,
        nombre: demandesRecentes({ mensuel30, rayonKm: rayon, couverture: base.couverture }),
      }
    : null;
  const options = useLieux(saisie, lieu?.nom);

  const envoyer = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!lieu) return;
    setEnCours(true);
    const r = await posterJson<null>('/api/pro/inscription/zone', {
      ville: lieu.nom,
      ...(lieu.codePostal ? { codePostal: lieu.codePostal } : {}),
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
    <CadreInscription etape={2} aside={<ActiviteSecteur zone={zoneAffichee} />}>
      <form id="form-zone" onSubmit={envoyer} className="grid gap-5">
        <div>
          <h1 className="m-0 mb-2 text-[clamp(26px,3vw,34px)] leading-[1.12]">
            Où voulez-vous recevoir vos <span className="accent-editorial">chantiers</span> ?
          </h1>
          <p className="m-0 text-[15px] leading-[23px] text-neutre-800">
            Vérifiez votre ville et réglez votre rayon d&apos;intervention.
          </p>
        </div>
        {/* Téléphone : la phrase des demandes récentes avant la carte, visible sans défiler. */}
        <div className="md:hidden">
          <DemandesRecentes zone={zoneAffichee} compact />
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
