'use client';

import { CATEGORIE_MODE, type ModeIaSite, type OperationIa } from '@ph/core/sites';
import { MODES, texteRestants, type RestantsIa } from './modesIa';
import { QuestionIa } from './QuestionIa';
import { PropositionIa, type Proposition } from './PropositionIa';
import { Banner, bouton, Button, Field, Select, Textarea } from '@ph/ui';
import { useState } from 'react';
import { FenetreOffre } from '@/features/offres/FenetreOffre';
import Link from 'next/link';
import { posterJson } from '@/lib/posterJson';
import { routes } from '@/lib/routes';

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
}: {
  pageId: string;
  selection: string | null;
  iaComplete: boolean;
  restantsInitiaux: RestantsIa;
  enregistrer: () => Promise<string | null>;
  appliquer: (ops: OperationIa[]) => string | null;
}) {
  const [mode, setMode] = useState<ModeIaSite | 'auto'>(iaComplete ? 'auto' : 'textes');
  const [restants, setRestants] = useState(restantsInitiaux);
  const [portee, setPortee] = useState<'selection' | 'page' | 'site'>(
    selection ? 'selection' : 'page',
  );
  const [demande, setDemande] = useState('');
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
    <div className="grid gap-4">
      <Link href={routes.proSiteCreationIa} className={bouton({ variant: 'secondaire' })}>
        Créer tout le site avec l’IA
      </Link>
      <Field label="Que voulez-vous faire ?">
        <Select value={mode} onChange={(e) => setMode(e.target.value as ModeIaSite | 'auto')}>
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
      {!verrou ? (
        <p className="m-0 text-sm text-neutre-700">{texteRestants(restants, mode)}</p>
      ) : null}
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
    </div>
  );
}
