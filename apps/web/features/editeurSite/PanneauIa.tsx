'use client';

import { CATEGORIE_MODE, type ModeIaSite, type OperationIa } from '@ph/core/sites';
import { MODES, texteRestants, type RestantsIa } from './modesIa';
import { QuestionIa } from './QuestionIa';
import { BasIa } from './ia/BasIa';
import { PorteeIa } from './ia/PorteeIa';
import { QuotaIa } from './ia/QuotaIa';
import type { SuggestionIa } from './ia/suggestionsIa';
import { PropositionIa, type Proposition } from './PropositionIa';
import { Banner, Button } from '@ph/ui';
import { useEffect, useState } from 'react';
import { FenetreOffre } from '@/features/offres/FenetreOffre';
import { posterJson } from '@/lib/posterJson';

/**
 * Panneau IA (IA_SITE §2.3) : la demande part sur le brouillon enregistré ; la proposition est
 * montrée avant tout changement, appliquée en une seule étape d'historique (Ctrl Z annule tout).
 * Rien n'est publié par l'IA.
 */
export function PanneauIa({
  pageId,
  selection,
  iaComplete,
  restantsInitiaux,
  enregistrer,
  appliquer,
  onProposition,
  initial,
  nomSelection,
  suggestions,
}: {
  pageId: string;
  selection: string | null;
  /** Nom de la sélection, affiché sur la portée « Sélection ». */
  nomSelection?: string;
  suggestions: SuggestionIa[];
  iaComplete: boolean;
  restantsInitiaux: RestantsIa;
  enregistrer: () => Promise<string | null>;
  appliquer: (ops: OperationIa[]) => string | null;
  /** Proposition affichée dans l'aperçu, changements surlignés ; `null` quand elle disparaît. */
  onProposition: (ops: OperationIa[] | null) => void;
  /** Demande préparée depuis un autre panneau (nouvelle page, référencement). */
  initial?: { mode: ModeIaSite; portee: 'selection' | 'page' | 'site'; demande: string };
}) {
  const [mode, setMode] = useState<ModeIaSite | 'auto'>(
    initial?.mode ?? (iaComplete ? 'auto' : 'textes'),
  );
  const [restants, setRestants] = useState(restantsInitiaux);
  const [portee, setPortee] = useState<'selection' | 'page' | 'site'>(
    initial?.portee ?? (selection ? 'selection' : 'page'),
  );
  const [demande, setDemande] = useState(initial?.demande ?? '');
  const [prop, setProp] = useState<Proposition | null>(null);
  const [message, setMessage] = useState<{ ton: 'danger' | 'succes'; texte: string } | null>(null);
  const [enCours, setEnCours] = useState(false);
  useEffect(() => {
    onProposition(prop?.operations.length ? prop.operations : null);
  }, [prop, onProposition]);
  useEffect(() => () => onProposition(null), [onProposition]);
  const verrou = !iaComplete && !MODES.find((m) => m.mode === mode)!.essai;

  const envoyer = async (avecReponse?: string) => {
    setEnCours(true);
    setMessage(null);
    const e = await enregistrer();
    if (e) {
      setEnCours(false);
      return setMessage({ ton: 'danger', texte: e });
    }
    const r = await posterJson<Proposition & { mode: ModeIaSite; restant: number }>(
      '/api/pro/site/ia',
      {
        ...(mode === 'auto' ? {} : { mode }),
        portee,
        pageId,
        cibles: portee === 'selection' && selection ? [selection] : [],
        demande,
        ...(avecReponse ? { reponse: avecReponse } : {}),
      },
    );
    setEnCours(false);
    if (!r.ok) return setMessage({ ton: 'danger', texte: r.message });
    const cat = CATEGORIE_MODE[r.data.mode] === 'textes' ? 'textes' : 'composants';
    setRestants((x) => ({ ...x, [cat]: r.data.restant }));
    setProp(r.data);
  };

  return (
    <div className="grid gap-4 [grid-template-columns:minmax(0,1fr)]">
      <QuotaIa r={restants} />
      {message ? <Banner tone={message.ton}>{message.texte}</Banner> : null}
      {prop?.question ? (
        <QuestionIa
          question={prop.question}
          enCours={enCours}
          onRepondre={(r) => void envoyer(r)}
          onPasser={() => setProp(null)}
        />
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
      <form
        className="grid gap-2.5 rounded-[10px] border border-trait p-3 [grid-template-columns:minmax(0,1fr)]"
        onSubmit={(e) => {
          e.preventDefault();
          setProp(null);
          void envoyer();
        }}
      >
        <label htmlFor="demande-ia" className="text-[13px] font-bold text-neutre-800">
          Demandez à l’IA
        </label>
        <PorteeIa
          portee={portee}
          onChange={setPortee}
          selection={selection}
          {...(nomSelection ? { nomSelection } : {})}
        />
        <textarea
          id="demande-ia"
          rows={3}
          value={demande}
          maxLength={1000}
          onChange={(e) => setDemande(e.target.value)}
          placeholder="Ex. : « Plus court et plus chaleureux », « Mets Mérignac dans le titre »."
          className="min-h-24 w-full min-w-0 rounded-[8px] border border-trait px-3 py-2 text-base"
        />
        <label className="grid min-w-0 gap-1.5 text-[13px] font-bold text-neutre-800">
          Que voulez-vous faire ?
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as ModeIaSite | 'auto')}
            className="min-h-11 w-full min-w-0 rounded-[8px] border border-trait bg-blanc px-3 text-base font-normal"
          >
            {MODES.map((m) => (
              <option key={m.mode} value={m.mode}>
                {!iaComplete && !m.essai ? '🔒 ' : ''}
                {m.libelle}
              </option>
            ))}
          </select>
        </label>
        {verrou ? (
          <div className="grid gap-2 rounded-[8px] bg-accent-100 p-3 text-[13px]">
            Cette demande est incluse dans Site Pro : sections, pages et couleurs créées en un clic,
            modifiables ensuite à la main.
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
          <>
            <Button
              chargement={enCours}
              type="submit"
              pleineLargeur
              disabled={enCours || demande.trim().length < 3}
            >
              {enCours ? 'L’IA prépare une proposition…' : 'Proposer'}
            </Button>
            <span className="text-xs text-neutre-600">{texteRestants(restants, mode)}</span>
          </>
        )}
      </form>
      <BasIa suggestions={suggestions} />
    </div>
  );
}
