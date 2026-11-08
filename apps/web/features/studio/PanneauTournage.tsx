'use client';

import type { SujetStudio } from '@ph/core/studio';
import { Feuille } from '@ph/ui';
import { MicrophoneIcon, SparkleIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { EnregistreurPistes, type PriseImportee } from './EnregistreurPistes';
import { EtapeEnregistrement } from './EtapeEnregistrement';

const CARTE =
  'grid gap-1 rounded-[10px] border border-montage-trait bg-montage-surface p-3 text-left text-sm hover:border-montage-selection';
const LARGE = 'sm:w-[min(1000px,calc(100vw-32px))]';

/**
 * Onglet Tournage du Studio : enregistrer ici (la prise se pose sur les pistes), ou, pour une
 * vidéo partie d'une idée, tourner avec le script en prompteur et laisser Claude monter.
 */
export function PanneauTournage(p: {
  projetId: string;
  /** Idée et script du projet : tournage « Claude monte » possible. */
  claude: { script: SujetStudio['script']; dureeCibleS: number; dejaEnregistre: boolean } | null;
  onPrise: (prise: PriseImportee, dureeMs: number) => void;
}) {
  const [ouvert, setOuvert] = useState<'pistes' | 'claude' | null>(null);
  return (
    <div className="grid gap-2">
      <button type="button" className={CARTE} onClick={() => setOuvert('pistes')}>
        <span className="flex items-center gap-2 font-semibold">
          <MicrophoneIcon size={18} aria-hidden="true" />
          Enregistrer ici
        </span>
        <span className="text-montage-texte-doux">
          Écran, voix et caméra : la prise arrive sur vos pistes, vous montez vous-même.
        </span>
      </button>
      {p.claude ? (
        <button type="button" className={CARTE} onClick={() => setOuvert('claude')}>
          <span className="flex items-center gap-2 font-semibold">
            <SparkleIcon size={18} aria-hidden="true" />
            Tourner, Claude monte
          </span>
          <span className="text-montage-texte-doux">
            Le script défile en prompteur ; vidéo du téléphone, voix seule ou voix IA possibles.
            Claude fait le montage, qui remplace les pistes.
            {p.claude.dejaEnregistre ? ' Une prise existe déjà.' : ''}
          </span>
        </button>
      ) : null}
      <Feuille
        open={ouvert === 'pistes'}
        onOpenChange={(o) => setOuvert(o ? 'pistes' : null)}
        titre="Enregistrer ici"
        className={LARGE}
      >
        <EnregistreurPistes
          projetId={p.projetId}
          onPrise={(prise, duree) => {
            p.onPrise(prise, duree);
            setOuvert(null);
          }}
        />
      </Feuille>
      {p.claude ? (
        <Feuille
          open={ouvert === 'claude'}
          onOpenChange={(o) => setOuvert(o ? 'claude' : null)}
          titre="Tourner, Claude monte"
          className={LARGE}
        >
          <EtapeEnregistrement
            projetId={p.projetId}
            script={p.claude.script}
            dureeCibleS={p.claude.dureeCibleS}
            dejaEnregistre={p.claude.dejaEnregistre}
          />
        </Feuille>
      ) : null}
    </div>
  );
}
