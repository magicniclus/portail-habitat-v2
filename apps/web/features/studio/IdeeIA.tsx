'use client';

import type { SujetStudio } from '@ph/core/studio';
import { Chargeur } from '@ph/ui';
import { useState, useTransition } from 'react';
import { choisirSujet, proposerSujets } from './actions';

const BOUTON =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] px-3 text-sm font-bold disabled:opacity-50';

/**
 * Étape « Idée » du panneau IA : un thème (facultatif), Claude analyse les vidéos qui marchent et
 * propose des idées avec leur script ; on en choisit une (ou aucune : on improvise).
 */
export function IdeeIA(p: {
  projetId: string;
  sujets: readonly SujetStudio[];
  choisi: SujetStudio | null;
  theme: string;
}) {
  const [theme, setTheme] = useState(p.theme);
  const [liste, setListe] = useState(!p.choisi);
  const [erreur, setErreur] = useState<string | null>(null);
  const [action, setAction] = useState<'idees' | number | null>(null);
  const [enCours, demarrer] = useTransition();
  const agir = (quoi: 'idees' | number, f: () => Promise<{ ok: boolean; message?: string }>) => {
    setAction(quoi);
    demarrer(async () => {
      setErreur(null);
      const r = await f();
      if (!r.ok) setErreur(r.message ?? 'Action impossible.');
      else if (typeof quoi === 'number') setListe(false);
    });
  };
  const chercheIdees = enCours && action === 'idees';

  if (p.choisi && !liste)
    return (
      <div className="grid gap-2 rounded-[10px] border border-montage-trait bg-montage-surface p-3">
        <p className="m-0 text-xs text-montage-texte-doux">Idée choisie</p>
        <p className="m-0 font-semibold">{p.choisi.titre}</p>
        <p className="m-0 text-sm text-montage-texte-doux">
          {p.choisi.angle} · {p.choisi.dureeCibleS} s
        </p>
        {p.choisi.script.length ? (
          <details className="text-sm">
            <summary className="flex min-h-11 cursor-pointer items-center font-semibold">
              Voir le script ({p.choisi.script.length} phrases)
            </summary>
            <ol className="m-0 grid gap-1 pl-5">
              {p.choisi.script.map((x, i) => (
                <li key={i}>{x.voix}</li>
              ))}
            </ol>
          </details>
        ) : null}
        <button
          type="button"
          onClick={() => setListe(true)}
          className={`${BOUTON} border border-montage-trait hover:bg-montage-survol`}
        >
          Changer d’idée
        </button>
      </div>
    );

  return (
    <div className="grid gap-2">
      <label className="grid gap-1 text-sm">
        <span className="font-semibold">Thème de la vidéo (facultatif)</span>
        <input
          value={theme}
          maxLength={200}
          onChange={(e) => setTheme(e.target.value)}
          placeholder="Ex. les demandes gratuites"
          className="min-h-11 rounded-[8px] border border-montage-trait bg-montage-surface px-2 text-base text-montage-texte"
        />
      </label>
      <button
        type="button"
        disabled={enCours}
        aria-busy={chercheIdees}
        onClick={() =>
          agir('idees', () =>
            proposerSujets({ projetId: p.projetId, theme: theme.trim() || undefined }),
          )
        }
        className={`${BOUTON} bg-montage-selection text-montage-fond`}
      >
        {chercheIdees ? <Chargeur taille="xs" ton="courant" decoratif /> : '✦'}
        {chercheIdees
          ? 'Claude cherche des idées…'
          : p.sujets.length
            ? 'Proposer d’autres idées'
            : 'Trouver des idées avec Claude'}
      </button>
      {chercheIdees ? (
        <p className="m-0 text-xs text-montage-texte-doux" aria-live="polite">
          Claude regarde les vidéos courtes qui marchent en ce moment, puis écrit ses idées avec le
          script : une à deux minutes.
        </p>
      ) : null}
      {erreur ? (
        <p role="alert" className="m-0 text-sm text-danger">
          {erreur}
        </p>
      ) : null}
      {p.sujets.length ? (
        <ul className="m-0 grid list-none gap-2 p-0" aria-label="Idées proposées">
          {p.sujets.map((s, i) => {
            const estChoisi = p.choisi?.titre === s.titre;
            return (
              <li
                key={`${i}-${s.titre}`}
                className={`grid gap-1.5 rounded-[10px] border p-3 text-sm ${estChoisi ? 'border-montage-selection' : 'border-montage-trait'} bg-montage-surface`}
              >
                <p className="m-0 font-semibold">{s.titre}</p>
                <p className="m-0 text-montage-texte-doux">
                  {s.angle} · {s.dureeCibleS} s
                  {s.potentielViral ? ` · viral ${s.potentielViral}/10` : ''}
                </p>
                <details>
                  <summary className="flex min-h-11 cursor-pointer items-center text-xs font-semibold">
                    Script
                  </summary>
                  <ol className="m-0 grid gap-1 pl-5 text-xs">
                    {s.script.map((x, j) => (
                      <li key={j}>{x.voix}</li>
                    ))}
                  </ol>
                </details>
                <button
                  type="button"
                  disabled={enCours}
                  aria-busy={enCours && action === i}
                  onClick={() => agir(i, () => choisirSujet({ projetId: p.projetId, index: i }))}
                  className={`${BOUTON} border border-montage-selection text-montage-selection hover:bg-montage-survol`}
                >
                  {enCours && action === i ? (
                    <Chargeur taille="xs" ton="courant" decoratif />
                  ) : null}
                  {estChoisi ? '✓ Idée choisie' : 'Choisir cette idée'}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      {p.choisi ? (
        <button
          type="button"
          onClick={() => setListe(false)}
          className={`${BOUTON} border border-montage-trait hover:bg-montage-survol`}
        >
          Garder « {p.choisi.titre} »
        </button>
      ) : null}
    </div>
  );
}
