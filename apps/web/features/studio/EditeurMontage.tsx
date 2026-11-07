'use client';

import {
  calqueParDefaut,
  couperPlan,
  positionSource,
  verifierPlan,
  verifierRythme,
  type MotTranscrit,
  type Calque,
  type PlanMontage,
  type SceneCapture,
} from '@ph/core/studio';
import { useRef, useState, useTransition } from 'react';
import { modifierPlan, retoucher } from './actions';
import { ApercuMontage } from './ApercuMontage';
import { BarreHautMontage } from './BarreHautMontage';
import { Bibliotheque } from './Bibliotheque';
import { Chronologie } from './Chronologie';
import { CommandesLecture } from './CommandesLecture';
import type { Selection } from './FriseMontage';
import { effacer, poserEffet, poserPlan } from './operationsEditeur';
import { PanneauProprietes } from './PanneauProprietes';
import { useHauteurFrise } from './useHauteurFrise';
import { useHistorique } from './useHistorique';
import { useLectureMontage } from './useLectureMontage';
import { useRaccourcisMontage } from './useRaccourcisMontage';

/**
 * Éditeur de montage plein écran, organisé comme les logiciels de montage : barre du haut,
 * bibliothèque à gauche, aperçu au centre, réglages à droite, frise sur toute la largeur en bas
 * (hauteur réglable). Tout tient dans l'écran ; tout se fait sur un brouillon (annuler,
 * rétablir), vérifié en direct, enregistré et revalidé côté serveur.
 */
export function EditeurMontage(p: {
  projetId: string;
  plan: PlanMontage;
  prise: { ecran?: string; camera?: string; voix?: string };
  dureePriseMs: number;
  captures: Record<string, string>;
  mots: MotTranscrit[];
  camera: boolean;
  etat: string | null;
  onFermer: () => void;
}) {
  const h = useHistorique(p.plan);
  const { brouillon, changer } = h;
  const [selection, setSelection] = useState<Selection>(null);
  const [miniature, setMiniature] = useState(false);
  const frise = useHauteurFrise();
  const [message, setMessage] = useState<{ ton: 'succes' | 'danger'; texte: string } | null>(null);
  const [enCours, demarrer] = useTransition();
  const apercu = useRef<HTMLDivElement>(null);
  const lecture = useLectureMontage(brouillon);
  const ecran = Boolean(p.prise.ecran);
  const erreurs = verifierPlan(brouillon, {
    dureePriseMs: p.dureePriseMs,
    camera: p.camera,
    ecran,
  });
  const ici = positionSource(brouillon, lecture.affiche);
  const appliquer = (r: { plan: PlanMontage; selection: Selection }) => {
    changer(r.plan);
    setSelection(r.selection);
  };
  const scinder = () => changer(couperPlan(brouillon, ici.index, ici.tPlan));
  const supprimer = selection
    ? () => {
        changer(effacer(brouillon, selection));
        setSelection(null);
      }
    : undefined;
  useRaccourcisMontage({ lecture, onScinder: scinder, onSupprimer: supprimer });

  const agir = (f: () => Promise<{ ok: boolean; message?: string }>, ok: string) =>
    demarrer(async () => {
      setMessage(null);
      const r = await f();
      setMessage(
        r.ok
          ? { ton: 'succes', texte: ok }
          : { ton: 'danger', texte: r.message ?? 'Action impossible.' },
      );
    });
  return (
    <div
      data-ambiance="sombre"
      role="dialog"
      aria-modal="true"
      aria-label={`Éditeur de montage : ${brouillon.titre}`}
      className="fixed inset-0 z-50 grid text-montage-texte"
      style={{ gridTemplateRows: `52px minmax(0,1fr) 6px ${frise.hauteur}px` }}
    >
      <BarreHautMontage
        titre={brouillon.titre}
        etat={p.etat}
        message={message}
        erreurs={erreurs}
        rythme={verifierRythme(brouillon).messages}
        modifie={brouillon !== p.plan}
        onFermer={p.onFermer}
        onAnnuler={h.annuler}
        onRetablir={h.retablir}
        enregistrable={erreurs.length === 0 && !enCours}
        enCours={enCours}
        onEnregistrer={() =>
          agir(
            () => modifierPlan({ projetId: p.projetId, plan: brouillon }),
            'Enregistré : la vidéo est en fabrication.',
          )
        }
      />
      <div className="grid min-h-0 grid-cols-[minmax(0,1fr)] gap-px bg-montage-fond lg:grid-cols-[280px_minmax(0,1fr)_340px]">
        <aside aria-label="Bibliothèque" className="hidden min-h-0 bg-montage-panneau lg:block">
          <Bibliotheque
            scenesFilmees={brouillon.captures
              .filter((c) => p.captures[`${c.id}:${c.scene}`])
              .map((c) => c.scene)}
            onCapture={(s: SceneCapture) => appliquer(poserPlan(brouillon, ici, s))}
            onCarton={() => appliquer(poserPlan(brouillon, ici, null))}
            onTexte={(style) =>
              appliquer(
                poserEffet(brouillon, ici, {
                  ...(calqueParDefaut('texte', 2_500) as Extract<Calque, { type: 'texte' }>),
                  style,
                }),
              )
            }
            onAnimation={(t) => appliquer(poserEffet(brouillon, ici, calqueParDefaut(t, 2_500)))}
          />
        </aside>
        <section
          aria-label="Aperçu"
          className="grid min-h-0 grid-rows-[minmax(0,1fr)_56px] bg-montage-fond"
        >
          <div ref={apercu} className="min-h-0 p-3">
            <ApercuMontage
              plan={brouillon}
              prise={p.prise}
              captures={p.captures}
              mots={p.mots}
              lecture={lecture}
              miniature={miniature}
            />
          </div>
          <CommandesLecture
            lecture={lecture}
            miniature={miniature}
            onMiniature={setMiniature}
            avecMiniature={Boolean(brouillon.miniature)}
            onPleinEcran={() => void apercu.current?.requestFullscreen?.()}
          />
        </section>
        <aside
          aria-label="Réglages"
          className="hidden min-h-0 overflow-y-auto bg-montage-panneau p-3 lg:block"
        >
          <PanneauProprietes
            brouillon={brouillon}
            selection={selection}
            onSelection={setSelection}
            changer={changer}
            ici={ici}
            dureePriseMs={p.dureePriseMs}
            ecran={ecran}
            camera={p.camera}
            aDesMots={p.mots.length > 0}
            enCours={enCours}
            onRetouche={(demande) =>
              agir(
                () => retoucher({ projetId: p.projetId, demande }),
                'Retouche lancée : Claude refait le montage.',
              )
            }
          />
        </aside>
      </div>
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Hauteur de la frise"
        onPointerDown={frise.tirer}
        className="cursor-row-resize bg-montage-trait hover:bg-montage-selection"
      />
      <Chronologie
        plan={brouillon}
        dureePriseMs={p.dureePriseMs}
        lecture={lecture}
        mots={p.mots}
        voix={Boolean(p.prise.voix)}
        selection={selection}
        onSelection={setSelection}
        onDebut={h.memoriser}
        onChange={h.remplacer}
        onScinder={scinder}
        onSupprimer={supprimer}
      />
    </div>
  );
}
