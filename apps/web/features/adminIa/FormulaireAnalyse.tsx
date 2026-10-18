'use client';

import {
  LIBELLES_PERIMETRE_IA,
  MODES_ANALYSE_IA,
  PERIMETRES_IA,
  type ModeIa,
  type PerimetreIa,
} from '@ph/core/ia';
import { Banner, Button, Checkbox, Chip, Field, Textarea } from '@ph/ui';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { lancerAnalyse } from './actions';

/** Lancer une analyse : mode, données à analyser, question, analyse approfondie. */
export function FormulaireAnalyse({
  questionInitiale,
  actif,
}: {
  questionInitiale: string;
  actif: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<ModeIa>('rapide');
  const [perimetres, setPerimetres] = useState<PerimetreIa[]>([]);
  const [question, setQuestion] = useState(questionInitiale);
  const [approfondie, setApprofondie] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const basculer = (p: PerimetreIa) =>
    setPerimetres((l) => (l.includes(p) ? l.filter((x) => x !== p) : [...l, p]));
  const lancer = () =>
    demarrer(async () => {
      setErreur(null);
      const r = await lancerAnalyse({
        mode,
        perimetres,
        question: question.trim() || undefined,
        approfondie,
      });
      if ('erreur' in r) setErreur(r.erreur);
      else router.push(`/admin/ia?analyse=${r.analyseId}` as Route);
    });
  return (
    <section
      aria-labelledby="nouvelle-analyse"
      className="grid gap-4 rounded-card border border-trait bg-blanc p-4"
    >
      <h2 id="nouvelle-analyse" className="m-0 text-lg">
        Nouvelle analyse
      </h2>
      <fieldset className="m-0 grid gap-2 border-0 p-0 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold">Type d’analyse</legend>
        {MODES_ANALYSE_IA.map((m) => (
          <label
            key={m.id}
            className="flex min-h-11 cursor-pointer flex-col gap-0.5 rounded-control border border-trait p-3 has-[:checked]:border-accent has-[:checked]:bg-neutre-100"
          >
            <span className="flex items-center gap-2 font-semibold">
              <input
                type="radio"
                name="mode"
                checked={mode === m.id}
                onChange={() => setMode(m.id)}
              />
              {m.nom}
            </span>
            <span className="text-sm text-neutre-700">{m.description}</span>
          </label>
        ))}
      </fieldset>
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-2 text-sm font-semibold">Données à analyser</legend>
        <div className="flex flex-wrap gap-2">
          <Chip selectionne={perimetres.length === 0} onClick={() => setPerimetres([])}>
            Tout
          </Chip>
          {PERIMETRES_IA.map((p) => (
            <Chip key={p} selectionne={perimetres.includes(p)} onClick={() => basculer(p)}>
              {LIBELLES_PERIMETRE_IA[p]}
            </Chip>
          ))}
        </div>
      </fieldset>
      <Field label="Question ou objectif (facultatif)">
        <Textarea
          rows={3}
          maxLength={1000}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
      </Field>
      <Checkbox checked={approfondie} onChange={(e) => setApprofondie(e.target.checked)}>
        Analyse approfondie (modèle plus puissant, environ 3 fois plus cher)
      </Checkbox>
      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={lancer} disabled={enCours || !actif}>
          {enCours
            ? 'Analyse en cours…'
            : mode === 'audit'
              ? 'Lancer l’audit complet'
              : 'Trouver les points d’amélioration'}
        </Button>
        <p className="m-0 text-xs text-neutre-700">
          Données transmises : agrégats et contenus publics uniquement, jamais de données
          personnelles. Chaque analyse est journalisée.
        </p>
      </div>
    </section>
  );
}
