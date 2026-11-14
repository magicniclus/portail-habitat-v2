'use client';

import type { SujetStudio } from '@ph/core/studio';
import {
  FileAudioIcon,
  FileVideoIcon,
  MagicWandIcon,
  MicrophoneIcon,
  RobotIcon,
  UserFocusIcon,
} from '@phosphor-icons/react';
import { useState, type ReactNode } from 'react';
import { EnregistrementIci } from './EnregistrementIci';
import { ImportVideo } from './ImportVideo';
import { ImportVoix } from './ImportVoix';
import { SansPrise } from './SansPrise';
import { VoixSynthese } from './VoixSynthese';

type Source = 'visage' | 'voix' | 'synthese' | 'video' | 'audio' | 'rien';

const SOURCES: { id: Source; titre: string; texte: string; icone: ReactNode }[] = [
  {
    id: 'visage',
    titre: 'Me filmer',
    texte: 'Votre visage et votre voix, le script en prompteur.',
    icone: <UserFocusIcon size={22} aria-hidden="true" />,
  },
  {
    id: 'voix',
    titre: 'Ma voix seulement',
    texte: 'Vous parlez, Claude met les images.',
    icone: <MicrophoneIcon size={22} aria-hidden="true" />,
  },
  {
    id: 'synthese',
    titre: 'Voix IA (ElevenLabs)',
    texte: 'Une voix de synthèse lit le texte.',
    icone: <RobotIcon size={22} aria-hidden="true" />,
  },
  {
    id: 'video',
    titre: 'Une vidéo déjà tournée',
    texte: 'Envoyez la vidéo du téléphone : Claude la monte.',
    icone: <FileVideoIcon size={22} aria-hidden="true" />,
  },
  {
    id: 'audio',
    titre: 'Un audio déjà enregistré',
    texte: 'Envoyez le fichier son : Claude met les images.',
    icone: <FileAudioIcon size={22} aria-hidden="true" />,
  },
  {
    id: 'rien',
    titre: 'Sans rien',
    texte: 'Claude monte tout de suite ; la voix se fera après.',
    icone: <MagicWandIcon size={22} aria-hidden="true" />,
  },
];

/**
 * Étape « La vidéo » du panneau IA : à partir de quoi Claude fabrique la vidéo. Le choix
 * s'ouvre sur place (enregistrer, envoyer un fichier, voix IA, ou rien) ; une fois validé, la
 * fabrication démarre et son avancement s'affiche en haut du panneau.
 */
export function SourceIA(p: {
  projetId: string;
  script: SujetStudio['script'];
  dureeCibleS: number;
  /** Des clips sont déjà sur les pistes : le montage de Claude les remplacera. */
  pistesRemplies: boolean;
  dejaEnregistre: boolean;
}) {
  const [source, setSource] = useState<Source | null>(null);
  return (
    <div className="grid gap-2">
      <div role="radiogroup" aria-label="À partir de quoi faire la vidéo" className="grid gap-1.5">
        {SOURCES.map((s) => (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={source === s.id}
            onClick={() => setSource(source === s.id ? null : s.id)}
            className="grid min-h-14 grid-cols-[28px_minmax(0,1fr)] items-center gap-2 rounded-[10px] border border-montage-trait bg-montage-surface px-3 py-2 text-left text-sm hover:border-montage-selection aria-checked:border-montage-selection aria-checked:bg-montage-survol"
          >
            <span className="text-montage-selection">{s.icone}</span>
            <span className="grid">
              <span className="font-semibold">{s.titre}</span>
              <span className="text-xs text-montage-texte-doux">{s.texte}</span>
            </span>
          </button>
        ))}
      </div>
      {source && (p.pistesRemplies || p.dejaEnregistre) ? (
        <p className="m-0 text-xs text-montage-texte-doux">
          Le montage de Claude remplacera les pistes actuelles ; vos médias restent dans la
          bibliothèque.
        </p>
      ) : null}
      {source ? (
        <div className="grid gap-3 rounded-[10px] border border-montage-trait p-3">
          {source === 'visage' ? (
            <EnregistrementIci projetId={p.projetId} script={p.script} cameraInitiale="" />
          ) : null}
          {source === 'voix' ? <EnregistrementIci projetId={p.projetId} script={p.script} /> : null}
          {source === 'synthese' ? <VoixSynthese projetId={p.projetId} script={p.script} /> : null}
          {source === 'video' ? <ImportVideo projetId={p.projetId} /> : null}
          {source === 'audio' ? <ImportVoix projetId={p.projetId} /> : null}
          {source === 'rien' ? (
            <SansPrise projetId={p.projetId} dureeCibleS={p.dureeCibleS} script={p.script} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
