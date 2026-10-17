'use client';

import type { Feuille } from '@ph/core/admin';
import { Field, Input } from '@ph/ui';
import { useState } from 'react';
import { ConfirmationAdmin } from '@/features/admin/ConfirmationAdmin';
import { activerPrestation, modifierPrix } from './actions';

/** Prix privés d'une prestation : chaque nombre du barème, sans en changer la forme. */
export function EditeurPrixPrestation({
  id,
  nom,
  actif,
  feuilles,
  peut,
}: {
  id: string;
  nom: string;
  actif: boolean;
  feuilles: Feuille[];
  peut: boolean;
}) {
  const [valeurs, setValeurs] = useState<Record<string, string>>(
    Object.fromEntries(feuilles.map((f) => [f.chemin, String(f.valeur)])),
  );
  const modifs = Object.fromEntries(
    feuilles
      .filter((f) => Number(valeurs[f.chemin]?.replace(',', '.')) !== f.valeur)
      .map((f) => [f.chemin, Number(valeurs[f.chemin]?.replace(',', '.'))]),
  );
  const nb = Object.keys(modifs).length;
  const requise = peut ? undefined : 'Permission requise : referentiels.modifier';
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {feuilles.map((f) => (
          <Field key={f.chemin} label={f.chemin}>
            <Input
              inputMode="decimal"
              value={valeurs[f.chemin] ?? ''}
              disabled={!peut}
              onChange={(e) => setValeurs({ ...valeurs, [f.chemin]: e.target.value })}
            />
          </Field>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <ConfirmationAdmin
          libelle={nb ? `Publier ${nb} modification${nb > 1 ? 's' : ''}` : 'Publier'}
          titre={`Nouveaux prix : ${nom}`}
          description="Une nouvelle version est créée ; seules les prochaines estimations sont concernées."
          desactive={requise ?? (nb ? undefined : 'Aucune modification')}
          onConfirmer={(motif) => modifierPrix({ id, modifs, motif })}
        />
        <ConfirmationAdmin
          libelle={actif ? 'Retirer du simulateur' : 'Remettre en ligne'}
          titre={`${actif ? 'Retirer' : 'Remettre en ligne'} : ${nom}`}
          description={
            actif
              ? 'La prestation n’est plus proposée aux particuliers.'
              : 'La prestation est de nouveau proposée.'
          }
          danger={actif}
          desactive={requise}
          onConfirmer={(motif) => activerPrestation({ id, actif: !actif, motif })}
        />
      </div>
    </div>
  );
}
