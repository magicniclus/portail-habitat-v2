'use client';

import { Button, Field, Select } from '@ph/ui';
import type { Dispatch, ReactNode } from 'react';
import { niveauDe, sceneDe, type Action, type EtatEditeur } from './etat';
import { ChampCm, ReglagesPiscine, ReglagesTerrasse } from './ReglagesExterieur';

type Genre = 'terrasse' | 'piscine' | 'cloture' | 'vegetal';
const titre = 'm-0 text-xs font-bold tracking-wide text-neutre-700 uppercase';

/** Inspecteur de l'extérieur (DES-18 à DES-20) : terrasse, piscine, clôture, végétal. */
export function inspecteurExterieur(etat: EtatEditeur, dispatch: Dispatch<Action>): ReactNode {
  const s = etat.selection;
  if (!s || !['terrasse', 'piscine', 'cloture', 'vegetal'].includes(s.genre)) return null;
  const genre = s.genre as Genre;
  const ext = niveauDe(etat).exterieur;
  const modifier = (modif: Record<string, unknown>) =>
    dispatch({ type: 'modifierExterieur', genre, id: s.id, modif });
  let corps: ReactNode = null;
  let nom = '';
  if (genre === 'terrasse') {
    const t = ext.terrasses.find((x) => x.id === s.id);
    if (!t) return null;
    nom = 'Terrasse';
    corps = <ReglagesTerrasse t={t} modifier={modifier} />;
  } else if (genre === 'piscine') {
    const p = ext.piscines.find((x) => x.id === s.id);
    if (!p) return null;
    nom = 'Piscine';
    const parcelle = sceneDe(etat).terrain?.parcelle;
    corps = <ReglagesPiscine p={p} parcelle={parcelle} modifier={modifier} />;
  } else if (genre === 'cloture') {
    const c = ext.clotures.find((x) => x.id === s.id);
    if (!c) return null;
    nom = 'Clôture';
    corps = (
      <>
        <Field label="Type">
          <Select value={c.type} onChange={(ev) => modifier({ type: ev.target.value })}>
            <option value="bois">Bois</option>
            <option value="grillage">Grillage</option>
            <option value="muret">Muret</option>
            <option value="haie">Haie</option>
            <option value="portail">Portail</option>
          </Select>
        </Field>
        <ChampCm
          key={`h${c.hauteur}`}
          label="Hauteur (cm)"
          mm={c.hauteur}
          appliquer={(hauteur) => modifier({ hauteur })}
        />
      </>
    );
  } else {
    const v = ext.vegetation.find((x) => x.id === s.id);
    if (!v) return null;
    nom = v.type === 'arbre' ? 'Arbre' : v.type === 'arbuste' ? 'Arbuste' : 'Haie';
    corps = (
      <ChampCm
        key={`d${v.diametre}`}
        label="Diamètre adulte (cm)"
        mm={v.diametre}
        appliquer={(diametre) => modifier({ diametre })}
      />
    );
  }
  return (
    <div className="grid gap-3.5" key={s.id}>
      <div>
        <p className={titre}>Sélection</p>
        <h2 className="m-0 text-xl font-bold">{nom}</h2>
      </div>
      {corps}
      <Button variant="secondaire" onClick={() => dispatch({ type: 'supprimerSelection' })}>
        Supprimer
      </Button>
    </div>
  );
}
