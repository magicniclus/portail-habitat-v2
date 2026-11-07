'use client';

import { FORMATS_STUDIO, NOMS_FORMATS, type FormatStudio, type PlanMontage } from '@ph/core/studio';
import { Button, Checkbox, Field, Input, Textarea } from '@ph/ui';
import { Select } from '@ph/ui';
import { useState } from 'react';

/**
 * Réglages de toute la vidéo (rien de choisi dans la frise) : format, sous-titres, musique,
 * caméra, miniature, et retouche demandée à Claude.
 */
export function ReglagesGeneraux({
  plan,
  camera,
  cameraVisible,
  aDesMots,
  onChange,
  onCamera,
  onRetouche,
  enCours,
}: {
  plan: PlanMontage;
  camera: boolean;
  cameraVisible: boolean;
  /** Il y a du texte à sous-titrer (voix transcrite ou script). */
  aDesMots: boolean;
  onChange: (champs: Partial<PlanMontage>) => void;
  onCamera: (montrer: boolean) => void;
  onRetouche: (demande: string) => void;
  enCours: boolean;
}) {
  const [demande, setDemande] = useState('');
  return (
    <div className="grid content-start gap-3">
      <h3 className="m-0 text-base">Toute la vidéo</h3>
      <Field label="Format">
        <Select
          value={plan.format}
          onChange={(e) => onChange({ format: e.target.value as FormatStudio })}
        >
          {NOMS_FORMATS.map((f) => (
            <option key={f} value={f}>
              {FORMATS_STUDIO[f].libelle}
            </option>
          ))}
        </Select>
      </Field>
      <Checkbox
        checked={plan.sousTitres}
        disabled={!aDesMots}
        onChange={(e) => onChange({ sousTitres: e.target.checked })}
      >
        Sous-titres{aDesMots ? '' : ' (aucun texte à sous-titrer)'}
      </Checkbox>
      <Checkbox checked={plan.musique} onChange={(e) => onChange({ musique: e.target.checked })}>
        Musique de fond
      </Checkbox>
      {camera ? (
        <Checkbox checked={cameraVisible} onChange={(e) => onCamera(e.target.checked)}>
          M’afficher à l’image (caméra)
        </Checkbox>
      ) : null}
      {plan.miniature ? (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Texte de la miniature">
            <Input
              value={plan.miniature.texte}
              maxLength={40}
              onChange={(e) =>
                onChange({ miniature: { ...plan.miniature!, texte: e.target.value } })
              }
            />
          </Field>
          <Field label="Mot mis en avant">
            <Input
              value={plan.miniature.accent}
              maxLength={20}
              onChange={(e) =>
                onChange({ miniature: { ...plan.miniature!, accent: e.target.value } })
              }
            />
          </Field>
        </div>
      ) : null}
      <Field
        label="Ou demander une retouche à Claude"
        aide="Ex. « l’accroche est trop longue », « montre plus la fiche », « plus de rythme »."
      >
        <Textarea value={demande} onChange={(e) => setDemande(e.target.value)} rows={3} />
      </Field>
      <div>
        <Button
          variant="secondaire"
          disabled={demande.trim().length < 3 || enCours}
          onClick={() => onRetouche(demande.trim())}
        >
          {enCours ? 'Claude retouche…' : 'Revoir avec Claude'}
        </Button>
      </div>
    </div>
  );
}
