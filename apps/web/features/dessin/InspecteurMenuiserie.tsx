'use client';

import {
  CATALOGUE_OUVERTURES,
  LIBELLES_MATERIAU_MENUISERIE,
  LIBELLES_REMPLISSAGE,
  materiauDe,
  remplissageDe,
  zonesCoulissement,
  type MateriauMenuiserie,
  type ModificationOuverture,
  type Ouverture,
  type Remplissage,
} from '@ph/core/dessin';
import { Field, Select } from '@ph/ui';
import { COULEURS_MENUISERIE, TEINTE_MENUISERIE } from '@ph/ui/tokens';
import { Nuancier } from './Nuancier';

/** Petits bois proposés : carreaux par vantail (colonnes × rangées). */
const CARREAUX: Record<string, Ouverture['petitsBois'] | undefined> = {
  aucun: undefined,
  '2': { colonnes: 1, rangees: 2 },
  '3': { colonnes: 1, rangees: 3 },
  '4': { colonnes: 2, rangees: 2 },
  '6': { colonnes: 2, rangees: 3 },
  '8': { colonnes: 2, rangees: 4 },
};
const cleCarreaux = (o: Ouverture) =>
  o.petitsBois ? String(o.petitsBois.colonnes * o.petitsBois.rangees) : 'aucun';

/**
 * Menuiserie d'une porte ou fenêtre (DES-13, DES-14, DES-25) : remplissage, petits bois,
 * matériau, couleur, imposte, volets ; côté de rangement d'une porte coulissante.
 */
export function InspecteurMenuiserie({
  o,
  modifier,
}: {
  o: Ouverture;
  modifier: (m: ModificationOuverture) => void;
}) {
  const famille = CATALOGUE_OUVERTURES[o.type].famille;
  if (famille === 'libre') return null;
  const r = remplissageDe(o);
  const coulissant = zonesCoulissement(o).length > 0;
  return (
    <div className="grid gap-3">
      {coulissant ? (
        <Field
          label="Rangement de la porte"
          aide={
            o.type === 'porte_coulissante'
              ? 'En applique : la porte glisse devant le mur, sur un rail.'
              : 'À galandage : la porte rentre dans la cloison (7,2 cm d’épaisseur au moins).'
          }
        >
          <Select
            value={o.sens}
            disabled={o.type === 'porte_galandage_double'}
            onChange={(ev) => modifier({ sens: ev.target.value as Ouverture['sens'] })}
          >
            <option value="gauche">Vers le début du mur</option>
            <option value="droite">Vers la fin du mur</option>
          </Select>
        </Field>
      ) : null}
      <div className="grid grid-cols-2 gap-2.5">
        <Field label="Remplissage">
          <Select
            value={r}
            onChange={(ev) => modifier({ remplissage: ev.target.value as Remplissage })}
          >
            {(Object.keys(LIBELLES_REMPLISSAGE) as Remplissage[]).map((k) => (
              <option key={k} value={k}>
                {LIBELLES_REMPLISSAGE[k]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Petits bois">
          <Select
            value={cleCarreaux(o)}
            disabled={r === 'plein' || r === 'cassettes'}
            onChange={(ev) => modifier({ petitsBois: CARREAUX[ev.target.value] })}
          >
            {Object.keys(CARREAUX).map((k) => (
              <option key={k} value={k}>
                {k === 'aucun' ? 'Aucun' : `${k} carreaux`}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Matériau">
          <Select
            value={materiauDe(o)}
            onChange={(ev) => modifier({ materiau: ev.target.value as MateriauMenuiserie })}
          >
            {(Object.keys(LIBELLES_MATERIAU_MENUISERIE) as MateriauMenuiserie[]).map((k) => (
              <option key={k} value={k}>
                {LIBELLES_MATERIAU_MENUISERIE[k]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Volets">
          <Select
            value={o.volet ?? 'aucun'}
            onChange={(ev) =>
              modifier({
                volet: ev.target.value === 'aucun' ? null : (ev.target.value as 'roulant'),
              })
            }
          >
            <option value="aucun">Aucun</option>
            <option value="roulant">Roulant</option>
            <option value="battant">Battants</option>
          </Select>
        </Field>
        {famille === 'porte' ? (
          <Field label="Imposte vitrée">
            <Select
              value={o.imposte ?? 'aucune'}
              onChange={(ev) =>
                modifier({
                  imposte: ev.target.value === 'aucune' ? undefined : (ev.target.value as 'fixe'),
                })
              }
            >
              <option value="aucune">Aucune</option>
              <option value="fixe">Fixe</option>
              <option value="ouvrante">Ouvrante</option>
            </Select>
          </Field>
        ) : null}
      </div>
      <Nuancier
        legende="Couleur de la menuiserie"
        teintes={COULEURS_MENUISERIE}
        active={o.couleur ?? TEINTE_MENUISERIE[materiauDe(o)]}
        choisir={(t) => modifier({ couleur: t.couleur })}
      />
    </div>
  );
}
