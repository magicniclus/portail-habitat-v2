'use client';

import type { OperationIa, QuestionCreation } from '@ph/core/sites';
import { useState } from 'react';
import type { ProprietesEditeur } from '../proprietes';
import type { useBrouillonSite } from '../useBrouillonSite';
import { ApercuCreation } from './ApercuCreation';
import { AssistantCreation } from './AssistantCreation';
import { BandeauCreation } from './BandeauCreation';

type Assistant = 'questionnaire' | 'reprise' | null;

/** État de la création assistée : assistant ouvert, aperçu gratuit, reprise proposée. */
export function useCreation(
  props: Pick<ProprietesEditeur, 'questionnaire' | 'reprise' | 'apercuInitial'>,
) {
  const [assistant, setAssistant] = useState<Assistant>(
    props.questionnaire ? 'questionnaire' : props.reprise === 'auto' ? 'reprise' : null,
  );
  const [apercuIa, setApercuIa] = useState(props.apercuInitial);
  const [aReprendre, setAReprendre] = useState(props.reprise === 'proposee');
  return { assistant, setAssistant, apercuIa, setApercuIa, aReprendre, setAReprendre };
}

/**
 * Création assistée dans l'éditeur (IA_SITE §3.1, §4) : bandeau de l'aperçu gratuit ou de la
 * reprise après paiement, et l'assistant lui-même quand il est ouvert.
 */
export function CreationEnCours(p: {
  assistant: Assistant;
  onAssistant: (a: Assistant) => void;
  aReprendre: boolean;
  onAReprendre: (v: boolean) => void;
  apercu: boolean;
  onApercu: (ops: OperationIa[] | null) => void;
  s: ReturnType<typeof useBrouillonSite>;
  questionnaire?: { questions: QuestionCreation[]; repris: string[] };
}) {
  const { s } = p;
  return (
    <>
      <BandeauCreation
        apercu={p.apercu}
        aReprendre={p.aReprendre && !p.assistant}
        onFermerApercu={() => p.onApercu(null)}
        onReprendre={() => {
          p.onAReprendre(false);
          p.onAssistant('reprise');
        }}
      />
      {p.assistant ? (
        // Fenêtre plein écran sur mobile, deux colonnes sur ordinateur (maquette) : questions et
        // progression à gauche, aperçu en direct à droite.
        <div className="fixed inset-0 z-50 grid place-items-center bg-neutre-900/55 min-[900px]:p-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Créer le site avec l’IA"
            className="grid h-full w-full overflow-y-auto bg-blanc min-[900px]:h-auto min-[900px]:max-h-[calc(100dvh-48px)] min-[900px]:max-w-[1040px] min-[900px]:rounded-[16px] min-[900px]:[grid-template-columns:minmax(0,1fr)_360px]"
          >
            <div className="grid content-start gap-4 p-5 min-[900px]:p-7">
              <AssistantCreation
                {...(p.assistant === 'questionnaire' && p.questionnaire
                  ? { questionnaire: p.questionnaire }
                  : {})}
                reprise={p.assistant === 'reprise'}
                enregistrer={s.enregistrer}
                appliquer={s.appliquerIa}
                onApercu={p.onApercu}
                onFermer={() => p.onAssistant(null)}
                theme={s.b.theme}
                onTheme={(t) => s.modifier((b) => ({ ...b, theme: t }))}
              />
            </div>
            <div className="border-trait bg-neutre-100 p-5 max-[899px]:border-t min-[900px]:border-l min-[900px]:p-6">
              <ApercuCreation theme={s.b.theme} navigation={s.b.navigation} pages={s.b.pages} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
