'use client';

import type { QuestionCreation, ReponsesCreation } from '@ph/core/sites';
import { Button, Checkbox, Chip, ChipGroup, Field, Input } from '@ph/ui';
import { useState } from 'react';

/**
 * Questionnaire de création (IA_SITE §3.1) : d'abord ce qui est repris de la fiche (avec une case
 * pour exclure), puis une question à la fois, réponses en un tap, « Passer » et « Je ne sais pas »
 * toujours proposés. Rien de la fiche n'est redemandé (SITE-IA-07).
 */
export function QuestionnaireCreation({
  questions,
  repris,
  onFini,
  onAnnuler,
}: {
  questions: QuestionCreation[];
  repris: string[];
  onFini: (r: ReponsesCreation) => void;
  onAnnuler: () => void;
}) {
  const [etape, setEtape] = useState(-1);
  const [exclus, setExclus] = useState<string[]>([]);
  const [reponses, setReponses] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(questions.filter((q) => q.preselection).map((q) => [q.id, q.preselection!])),
  );
  const [autre, setAutre] = useState('');

  const terminer = (r: Record<string, string[]>) => {
    const sortie: Record<string, unknown> = {};
    for (const q of questions) {
      const v = r[q.id];
      if (!v?.length) continue;
      sortie[q.id] = q.type === 'multi' ? v : v[0];
    }
    onFini({
      ...sortie,
      ...(autre.trim() ? { autre: autre.trim() } : {}),
      ...(exclus.length ? { exclus } : {}),
    } as ReponsesCreation);
  };
  const suivante = (r = reponses) =>
    etape + 1 < questions.length ? setEtape(etape + 1) : terminer(r);

  if (etape < 0)
    return (
      <section aria-labelledby="creation-repris" className="grid gap-3">
        <h2 id="creation-repris" className="m-0 text-lg">
          J’ai repris de votre fiche
        </h2>
        <p className="m-0 text-[15px] text-neutre-800">
          Décochez ce que vous ne voulez pas voir sur le site.
        </p>
        <div className="grid">
          {repris.map((r) => (
            <Checkbox
              key={r}
              checked={!exclus.includes(r)}
              onChange={(e) =>
                setExclus((x) => (e.target.checked ? x.filter((v) => v !== r) : [...x, r]))
              }
            >
              {r}
            </Checkbox>
          ))}
        </div>
        <p className="m-0 text-sm text-neutre-700">
          {questions.length} questions courtes, puis l’IA crée les pages une par une. Votre site
          actuel est gardé dans « Mes modèles ».
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setEtape(0)}>Commencer</Button>
          <Button variant="fantome" onClick={onAnnuler}>
            Annuler
          </Button>
        </div>
      </section>
    );

  const q = questions[etape]!;
  const choisis = reponses[q.id] ?? [];
  const basculer = (o: string) => {
    if (q.type === 'choix') {
      const r = { ...reponses, [q.id]: [o] };
      setReponses(r);
      return suivante(r);
    }
    const v = choisis.includes(o)
      ? choisis.filter((x) => x !== o)
      : q.max && choisis.length >= q.max
        ? choisis
        : [...choisis, o];
    setReponses({ ...reponses, [q.id]: v });
  };
  const passer = () => {
    const r = { ...reponses, [q.id]: [] };
    setReponses(r);
    if (q.id === 'q3') setAutre('');
    suivante(r);
  };

  return (
    <section aria-labelledby="creation-question" className="grid gap-3">
      <p className="m-0 text-sm text-neutre-700">
        Question {etape + 1} sur {questions.length}
      </p>
      <h2 id="creation-question" className="m-0 text-lg">
        {q.texte}
      </h2>
      {q.max ? <p className="m-0 text-sm text-neutre-700">{q.max} au plus.</p> : null}
      <ChipGroup libelle={q.texte}>
        {q.options.map((o) => (
          <Chip key={o} selectionne={choisis.includes(o)} onClick={() => basculer(o)}>
            {o}
          </Chip>
        ))}
      </ChipGroup>
      {q.exemples ? (
        <ul className="m-0 grid gap-1 pl-5 text-sm text-neutre-700">
          {Object.entries(q.exemples).map(([t, ex]) => (
            <li key={t}>
              <b>{t}</b> : « {ex} »
            </li>
          ))}
        </ul>
      ) : null}
      {q.id === 'q3' ? (
        <Field label="Autre (facultatif)">
          <Input value={autre} maxLength={140} onChange={(e) => setAutre(e.target.value)} />
        </Field>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {q.type === 'multi' ? <Button onClick={() => suivante()}>Suivant</Button> : null}
        <Button variant="fantome" onClick={passer}>
          Passer
        </Button>
        <Button variant="fantome" onClick={passer}>
          Je ne sais pas
        </Button>
        {etape > 0 ? (
          <Button variant="fantome" onClick={() => setEtape(etape - 1)}>
            ← Retour
          </Button>
        ) : null}
      </div>
    </section>
  );
}
