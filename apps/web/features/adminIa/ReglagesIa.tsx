'use client';

import { formatEuros } from '@ph/core/format';
import { Banner, Button, Checkbox, Field, Input } from '@ph/ui';
import { useState, useTransition } from 'react';
import { enregistrerReglages } from './actions';

interface Reglages {
  actif: boolean;
  analyseHebdo: boolean;
  quotaJour: number;
  budgetMensuelCentimes: number;
  consignes: string[];
  modeleDefaut: string;
  modeleApprofondi: string;
}

/** Réglages de l'assistant (permission `ia.configurer`) : budget, quota, synthèse, consignes. */
export function ReglagesIa({
  initial,
  depenseCentimes,
}: {
  initial: Reglages;
  depenseCentimes: number;
}) {
  const [r, setR] = useState(initial);
  const [budgetEuros, setBudgetEuros] = useState(String(initial.budgetMensuelCentimes / 100));
  const [message, setMessage] = useState<{ ton: 'succes' | 'danger'; texte: string } | null>(null);
  const [enCours, demarrer] = useTransition();
  const enregistrer = () =>
    demarrer(async () => {
      // Euros saisis → centimes entiers (jamais de flottant stocké).
      const budget = Math.round(Number(budgetEuros.replace(',', '.')) * 100);
      const erreur = await enregistrerReglages({
        actif: r.actif,
        analyseHebdo: r.analyseHebdo,
        quotaJour: r.quotaJour,
        budgetMensuelCentimes: Number.isFinite(budget) ? budget : -1,
        consignes: r.consignes,
      });
      setMessage(
        erreur
          ? { ton: 'danger', texte: erreur }
          : { ton: 'succes', texte: 'Réglages enregistrés.' },
      );
    });
  return (
    <section
      aria-labelledby="reglages-ia"
      className="grid gap-2 rounded-card border border-trait bg-blanc p-4 text-sm"
    >
      <h2 id="reglages-ia" className="m-0 text-base">
        Réglages
      </h2>
      <p className="m-0">
        Modèle par défaut : {r.modeleDefaut} · analyse approfondie : {r.modeleApprofondi} · cache 24
        h
      </p>
      <p className="m-0">
        Dépensé ce mois : {formatEuros(depenseCentimes, { decimales: 'toujours' })}
      </p>
      <Checkbox checked={r.actif} onChange={(e) => setR({ ...r, actif: e.currentTarget.checked })}>
        Assistant actif
      </Checkbox>
      <Checkbox
        checked={r.analyseHebdo}
        onChange={(e) => setR({ ...r, analyseHebdo: e.currentTarget.checked })}
      >
        Synthèse du lundi 7 h
      </Checkbox>
      <Field label="Budget mensuel (€)">
        <Input
          inputMode="decimal"
          value={budgetEuros}
          onChange={(e) => setBudgetEuros(e.target.value)}
        />
      </Field>
      <Field label="Analyses par jour et par personne">
        <Input
          type="number"
          min={1}
          max={200}
          value={r.quotaJour}
          onChange={(e) => setR({ ...r, quotaJour: Number(e.target.value) })}
        />
      </Field>
      <div className="grid gap-1">
        <p className="m-0 font-semibold">Consignes apprises ({r.consignes.length})</p>
        {r.consignes.map((c) => (
          <p key={c} className="m-0 flex items-start justify-between gap-2">
            <span>{c}</span>
            <button
              type="button"
              className="min-h-11 cursor-pointer border-0 bg-transparent p-0 text-sm underline"
              onClick={() => setR({ ...r, consignes: r.consignes.filter((x) => x !== c) })}
              aria-label={`Retirer la consigne : ${c}`}
            >
              Retirer
            </button>
          </p>
        ))}
      </div>
      {message ? <Banner tone={message.ton}>{message.texte}</Banner> : null}
      <Button taille="sm" onClick={enregistrer} disabled={enCours}>
        Enregistrer les réglages
      </Button>
    </section>
  );
}
