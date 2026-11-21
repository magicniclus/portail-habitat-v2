'use client';

import { distance, formatLongueur } from '@ph/core/dessin';
import { Button, Field, Input, Select } from '@ph/ui';
import type { Dispatch, ReactNode } from 'react';
import { Info, TitreSelection } from './blocs';
import { niveauDe, type Action, type EtatEditeur } from './etat';

/** Inspecteur d'une cote libre ou d'un texte (DES-31) ; `null` pour une autre sélection. */
export function inspecteurAnnotation(etat: EtatEditeur, dispatch: Dispatch<Action>): ReactNode {
  const s = etat.selection;
  const n = niveauDe(etat);
  const supprimer = (
    <Button variant="secondaire" onClick={() => dispatch({ type: 'supprimerSelection' })}>
      Supprimer
    </Button>
  );
  if (s?.genre === 'cote') {
    const c = n.cotes.find((x) => x.id === s.id);
    if (!c) return null;
    return (
      <div className="grid gap-4">
        <TitreSelection titre="Cote libre" />
        <dl className="m-0 grid grid-cols-2 gap-2">
          <Info
            libelle="Longueur"
            valeur={formatLongueur(Math.round(distance(c.a, c.b)))}
            large
            grande
          />
        </dl>
        {supprimer}
      </div>
    );
  }
  if (s?.genre !== 'texte') return null;
  const t = n.textes.find((x) => x.id === s.id);
  if (!t) return null;
  const modifier = (modif: { contenu?: string; taille?: number }) =>
    dispatch({ type: 'modifierTexte', id: t.id, modif });
  return (
    <div key={t.id} className="grid gap-4">
      <TitreSelection titre="Texte" />
      <Field label="Contenu">
        <Input
          defaultValue={t.contenu}
          maxLength={200}
          onBlur={(ev) => {
            const v = ev.target.value.trim();
            if (v && v !== t.contenu) modifier({ contenu: v });
          }}
          onKeyDown={(ev) => {
            if (ev.key === 'Enter') ev.currentTarget.blur();
          }}
        />
      </Field>
      <Field label="Taille">
        <Select value={t.taille} onChange={(ev) => modifier({ taille: Number(ev.target.value) })}>
          {[10, 14, 18, 24, 32, 48].map((x) => (
            <option key={x} value={x}>
              {x} px
            </option>
          ))}
        </Select>
      </Field>
      {supprimer}
    </div>
  );
}
