'use client';

import { formatLongueur, distancesAuxLimites } from '@ph/core/dessin';
import { Banner, Button, Field, Input } from '@ph/ui';
import { useState, type Dispatch, type FormEvent } from 'react';
import { chargerParcelle, chercherAdresses, type EspaceDessin } from './api';
import { sceneDe, type Action, type EtatEditeur } from './etat';
import { RecalageParcelle } from './RecalageParcelle';

type Adresse = { libelle: string; lon: number; lat: number };

/**
 * Implantation (DES-35) : adresse → parcelle du cadastre et photo aérienne IGN, posées autour
 * de la maison ; la parcelle se recale (flèches, rotation) et le nord suit.
 */
export function ImplantationMenu({
  etat,
  dispatch,
  espace,
  planId,
}: {
  etat: EtatEditeur;
  dispatch: Dispatch<Action>;
  espace: EspaceDessin;
  planId: string;
}) {
  const scene = sceneDe(etat);
  const t = scene.terrain;
  const [texte, setTexte] = useState('');
  const [adresses, setAdresses] = useState<Adresse[] | null>(null);
  const [attente, setAttente] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const chercher = async (ev: FormEvent) => {
    ev.preventDefault();
    if (texte.trim().length < 3) return setErreur('Saisissez au moins 3 caractères.');
    setErreur(null);
    setAttente(true);
    const r = await chercherAdresses(espace, texte.trim());
    setAttente(false);
    if (!r.ok) return setErreur(r.message);
    setAdresses(r.data.adresses);
    if (!r.data.adresses.length) setErreur('Aucune adresse trouvée.');
  };
  const choisir = async (a: Adresse) => {
    setErreur(null);
    setAttente(true);
    const r = await chargerParcelle(espace, planId, a.lon, a.lat);
    setAttente(false);
    if (!r.ok) return setErreur(r.message);
    setAdresses(null);
    dispatch({ type: 'implanter', parcelle: r.data });
    dispatch({ type: 'ajuster' }); // la parcelle entière à l'écran
  };
  const cotes = distancesAuxLimites(scene);

  return (
    <div className="grid gap-4">
      <form onSubmit={(ev) => void chercher(ev)} className="grid gap-2">
        <Field label="Adresse du terrain" aide="France métropolitaine. Données publiques de l’IGN.">
          <Input
            value={texte}
            onChange={(ev) => setTexte(ev.target.value)}
            autoComplete="street-address"
            placeholder="12 rue des Lilas, Nantes"
          />
        </Field>
        <Button type="submit" disabled={attente}>
          {attente ? 'Recherche…' : 'Chercher la parcelle'}
        </Button>
      </form>
      {erreur ? <Banner tone="attention">{erreur}</Banner> : null}
      {adresses?.length ? (
        <ul className="m-0 grid list-none gap-1 p-0" aria-label="Adresses trouvées">
          {adresses.map((a) => (
            <li key={`${a.lon},${a.lat}`}>
              <button
                type="button"
                disabled={attente}
                onClick={() => void choisir(a)}
                className="min-h-11 w-full cursor-pointer rounded-[10px] border border-neutre-300 bg-blanc px-3 py-2 text-left text-sm hover:bg-neutre-100"
              >
                {a.libelle}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {t ? (
        <div className="grid gap-3">
          <p className="m-0 px-1 text-sm">
            {t.referenceCadastrale ? (
              <>
                Parcelle <strong>{t.referenceCadastrale}</strong>
                {t.orthophoto ? ', photo aérienne IGN en fond.' : '.'}
              </>
            ) : (
              'Parcelle dessinée à la main.'
            )}
          </p>
          <RecalageParcelle orientationNord={scene.orientationNord} dispatch={dispatch} />
          {cotes.length ? (
            <div className="grid gap-1 px-1" data-testid="distances-limites">
              <span className="text-[13px] font-semibold">Distances aux limites</span>
              <span className="text-sm">{cotes.map((c) => formatLongueur(c.d)).join(' · ')}</span>
            </div>
          ) : null}
        </div>
      ) : null}
      <p className="m-0 px-1 text-[13px] leading-5 text-neutre-800">
        Cadastre et photo aérienne : IGN, données publiques. Distances indicatives, ce n’est pas un
        avis d’urbanisme.
      </p>
    </div>
  );
}
