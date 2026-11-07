'use client';

import {
  LIBELLES_CAMERA,
  NOMS_SCENES,
  PLACEMENTS_CAMERA,
  SCENES_CAPTURE,
  type PlanMontage,
  type PlanVideo,
  type SceneCapture,
} from '@ph/core/studio';
import { Button, Field, Input, Select } from '@ph/ui';

const enS = (ms: number) => String(Math.round(ms / 100) / 10);
const enMs = (s: string) => Math.max(0, Math.round(Number(s.replace(',', '.')) * 1000) || 0);

/** Réglages du plan choisi : ce qu'on voit, la caméra, le passage de la prise gardé. */
export function ProprietesPlan({
  plan,
  i,
  ecran,
  camera,
  onVisuel,
  onScene,
  onChange,
  onRogner,
  onCouper,
  onDeplacer,
  onSupprimer,
}: {
  plan: PlanMontage;
  i: number;
  /** Visuels disponibles selon la prise. */
  ecran: boolean;
  camera: boolean;
  onVisuel: (v: PlanVideo['visuel']) => void;
  onScene: (s: SceneCapture) => void;
  onChange: (champs: Partial<PlanVideo>) => void;
  onRogner: (b: { debut?: number; fin?: number }) => void;
  onCouper: () => void;
  onDeplacer: (vers: number) => void;
  onSupprimer: () => void;
}) {
  const x = plan.plans[i]!;
  const scene = plan.captures.find((c) => c.id === x.captureId)?.scene;
  const visuels: (readonly [PlanVideo['visuel'], string])[] = [
    ['capture', 'Capture Portail Travaux'],
    ['carton', 'Carton (texte plein écran)'],
    ...(ecran ? ([['ecran', 'Mon écran']] as const) : []),
    ...(camera ? ([['camera', 'Moi, face caméra']] as const) : []),
  ];
  return (
    <div className="grid content-start gap-3">
      <h3 className="m-0 text-base">
        Plan {i + 1} sur {plan.plans.length}
      </h3>
      <Field label="À l’image">
        <Select value={x.visuel} onChange={(e) => onVisuel(e.target.value as PlanVideo['visuel'])}>
          {visuels.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
      </Field>
      {x.visuel === 'carton' ? (
        <Field label="Texte du carton">
          <Input
            value={x.carton ?? ''}
            maxLength={80}
            onChange={(e) => onChange({ carton: e.target.value })}
          />
        </Field>
      ) : null}
      {x.visuel === 'capture' ? (
        <Field label="Scène filmée sur l’artisan d’exemple">
          <Select value={scene ?? ''} onChange={(e) => onScene(e.target.value as SceneCapture)}>
            {scene ? null : <option value="">Choisir…</option>}
            {NOMS_SCENES.map((s) => (
              <option key={s} value={s}>
                {SCENES_CAPTURE[s].libelle}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
      {camera && x.visuel !== 'camera' ? (
        <Field label="Ma caméra">
          <Select
            value={x.camera}
            onChange={(e) => onChange({ camera: e.target.value as PlanVideo['camera'] })}
          >
            {PLACEMENTS_CAMERA.map((c) => (
              <option key={c} value={c}>
                {LIBELLES_CAMERA[c]}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <Field label="Début dans la prise (s)">
          <Input
            inputMode="decimal"
            value={enS(x.source.debut)}
            onChange={(e) => onRogner({ debut: enMs(e.target.value) })}
          />
        </Field>
        <Field label="Fin dans la prise (s)">
          <Input
            inputMode="decimal"
            value={enS(x.source.fin)}
            onChange={(e) => onRogner({ fin: enMs(e.target.value) })}
          />
        </Field>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondaire" taille="sm" onClick={onCouper}>
          ✂ Couper à la tête de lecture
        </Button>
        <Button
          variant="secondaire"
          taille="sm"
          disabled={i === 0}
          onClick={() => onDeplacer(i - 1)}
          aria-label="Avancer le plan"
        >
          ◀
        </Button>
        <Button
          variant="secondaire"
          taille="sm"
          disabled={i === plan.plans.length - 1}
          onClick={() => onDeplacer(i + 1)}
          aria-label="Reculer le plan"
        >
          ▶
        </Button>
        <Button
          variant="fantome"
          taille="sm"
          disabled={plan.plans.length <= 1}
          onClick={onSupprimer}
        >
          Supprimer le plan
        </Button>
      </div>
    </div>
  );
}
