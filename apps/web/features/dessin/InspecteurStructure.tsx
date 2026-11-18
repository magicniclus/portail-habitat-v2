'use client';

import {
  alertesEscaliers,
  CATALOGUE_OUVERTURES,
  LIBELLES_ESCALIER,
  zonesCoulissement,
  type Escalier,
  type ModificationOuverture,
  type Ouverture,
  type TypeEscalier,
} from '@ph/core/dessin';
import { ArrowArcLeftIcon, ArrowArcRightIcon } from '@phosphor-icons/react';
import { Banner, Button, Field, Input, Select } from '@ph/ui';
import { useState, type Dispatch } from 'react';
import type { Action } from './etat';
import { InspecteurMenuiserie } from './InspecteurMenuiserie';

const enCm = (mm: number) => String(Math.round(mm / 10));
const versMm = (cm: string) => {
  const v = Number(cm.replace(',', '.'));
  return Number.isFinite(v) && v >= 0 ? Math.round(v * 10) : null;
};

/** Champ en centimètres, appliqué à la sortie du champ ou avec Entrée. */
function ChampCm({
  label,
  valeur,
  appliquer,
}: {
  label: string;
  valeur: number;
  appliquer: (mm: number) => void;
}) {
  const [saisie, setSaisie] = useState(enCm(valeur));
  const valider = () => {
    const mm = versMm(saisie);
    if (mm !== null && mm !== valeur) appliquer(mm);
  };
  return (
    <form
      onSubmit={(ev) => {
        ev.preventDefault();
        valider();
      }}
    >
      <Field label={label}>
        <Input
          inputMode="decimal"
          value={saisie}
          onChange={(ev) => setSaisie(ev.target.value)}
          onBlur={valider}
        />
      </Field>
    </form>
  );
}

const Titre = ({ sur, titre }: { sur: string; titre: string }) => (
  <div>
    <p className="m-0 text-xs font-bold tracking-wide text-neutre-700 uppercase">{sur}</p>
    <h2 className="m-0 text-xl font-bold">{titre}</h2>
  </div>
);

/** Porte ou fenêtre sélectionnée (DES-14) : dimensions, position, sens, côté. */
export function InspecteurOuverture({ o, dispatch }: { o: Ouverture; dispatch: Dispatch<Action> }) {
  const c = CATALOGUE_OUVERTURES[o.type];
  const modifier = (modif: ModificationOuverture) =>
    dispatch({ type: 'modifierOuverture', id: o.id, modif });
  return (
    <div className="grid gap-3.5">
      <Titre sur="Sélection" titre={c.libelle} />
      <div className="grid grid-cols-2 gap-2.5">
        <ChampCm
          label="Largeur (cm)"
          valeur={o.largeur}
          appliquer={(largeur) => modifier({ largeur })}
        />
        <ChampCm
          label="Hauteur (cm)"
          valeur={o.hauteur}
          appliquer={(hauteur) => modifier({ hauteur })}
        />
        <ChampCm
          label="Allège (cm)"
          valeur={o.allege}
          appliquer={(allege) => modifier({ allege })}
        />
        <ChampCm
          label="Depuis le coin (cm)"
          valeur={o.position}
          appliquer={(position) => modifier({ position })}
        />
      </div>
      {c.famille === 'porte' && !zonesCoulissement(o).length ? (
        <div className="flex flex-wrap gap-2">
          <Button
            taille="sm"
            variant="secondaire"
            onClick={() => modifier({ sens: o.sens === 'gauche' ? 'droite' : 'gauche' })}
          >
            Inverser le sens
          </Button>
          <Button
            taille="sm"
            variant="secondaire"
            onClick={() => modifier({ cote: o.cote === 'interieur' ? 'exterieur' : 'interieur' })}
          >
            Ouvrir de l’autre côté
          </Button>
        </div>
      ) : null}
      <InspecteurMenuiserie o={o} modifier={modifier} />
      <Button variant="secondaire" onClick={() => dispatch({ type: 'supprimerSelection' })}>
        Supprimer
      </Button>
    </div>
  );
}

/** Escalier sélectionné (DES-15) : type, dimensions, rotation, alertes de confort. */
export function InspecteurEscalier({ e, dispatch }: { e: Escalier; dispatch: Dispatch<Action> }) {
  const modifier = (
    modif: Partial<Pick<Escalier, 'type' | 'largeur' | 'hauteurAMonter' | 'rotation'>>,
  ) => dispatch({ type: 'modifierEscalier', id: e.id, modif });
  const alertes = alertesEscaliers({ escaliers: [e] });
  return (
    <div className="grid gap-3.5">
      <Titre sur="Sélection" titre="Escalier" />
      <Field label="Type">
        <Select
          value={e.type}
          onChange={(ev) => modifier({ type: ev.target.value as TypeEscalier })}
        >
          {(Object.keys(LIBELLES_ESCALIER) as TypeEscalier[]).map((t) => (
            <option key={t} value={t}>
              {LIBELLES_ESCALIER[t]}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-2.5">
        <ChampCm
          label="Largeur (cm)"
          valeur={e.largeur}
          appliquer={(largeur) => modifier({ largeur })}
        />
        <ChampCm
          label="Hauteur à monter (cm)"
          valeur={e.hauteurAMonter}
          appliquer={(hauteurAMonter) => modifier({ hauteurAMonter })}
        />
      </div>
      <dl className="m-0 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg bg-neutre-100 px-2.5 py-2">
          <dt className="text-neutre-700">Marches</dt>
          <dd className="m-0 font-bold">{e.nbMarches}</dd>
        </div>
        <div className="rounded-lg bg-neutre-100 px-2.5 py-2">
          <dt className="text-neutre-700">Giron</dt>
          <dd className="m-0 font-bold">{enCm(e.giron)} cm</dd>
        </div>
      </dl>
      {alertes.map((a) => (
        <Banner key={a.code} tone="attention">
          {a.message}
        </Banner>
      ))}
      <div className="flex gap-2">
        <Button
          taille="sm"
          variant="secondaire"
          onClick={() => modifier({ rotation: e.rotation - 900 })}
        >
          <ArrowArcLeftIcon aria-hidden="true" /> Pivoter
        </Button>
        <Button
          taille="sm"
          variant="secondaire"
          onClick={() => modifier({ rotation: e.rotation + 900 })}
        >
          Pivoter <ArrowArcRightIcon aria-hidden="true" />
        </Button>
      </div>
      <Button variant="secondaire" onClick={() => dispatch({ type: 'supprimerSelection' })}>
        Supprimer
      </Button>
    </div>
  );
}
