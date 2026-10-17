'use client';

import { MAX_SUIVIS } from '@ph/core/ia';
import type { AnalyseLue } from '@ph/firebase/ia';
import { Banner, Button, Field, Textarea } from '@ph/ui';
import { useState, useTransition } from 'react';
import { poserQuestionSuivi } from './actions';

/** Questions de suivi (IA_ADMIN §4) : même contexte que l'analyse, chaque chiffre vérifié. */
export function SuivisAnalyse({
  analyseId,
  suivis,
  actif,
}: {
  analyseId: string;
  suivis: AnalyseLue['suivis'];
  actif: boolean;
}) {
  const [question, setQuestion] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const plein = suivis.length >= MAX_SUIVIS;
  const envoyer = () =>
    demarrer(async () => {
      const r = await poserQuestionSuivi({ analyseId, question });
      setErreur(r);
      if (!r) setQuestion('');
    });
  return (
    <section
      aria-labelledby="suivi-ia"
      className="grid gap-3 rounded-card border border-trait bg-blanc p-4"
    >
      <h2 id="suivi-ia" className="m-0 text-base">
        Questions de suivi
      </h2>
      {suivis.map((s) => (
        <div key={s.le} className="grid gap-1">
          <p className="m-0 font-semibold">« {s.question} »</p>
          <p className="m-0">{s.reponse}</p>
          {s.preuves.length ? (
            <p className="m-0 text-sm text-neutre-700">
              {s.preuves.map((p) => `${p.valeur} · ${p.ref}`).join(' — ')}
            </p>
          ) : null}
        </div>
      ))}
      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
      {plein ? (
        <p className="m-0 text-sm text-neutre-700">
          {MAX_SUIVIS} questions au plus : lancez une nouvelle analyse.
        </p>
      ) : (
        <form
          className="grid gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            envoyer();
          }}
        >
          <Field label="Votre question">
            <Textarea
              rows={2}
              maxLength={1000}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </Field>
          <div>
            <Button type="submit" disabled={!actif || enCours || question.trim().length < 3}>
              {enCours ? 'Réponse en cours…' : 'Poser la question'}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
