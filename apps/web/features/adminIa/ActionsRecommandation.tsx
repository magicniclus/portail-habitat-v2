'use client';

import { LIBELLES_ACTION_IA } from '@ph/core/ia';
import { Button } from '@ph/ui';
import { useState, useTransition } from 'react';
import { agirRecommandation } from './actions';

const lien = 'min-h-11 cursor-pointer border-0 bg-transparent p-0 text-sm underline';

/** Actions d'une recommandation : rien n'est appliqué sans validation humaine (IA_ADMIN §5). */
export function ActionsRecommandation({ id, typeAction }: { id: string; typeAction: string }) {
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const [motif, setMotif] = useState<string | null>(null);
  const agir = (e: Parameters<typeof agirRecommandation>[0]) =>
    demarrer(async () => setErreur(await agirRecommandation(e)));
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <Button
        taille="sm"
        disabled={enCours}
        onClick={() => agir({ id, action: typeAction === 'ab_test' ? 'ab_test' : 'tache' })}
      >
        {LIBELLES_ACTION_IA[typeAction] ?? 'Créer la tâche'}
      </Button>
      {typeAction === 'ab_test' ? (
        <button
          type="button"
          className={lien}
          disabled={enCours}
          onClick={() => agir({ id, action: 'tache' })}
        >
          Créer une tâche
        </button>
      ) : null}
      <button
        type="button"
        className={lien}
        disabled={enCours}
        onClick={() => agir({ id, action: 'faite' })}
      >
        Marquer faite
      </button>
      {motif === null ? (
        <button type="button" className={`${lien} text-neutre-700`} onClick={() => setMotif('')}>
          Ignorer
        </button>
      ) : (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(ev) => {
            ev.preventDefault();
            agir({ id, action: 'ignorer', motif });
          }}
        >
          <label className="text-sm">
            <span className="sr-only">Pourquoi ignorer ?</span>
            <input
              required
              minLength={3}
              maxLength={300}
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Pourquoi ? (ne plus proposer…)"
              className="min-h-11 rounded-control border border-trait px-3 text-base"
            />
          </label>
          <Button taille="sm" variant="secondaire" type="submit" disabled={enCours}>
            Ignorer
          </Button>
        </form>
      )}
      {erreur ? (
        <span role="alert" className="text-sm text-danger">
          {erreur}
        </span>
      ) : null}
    </div>
  );
}
