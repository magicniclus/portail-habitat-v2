'use client';

import type { ModeIaSite, OperationIa } from '@ph/core/sites';
import { PropositionIa, type Proposition } from './PropositionIa';
import { Banner, Button, Field, Select, Textarea } from '@ph/ui';
import { useState } from 'react';
import { FenetreOffre } from '@/features/offres/FenetreOffre';
import { posterJson } from '@/lib/posterJson';

const MODES: { mode: ModeIaSite; libelle: string; essai: boolean }[] = [
  { mode: 'textes', libelle: 'Améliorer les textes', essai: true },
  { mode: 'seo', libelle: 'Référencement (titres, descriptions)', essai: true },
  { mode: 'composant', libelle: 'Créer ou modifier des sections', essai: false },
  { mode: 'page', libelle: 'Créer ou refaire une page', essai: false },
  { mode: 'theme', libelle: 'Couleurs et polices', essai: false },
];

/**
 * Panneau IA (IA_SITE §2.3) : la demande part sur le brouillon enregistré ; la proposition est
 * montrée avant tout changement, appliquée en une seule étape d'historique (Ctrl Z annule tout).
 * Rien n'est publié par l'IA.
 */
export function PanneauIa({
  pageId,
  selection,
  iaComplete,
  enregistrer,
  appliquer,
}: {
  pageId: string;
  selection: string | null;
  iaComplete: boolean;
  enregistrer: () => Promise<string | null>;
  appliquer: (ops: OperationIa[]) => string | null;
}) {
  const [mode, setMode] = useState<ModeIaSite>('textes');
  const [portee, setPortee] = useState<'selection' | 'page' | 'site'>(
    selection ? 'selection' : 'page',
  );
  const [demande, setDemande] = useState('');
  const [reponse, setReponse] = useState('');
  const [prop, setProp] = useState<Proposition | null>(null);
  const [message, setMessage] = useState<{ ton: 'danger' | 'succes'; texte: string } | null>(null);
  const [enCours, setEnCours] = useState(false);
  const verrou = !iaComplete && !MODES.find((m) => m.mode === mode)!.essai;

  const envoyer = async (avecReponse?: string) => {
    setEnCours(true);
    setMessage(null);
    const e = await enregistrer();
    if (e) {
      setEnCours(false);
      return setMessage({ ton: 'danger', texte: e });
    }
    const r = await posterJson<Proposition>('/api/pro/site/ia', {
      mode,
      portee,
      pageId,
      cibles: portee === 'selection' && selection ? [selection] : [],
      demande,
      ...(avecReponse ? { reponse: avecReponse } : {}),
    });
    setEnCours(false);
    if (!r.ok) return setMessage({ ton: 'danger', texte: r.message });
    setProp(r.data);
  };

  return (
    <div className="grid gap-4">
      <Field label="Que voulez-vous faire ?">
        <Select value={mode} onChange={(e) => setMode(e.target.value as ModeIaSite)}>
          {MODES.map((m) => (
            <option key={m.mode} value={m.mode}>
              {!iaComplete && !m.essai ? '🔒 ' : ''}
              {m.libelle}
            </option>
          ))}
        </Select>
      </Field>
      <div role="group" aria-label="Portée" className="flex flex-wrap gap-1">
        {(['selection', 'page', 'site'] as const).map((p) => (
          <Button
            key={p}
            taille="sm"
            variant={portee === p ? 'secondaire' : 'fantome'}
            aria-pressed={portee === p}
            disabled={p === 'selection' && !selection}
            onClick={() => setPortee(p)}
          >
            {p === 'selection' ? 'Sélection' : p === 'page' ? 'Page' : 'Tout le site'}
          </Button>
        ))}
      </div>
      {verrou ? (
        <div className="grid gap-3 rounded-2xl border border-accent-300 bg-accent-100 p-4">
          <p className="m-0 text-[15px]">
            Cette action de l’IA est incluse dans Site Pro : sections, pages et couleurs créées en
            un clic, modifiables ensuite à la main.
          </p>
          <div>
            <FenetreOffre
              formule="site_pro"
              raison="L’IA complète du site est incluse dans Site Pro."
            >
              Débloquer l’IA
            </FenetreOffre>
          </div>
        </div>
      ) : (
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            setProp(null);
            void envoyer();
          }}
        >
          <Field
            label="Demandez à l’IA…"
            aide="Ex. : « Plus court et plus chaleureux », « Mets Mérignac dans le titre »."
          >
            <Textarea
              value={demande}
              maxLength={1000}
              onChange={(e) => setDemande(e.target.value)}
            />
          </Field>
          <div>
            <Button type="submit" disabled={enCours || demande.trim().length < 3}>
              {enCours ? 'L’IA prépare une proposition…' : 'Proposer'}
            </Button>
          </div>
        </form>
      )}
      {message ? <Banner tone={message.ton}>{message.texte}</Banner> : null}
      {prop?.question ? (
        <form
          className="grid gap-3 rounded-[12px] border border-trait p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void envoyer(reponse);
          }}
        >
          <Field label={prop.question}>
            <Textarea
              value={reponse}
              maxLength={500}
              onChange={(e) => setReponse(e.target.value)}
            />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" disabled={enCours || !reponse.trim()}>
              Répondre
            </Button>
            <Button variant="fantome" onClick={() => setProp(null)}>
              Passer
            </Button>
          </div>
        </form>
      ) : null}
      {prop && prop.operations.length ? (
        <PropositionIa
          proposition={prop}
          enCours={enCours}
          onAppliquer={() => {
            const e = appliquer(prop.operations);
            setMessage(
              e
                ? { ton: 'danger', texte: e }
                : {
                    ton: 'succes',
                    texte: 'Proposition appliquée. Ctrl Z pour revenir en arrière.',
                  },
            );
            if (!e) setProp(null);
          }}
          onAutre={() => void envoyer()}
          onAnnuler={() => setProp(null)}
        />
      ) : null}
    </div>
  );
}
