'use client';

import type { OperationIa, QuestionCreation } from '@ph/core/sites';
import { useState } from 'react';
import type { ProprietesEditeur } from '../proprietes';
import type { useBrouillonSite } from '../useBrouillonSite';
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
        <div className="border-b border-trait p-3">
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
      ) : null}
    </>
  );
}
