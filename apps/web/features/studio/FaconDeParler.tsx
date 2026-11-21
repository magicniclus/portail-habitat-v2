'use client';

import { Banner, Button, Field, Textarea } from '@ph/ui';
import { useState, useTransition } from 'react';
import { enregistrerVoix } from './actions';

/**
 * « Ma façon de parler » : décrite une fois, donnée à Claude à chaque série d'idées, avec les
 * scripts que l'auteur a réécrits à la main (son vrai ton).
 */
export function FaconDeParler({ initiale }: { initiale: string }) {
  const [voix, setVoix] = useState(initiale);
  const [etat, setEtat] = useState<'garde' | string | null>(null);
  const [enCours, demarrer] = useTransition();
  return (
    <div className="grid gap-2">
      <Field
        label="Ma façon de parler"
        aide="Ex. : franc, direct, je tutoie, je raconte ce que je vois sur les chantiers, jamais de ton pub. Vos scripts réécrits servent aussi de modèle."
      >
        <Textarea
          rows={2}
          maxLength={1000}
          value={voix}
          onChange={(e) => (setVoix(e.target.value), setEtat(null))}
        />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="secondaire"
          disabled={enCours}
          onClick={() =>
            demarrer(async () => {
              const r = await enregistrerVoix({ voix });
              setEtat(r.ok ? 'garde' : r.message);
            })
          }
        >
          Enregistrer ma façon de parler
        </Button>
        {etat === 'garde' ? (
          <span role="status" className="text-sm text-neutre-700">
            Enregistrée : les prochaines idées seront écrites comme ça.
          </span>
        ) : null}
      </div>
      {etat && etat !== 'garde' ? <Banner tone="danger">{etat}</Banner> : null}
    </div>
  );
}
