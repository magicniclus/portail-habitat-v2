'use client';

import {
  alertesEscaliers,
  formatLongueur,
  LIBELLES_ESCALIER,
  LIBELLES_MATERIAU_ESCALIER,
  LIBELLES_STRUCTURE_ESCALIER,
  type Escalier,
  type ModificationEscalier,
  type TypeEscalier,
} from '@ph/core/dessin';
import { ArrowArcLeftIcon, ArrowArcRightIcon } from '@phosphor-icons/react';
import { Banner, Button, IconButton } from '@ph/ui';
import { COULEURS_ESCALIER } from '@ph/ui/tokens';
import type { Dispatch } from 'react';
import { ApercuEscalier } from './ApercusEscalier';
import { ChampMesure } from './ChampMesure';
import type { Action } from './etat';
import { Section, Segmente, TitreSelection } from './blocs';

/** Noms courts des formes, sous leur vignette. */
const COURTS: Record<TypeEscalier, string> = {
  droit: 'Droit',
  quart_bas: '¼ en bas',
  quart_haut: '¼ en haut',
  deux_quarts: 'Demi-tour',
  helicoidal: 'Colimaçon',
  meunier: 'Meunier',
};

/**
 * Escalier sélectionné (DES-15), en sections : forme (vignettes), dimensions et marches qui en
 * découlent, structure et matériau (un clic), position. Alertes de confort et d'échappée.
 */
export function InspecteurEscalier({
  e,
  hauteurDessus,
  dispatch,
}: {
  e: Escalier;
  /** Hauteur sous plafond du niveau où l'escalier arrive : échappée (DES-15). */
  hauteurDessus: number | undefined;
  dispatch: Dispatch<Action>;
}) {
  const modifier = (modif: ModificationEscalier) =>
    dispatch({ type: 'modifierEscalier', id: e.id, modif });
  const alertes = alertesEscaliers({ escaliers: [e] }, hauteurDessus);
  const hMarche = Math.round(e.hauteurAMonter / e.nbMarches);
  const angle = ((Math.round(e.rotation / 10) % 360) + 360) % 360;
  return (
    <div className="grid gap-5">
      <TitreSelection titre={LIBELLES_ESCALIER[e.type]} />

      <Section titre="Forme">
        <div role="radiogroup" aria-label="Type" className="grid grid-cols-3 gap-1.5">
          {(Object.keys(LIBELLES_ESCALIER) as TypeEscalier[]).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={e.type === t}
              aria-label={LIBELLES_ESCALIER[t]}
              onClick={() => modifier({ type: t })}
              className={`grid cursor-pointer justify-items-center gap-1 rounded-[10px] border-2 p-1.5 text-xs font-semibold font-[inherit] text-texte transition-colors ${e.type === t ? 'border-accent bg-accent-100' : 'border-transparent bg-blanc hover:bg-neutre-100'}`}
            >
              <ApercuEscalier type={t} />
              {COURTS[t]}
            </button>
          ))}
        </div>
      </Section>

      <Section titre="Dimensions">
        <div className="grid grid-cols-2 gap-2.5">
          <ChampMesure
            label="Largeur (cm)"
            mm={e.largeur}
            appliquer={(largeur) => modifier({ largeur })}
          />
          <ChampMesure
            label="Hauteur (cm)"
            mm={e.hauteurAMonter}
            appliquer={(hauteurAMonter) => modifier({ hauteurAMonter })}
          />
        </div>
        <p className="m-0 rounded-lg bg-neutre-100 px-3 py-2 text-sm leading-5">
          <strong>{e.nbMarches} marches</strong> de {formatLongueur(hMarche, 'cm')} pour monter{' '}
          {formatLongueur(e.hauteurAMonter)}, giron {formatLongueur(e.giron, 'cm')}
          {alertes.length ? null : <span className="text-succes"> · confortable</span>}
        </p>
        {alertes.map((a) => (
          <Banner key={a.code} tone="attention">
            {a.message}
          </Banner>
        ))}
      </Section>

      <Section titre="Structure">
        <Segmente
          libelle="Dessous"
          valeur={e.structure}
          options={(Object.keys(LIBELLES_STRUCTURE_ESCALIER) as Escalier['structure'][]).map(
            (k) => ({ valeur: k, libelle: LIBELLES_STRUCTURE_ESCALIER[k] }),
          )}
          choisir={(structure) => modifier({ structure })}
        />
        <Segmente
          libelle="Matériau"
          valeur={e.materiau}
          options={(Object.keys(LIBELLES_MATERIAU_ESCALIER) as Escalier['materiau'][]).map((k) => ({
            valeur: k,
            libelle: LIBELLES_MATERIAU_ESCALIER[k],
            pastille: COULEURS_ESCALIER[k],
          }))}
          choisir={(materiau) => modifier({ materiau })}
        />
      </Section>

      <Section titre="Position">
        <div className="flex items-center justify-between rounded-[10px] bg-neutre-100 p-1">
          <IconButton
            aria-label="Pivoter à gauche"
            icone={<ArrowArcLeftIcon />}
            onClick={() => modifier({ rotation: e.rotation - 900 })}
          />
          <span className="text-sm font-semibold tabular-nums">Orientation {angle}°</span>
          <IconButton
            aria-label="Pivoter à droite"
            icone={<ArrowArcRightIcon />}
            onClick={() => modifier({ rotation: e.rotation + 900 })}
          />
        </div>
      </Section>

      <Button variant="secondaire" onClick={() => dispatch({ type: 'supprimerSelection' })}>
        Supprimer l’escalier
      </Button>
    </div>
  );
}
