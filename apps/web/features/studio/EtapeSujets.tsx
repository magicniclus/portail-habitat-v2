'use client';

import type { SujetStudio } from '@ph/core/studio';
import { Banner, Button, Field, Input } from '@ph/ui';
import { useState, useTransition } from 'react';
import { choisirSujet, proposerSujets } from './actions';
import { CarteSujet } from './CarteSujet';

/** Étape 1 : Claude analyse les vidéos courtes qui marchent et propose des sujets avec script. */
export function EtapeSujets({
  projetId,
  sujets,
  choisi,
  themeInitial,
  replie,
}: {
  projetId: string;
  sujets: SujetStudio[];
  choisi: SujetStudio | null;
  themeInitial: string;
  replie: boolean;
}) {
  const [theme, setTheme] = useState(themeInitial);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const agir = (f: () => Promise<{ ok: boolean; message?: string }>) =>
    demarrer(async () => {
      setErreur(null);
      const r = await f();
      if (!r.ok) setErreur(r.message ?? 'Action impossible.');
    });
  return (
    <details open={!replie} className="rounded-card border border-trait bg-blanc p-4">
      <summary className="min-h-11 cursor-pointer text-lg font-bold">
        1. Sujet et script {choisi ? `· ${choisi.titre}` : ''}
      </summary>
      <div className="mt-3 grid gap-3">
        <div className="grid items-end gap-3 md:grid-cols-[1fr_auto]">
          <Field label="Thème (facultatif)">
            <Input
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="Ex. les demandes gratuites"
            />
          </Field>
          <Button
            disabled={enCours}
            onClick={() =>
              agir(() => proposerSujets({ projetId, theme: theme.trim() || undefined }))
            }
          >
            {enCours
              ? 'Claude analyse les tendances…'
              : sujets.length
                ? 'Proposer d’autres sujets'
                : 'Analyser les tendances et proposer'}
          </Button>
        </div>
        {enCours ? (
          <p className="m-0 text-sm text-neutre-700" aria-live="polite">
            Recherche des vidéos courtes qui font le plus de vues, puis écriture des scripts : une à
            deux minutes.
          </p>
        ) : null}
        {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
        <ul className="m-0 grid list-none gap-3 p-0 xl:grid-cols-3">
          {sujets.map((s, i) => (
            <CarteSujet
              key={`${i}-${s.titre}`}
              sujet={s}
              choisi={choisi?.titre === s.titre}
              desactive={enCours}
              onChoisir={() => agir(() => choisirSujet({ projetId, index: i }))}
            />
          ))}
        </ul>
        <div>
          <Button
            variant="secondaire"
            disabled={enCours}
            onClick={() => agir(() => choisirSujet({ projetId, index: null }))}
          >
            Enregistrer sans sujet (j’improvise)
          </Button>
        </div>
      </div>
    </details>
  );
}
