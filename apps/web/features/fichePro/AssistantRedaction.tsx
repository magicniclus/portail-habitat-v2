'use client';

import { LIBELLES_TON, TONS_REDACTION, type TypeRedaction } from '@ph/core/ia';
import { Banner, Button, Select } from '@ph/ui';
import { useState } from 'react';
import { posterJson } from '@/lib/posterJson';

type Proposition = { texte: string; changements: string[]; redactionId: string };

/**
 * Assistant de rédaction (IA_ADMIN §8) : relire ou réécrire selon un ton. La proposition
 * s'affiche à côté du texte ; rien n'est enregistré sans « Remplacer » puis « Enregistrer ».
 */
export function AssistantRedaction({
  type,
  texte,
  remplacer,
  infos,
}: {
  type: TypeRedaction;
  texte: string;
  remplacer: (t: string) => void;
  /** Chantier : titre et ville pour « Rédiger à partir des infos » (les notes = le texte). */
  infos?: { titre: string; ville: string };
}) {
  const [ton, setTon] = useState<(typeof TONS_REDACTION)[number]>('professionnel');
  const [proposition, setProposition] = useState<Proposition | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const demander = async (action: 'relire' | 'reecrire' | 'generer') => {
    setEnCours(true);
    setErreur(null);
    const r = await posterJson<Proposition>('/api/pro/redaction', {
      type,
      action,
      texte,
      ...(action === 'reecrire' ? { ton } : {}),
      ...(action === 'generer' && infos
        ? {
            texte: '',
            infos: {
              titre: infos.titre,
              ville: infos.ville,
              ...(texte.trim() ? { notes: texte.trim() } : {}),
            },
          }
        : {}),
    });
    setEnCours(false);
    if (!r.ok) return setErreur(r.message);
    setProposition(r.data);
  };
  return (
    <div className="grid gap-2 rounded-control bg-neutre-100 p-3">
      <p className="m-0 text-sm font-semibold">Assistant de rédaction</p>
      <div className="flex flex-wrap items-center gap-2">
        {infos ? (
          <Button
            type="button"
            variant="secondaire"
            taille="sm"
            disabled={enCours || infos.titre.trim().length < 2}
            onClick={() => demander('generer')}
          >
            Rédiger à partir des infos
          </Button>
        ) : null}
        <Button
          type="button"
          variant="secondaire"
          taille="sm"
          disabled={enCours || !texte.trim()}
          onClick={() => demander('relire')}
        >
          Relire et corriger
        </Button>
        <label className="flex items-center gap-2 text-sm">
          <span className="sr-only">Ton de la réécriture</span>
          <Select value={ton} onChange={(e) => setTon(e.target.value as typeof ton)}>
            {TONS_REDACTION.map((t) => (
              <option key={t} value={t}>
                {LIBELLES_TON[t]}
              </option>
            ))}
          </Select>
        </label>
        <Button
          type="button"
          variant="secondaire"
          taille="sm"
          disabled={enCours || !texte.trim()}
          onClick={() => demander('reecrire')}
        >
          {enCours ? 'Rédaction…' : 'Réécrire'}
        </Button>
      </div>
      {erreur ? <Banner tone="attention">{erreur}</Banner> : null}
      {proposition ? (
        <div className="grid gap-2" aria-live="polite">
          <p className="m-0 text-sm text-neutre-700">
            Proposition (rien n’est enregistré tant que vous ne validez pas) :
          </p>
          <p className="m-0 rounded-control border border-trait bg-blanc p-3 whitespace-pre-line">
            {proposition.texte}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              taille="sm"
              onClick={() => {
                remplacer(proposition.texte);
                setProposition(null);
                void posterJson('/api/pro/redaction/acceptee', {
                  redactionId: proposition.redactionId,
                });
              }}
            >
              Remplacer mon texte
            </Button>
            <Button
              type="button"
              variant="secondaire"
              taille="sm"
              onClick={() => setProposition(null)}
            >
              Garder le mien
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
