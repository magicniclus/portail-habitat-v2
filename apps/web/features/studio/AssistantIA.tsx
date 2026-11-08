'use client';

import type { StatutProjetStudio, SujetStudio } from '@ph/core/studio';
import { useState, type ReactNode } from 'react';
import { EnregistreurPistes, type PriseImportee } from './EnregistreurPistes';
import { FabricationIA } from './FabricationIA';
import { IdeeIA } from './IdeeIA';
import { RetoucheIA } from './RetoucheIA';
import { SourceIA } from './SourceIA';

/** Ce que le panneau IA sait de la vidéo (relu côté serveur à chaque rafraîchissement). */
export interface ProjetIA {
  statut: StatutProjetStudio;
  priseId: string | null;
  /** Dernière activité (ms). */
  depuis: number;
  erreur: string | null;
  sujets: SujetStudio[];
  choisi: SujetStudio | null;
  theme: string;
  /** Claude peut revoir son montage (prise et plan existants). */
  retouche: boolean;
}

function Etape(p: { n: number | '✦'; titre: string; texte?: string; children: ReactNode }) {
  const id = `etape-ia-${p.n === '✦' ? 'retouche' : p.n}`;
  return (
    <section aria-labelledby={id} className="grid gap-2">
      <h3 id={id} className="m-0 flex items-center gap-2 text-sm font-semibold">
        <span
          aria-hidden="true"
          className="grid size-6 place-items-center rounded-full bg-montage-survol text-xs text-montage-selection"
        >
          {p.n}
        </span>
        {p.titre}
      </h3>
      {p.texte ? <p className="m-0 text-xs text-montage-texte-doux">{p.texte}</p> : null}
      {p.children}
    </section>
  );
}

/**
 * Panneau IA du Studio (à gauche) : tout se fait ici, sans quitter l'éditeur. ① une idée
 * (facultatif), ② à partir de quoi Claude fabrique la vidéo (me filmer, ma voix, voix IA, une
 * vidéo ou un audio déjà tournés, ou rien), puis l'avancement avec chargeur ; ou ③ s'enregistrer
 * sur les pistes et monter soi-même. Une fois montée : « Revoir avec Claude ».
 */
export function AssistantIA(p: {
  projetId: string;
  projet: ProjetIA;
  pistesRemplies: boolean;
  enCours: boolean;
  onRetouche: (demande: string) => void;
  onPrise: (prise: PriseImportee, dureeMs: number) => void;
}) {
  const { projet: x } = p;
  const [pistes, setPistes] = useState(false);
  const fabrique = x.statut !== 'enregistrement' && x.statut !== 'sujet' && x.statut !== 'pret';
  return (
    <div className="grid gap-5">
      {x.priseId ? (
        <FabricationIA
          projetId={p.projetId}
          priseId={x.priseId}
          statut={x.statut}
          depuis={x.depuis}
          erreur={x.erreur}
        />
      ) : null}
      {x.retouche && !fabrique ? (
        <Etape n="✦" titre="Revoir le montage avec Claude">
          <RetoucheIA retouche enCours={p.enCours} onRetouche={p.onRetouche} />
        </Etape>
      ) : null}
      <Etape n={1} titre="L’idée" texte="Facultatif : sans idée, vous improvisez.">
        <IdeeIA projetId={p.projetId} sujets={x.sujets} choisi={x.choisi} theme={x.theme} />
      </Etape>
      <Etape
        n={2}
        titre="Claude fait la vidéo à partir de…"
        texte={
          x.choisi
            ? 'Le script de l’idée sert de prompteur et de texte pour la voix IA.'
            : 'Sans idée, Claude monte à partir de ce que vous dites.'
        }
      >
        {fabrique && x.statut !== 'erreur' ? (
          <p className="m-0 text-sm text-montage-texte-doux">
            Claude travaille sur la vidéo : attendez la fin pour en refaire une.
          </p>
        ) : (
          <SourceIA
            projetId={p.projetId}
            script={x.choisi?.script ?? []}
            dureeCibleS={x.choisi?.dureeCibleS ?? 30}
            pistesRemplies={p.pistesRemplies}
            dejaEnregistre={Boolean(x.priseId)}
          />
        )}
      </Etape>
      <Etape
        n={3}
        titre="Ou je monte moi-même"
        texte="Écran, voix et caméra : la prise arrive sur vos pistes, sans Claude."
      >
        <button
          type="button"
          aria-expanded={pistes}
          onClick={() => setPistes(!pistes)}
          className="inline-flex min-h-11 items-center justify-center rounded-[8px] border border-montage-trait px-3 text-sm font-bold hover:bg-montage-survol"
        >
          {pistes ? 'Fermer l’enregistreur' : 'Enregistrer sur les pistes'}
        </button>
        {pistes ? (
          <div className="rounded-[10px] border border-montage-trait p-3">
            <EnregistreurPistes
              projetId={p.projetId}
              onPrise={(prise, duree) => {
                p.onPrise(prise, duree);
                setPistes(false);
              }}
            />
          </div>
        ) : null}
      </Etape>
    </div>
  );
}
