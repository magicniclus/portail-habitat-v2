'use client';

import {
  ajouterCapture,
  avecCamera,
  couperPlan,
  deplacerPlan,
  modifierCalque,
  modifierPlanVideo,
  rognerPlan,
  supprimerCalque,
  supprimerPlan,
  type PlanMontage,
} from '@ph/core/studio';
import { Button } from '@ph/ui';
import type { Selection } from './FriseMontage';
import { ProprietesCalque } from './ProprietesCalque';
import { ProprietesPlan } from './ProprietesPlan';
import { ReglagesGeneraux } from './ReglagesGeneraux';

/** Panneau de droite de l'éditeur : l'animation choisie, le plan choisi, ou toute la vidéo. */
export function PanneauProprietes({
  brouillon,
  selection,
  onSelection,
  changer,
  ici,
  dureePriseMs,
  ecran,
  camera,
  aDesMots,
  enCours,
  onRetouche,
}: {
  brouillon: PlanMontage;
  selection: Selection;
  onSelection: (s: Selection) => void;
  changer: (p: PlanMontage) => void;
  /** Position de la tête de lecture (plan et temps dans le plan). */
  ici: { index: number; tPlan: number };
  dureePriseMs: number;
  ecran: boolean;
  camera: boolean;
  aDesMots: boolean;
  enCours: boolean;
  onRetouche: (demande: string) => void;
}) {
  const choix = selection;
  const planChoisi = choix ? brouillon.plans[choix.i] : undefined;
  const calqueChoisi = choix?.type === 'calque' ? planChoisi?.calques[choix.k] : undefined;
  const cameraVisible = brouillon.plans.some((x) => x.visuel === 'camera' || x.camera !== 'cachee');
  const setSelection = onSelection;
  const p = { dureePriseMs, camera };
  return (
    <div className="rounded-card border border-trait bg-blanc p-4">
      {calqueChoisi && choix?.type === 'calque' ? (
        <ProprietesCalque
          key={`${choix.i}-${choix.k}`}
          calque={calqueChoisi}
          dureePlanMs={planChoisi!.source.fin - planChoisi!.source.debut}
          onChange={(c) => changer(modifierCalque(brouillon, choix.i, choix.k, c))}
          onSupprimer={() => {
            changer(supprimerCalque(brouillon, choix.i, choix.k));
            setSelection(null);
          }}
        />
      ) : planChoisi && choix ? (
        <ProprietesPlan
          plan={brouillon}
          i={choix.i}
          ecran={ecran}
          camera={p.camera}
          onVisuel={(v) =>
            changer(
              v === 'capture'
                ? ajouterCapture(brouillon, choix.i, 'fiche_publique')
                : modifierPlanVideo(brouillon, choix.i, {
                    visuel: v,
                    ...(v === 'carton' ? { carton: planChoisi.carton ?? 'Votre texte' } : {}),
                  }),
            )
          }
          onScene={(sc) => changer(ajouterCapture(brouillon, choix.i, sc))}
          onChange={(c) => changer(modifierPlanVideo(brouillon, choix.i, c))}
          onRogner={(b) => changer(rognerPlan(brouillon, choix.i, b, p.dureePriseMs))}
          onCouper={() => changer(couperPlan(brouillon, ici.index, ici.tPlan))}
          onDeplacer={(vers) => {
            changer(deplacerPlan(brouillon, choix.i, vers));
            setSelection({ type: 'plan', i: vers });
          }}
          onSupprimer={() => {
            changer(supprimerPlan(brouillon, choix.i));
            setSelection(null);
          }}
        />
      ) : (
        <ReglagesGeneraux
          plan={brouillon}
          camera={p.camera}
          cameraVisible={cameraVisible}
          aDesMots={aDesMots}
          onChange={(c) => changer({ ...brouillon, ...c })}
          onCamera={(montrer) => changer(avecCamera(brouillon, montrer, { ecran }))}
          onRetouche={onRetouche}
          enCours={enCours}
        />
      )}
      {selection ? (
        <Button variant="fantome" taille="sm" className="mt-3" onClick={() => setSelection(null)}>
          ← Réglages de toute la vidéo
        </Button>
      ) : null}
    </div>
  );
}
