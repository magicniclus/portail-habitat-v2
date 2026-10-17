'use client';

import { lierSelection, motsLies, retirerLien, type Action, type PageSite } from '@ph/core/sites';
import { Button, Field, Textarea } from '@ph/ui';
import { useRef, useState } from 'react';
import { ChampAction } from './ChampAction';

/**
 * Texte d'un titre ou d'un paragraphe avec ses mots liés (SITE_INTERNET §4.3) : sélectionner un
 * passage puis « Lier la sélection » ; chaque mot lié reçoit son action (page, téléphone, email…).
 */
export function TexteLie({
  texte,
  liens = {},
  onChange,
  pages,
  erreurAction,
}: {
  texte: string;
  liens?: Record<string, Action>;
  onChange: (p: { texte?: string; liens?: Record<string, Action> }) => void;
  pages: Record<string, PageSite>;
  erreurAction: (a: Action) => string | null;
}) {
  const zone = useRef<HTMLTextAreaElement>(null);
  const [refus, setRefus] = useState(false);
  const lier = () => {
    const z = zone.current;
    const r = z
      ? lierSelection(texte, { debut: z.selectionStart, fin: z.selectionEnd }, liens)
      : null;
    setRefus(!r);
    if (r) onChange({ texte: r.texte, liens: r.liens });
  };
  const mots = motsLies(texte);
  return (
    <div className="grid gap-2">
      <Field label="Texte">
        <Textarea ref={zone} value={texte} onChange={(e) => onChange({ texte: e.target.value })} />
      </Field>
      <div>
        <Button variant="secondaire" taille="sm" onClick={lier}>
          Lier la sélection
        </Button>
      </div>
      {refus ? (
        <p className="m-0 text-sm text-neutre-800" role="status">
          Sélectionnez d’abord un mot ou quelques mots du texte (hors d’un lien existant).
        </p>
      ) : null}
      {mots.map((m) => {
        const a = liens[m.lid] ?? { type: 'aucun' as const };
        return (
          <div key={m.lid} className="grid gap-2 rounded-[10px] border border-trait p-3">
            <ChampAction
              libelle={`Lien « ${m.mot} »`}
              action={a}
              onChange={(x) => onChange({ liens: { ...liens, [m.lid]: x } })}
              pages={pages}
              erreur={erreurAction(a)}
            />
            <div>
              <Button
                variant="fantome"
                taille="sm"
                onClick={() => onChange(retirerLien(texte, liens, m.lid))}
              >
                Retirer le lien
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
