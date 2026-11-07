'use client';

import type { TYPES_CALQUE } from '@ph/core/studio';
import {
  ajouterCalque,
  ajouterCapture,
  calqueParDefaut,
  couperPlan,
  modifierPlanVideo,
  positionSource,
  verifierPlan,
  type MotTranscrit,
  type PlanMontage,
} from '@ph/core/studio';
import { Banner } from '@ph/ui';
import { useState, useTransition } from 'react';
import { modifierPlan, retoucher } from './actions';
import { ApercuMontage } from './ApercuMontage';
import { BarreMontage } from './BarreMontage';
import { FriseMontage, type Selection } from './FriseMontage';
import { PanneauProprietes } from './PanneauProprietes';
import { useHistorique } from './useHistorique';
import { useLectureMontage } from './useLectureMontage';

/**
 * Éditeur de montage façon logiciel de montage : aperçu, réglages de l'élément choisi, frise
 * (plans et animations) et « + Ajouter ». Tout se fait sur un brouillon (annuler, rétablir),
 * vérifié en direct ; « Enregistrer » le valide côté serveur et relance le rendu. Une nouvelle
 * version du serveur remonte le composant (`key`) : le brouillon repart d'elle.
 */
export function EditeurMontage(p: {
  projetId: string;
  plan: PlanMontage;
  prise: { ecran?: string; camera?: string; voix?: string };
  dureePriseMs: number;
  captures: Record<string, string>;
  mots: MotTranscrit[];
  camera: boolean;
}) {
  const h = useHistorique(p.plan);
  const { brouillon, changer } = h;
  const [selection, setSelection] = useState<Selection>(null);
  const [zoom, setZoom] = useState(1);
  const [message, setMessage] = useState<{ ton: 'succes' | 'danger'; texte: string } | null>(null);
  const [enCours, demarrer] = useTransition();
  const lecture = useLectureMontage(brouillon);
  const ecran = Boolean(p.prise.ecran);
  const contexte = { dureePriseMs: p.dureePriseMs, camera: p.camera, ecran };
  const erreurs = verifierPlan(brouillon, contexte);
  const modifie = brouillon !== p.plan;

  // Plan sous la tête de lecture, et position dans ce plan.
  const ici = positionSource(brouillon, lecture.affiche);
  const ajouterAnimation = (type: (typeof TYPES_CALQUE)[number]) => {
    const x = brouillon.plans[ici.index]!;
    const d = x.source.fin - x.source.debut;
    const c = calqueParDefaut(type, d - ici.tPlan);
    const debut = Math.min(ici.tPlan, Math.max(0, d - 400));
    changer(
      ajouterCalque(brouillon, ici.index, {
        ...c,
        debut,
        fin: Math.min(d, debut + (c.fin - c.debut)),
      }),
    );
    setSelection({ type: 'calque', i: ici.index, k: x.calques.length });
  };
  /** Nouveau plan à la tête de lecture (le plan courant est coupé en deux). */
  const ajouterPlan = (quoi: 'carton' | 'capture') => {
    const coupe = couperPlan(brouillon, ici.index, ici.tPlan);
    const i = coupe.plans.length > brouillon.plans.length ? ici.index + 1 : ici.index;
    changer(
      quoi === 'carton'
        ? modifierPlanVideo(coupe, i, { visuel: 'carton', carton: 'Votre texte', camera: 'cachee' })
        : ajouterCapture(coupe, i, 'fiche_publique'),
    );
    setSelection({ type: 'plan', i });
  };

  const enregistrer = () =>
    demarrer(async () => {
      setMessage(null);
      const r = await modifierPlan({ projetId: p.projetId, plan: brouillon });
      setMessage(
        r.ok
          ? { ton: 'succes', texte: 'Enregistré : la vidéo est en fabrication.' }
          : { ton: 'danger', texte: r.message ?? 'Enregistrement impossible.' },
      );
    });

  return (
    <div className="grid gap-3">
      <BarreMontage
        onAnimation={ajouterAnimation}
        onPlan={ajouterPlan}
        onCouper={() => changer(couperPlan(brouillon, ici.index, ici.tPlan))}
        onAnnuler={h.annuler}
        onRetablir={h.retablir}
        zoom={zoom}
        onZoom={setZoom}
        enregistrable={modifie && erreurs.length === 0 && !enCours}
        enCours={enCours}
        onEnregistrer={enregistrer}
      />
      {erreurs.length ? (
        <Banner tone="attention" titre="À corriger avant d’enregistrer">
          <ul className="m-0 pl-5">
            {erreurs.slice(0, 4).map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </Banner>
      ) : null}
      {message ? <Banner tone={message.ton}>{message.texte}</Banner> : null}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]">
        <ApercuMontage
          plan={brouillon}
          prise={p.prise}
          captures={p.captures}
          mots={p.mots}
          lecture={lecture}
        />
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
            demarrer(async () => {
              setMessage(null);
              const r = await retoucher({ projetId: p.projetId, demande });
              setMessage(
                r.ok
                  ? {
                      ton: 'succes',
                      texte: 'Retouche faite : la nouvelle version est en fabrication.',
                    }
                  : { ton: 'danger', texte: r.message ?? 'Retouche impossible.' },
              );
            })
          }
        />
      </div>

      <FriseMontage
        plan={brouillon}
        dureePriseMs={p.dureePriseMs}
        lecture={lecture}
        zoom={zoom}
        selection={selection}
        onSelection={setSelection}
        onDebut={h.memoriser}
        onChange={h.remplacer}
      />
      <p className="m-0 text-xs text-neutre-700">
        Glissez un plan pour le déplacer, ses bords pour le raccourcir ; glissez une animation pour
        la décaler. Ctrl+Z annule.
      </p>
    </div>
  );
}
