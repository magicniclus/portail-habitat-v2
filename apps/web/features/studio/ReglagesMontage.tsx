'use client';

import {
  avecCamera,
  dureePlan,
  FORMATS_STUDIO,
  LIBELLES_CAMERA,
  LIBELLES_VISUEL,
  NOMS_FORMATS,
  type FormatStudio,
  type PlanMontage,
} from '@ph/core/studio';
import { Banner, Button, Checkbox, Field, Select, Textarea } from '@ph/ui';
import { useState, useTransition } from 'react';
import { modifierPlan, retoucher } from './actions';

/** Réglages immédiats (format, caméra, sous-titres) et retouche « revois ça » par Claude. */
export function ReglagesMontage({
  projetId,
  plan,
  camera,
  ecran,
}: {
  projetId: string;
  plan: PlanMontage;
  camera: boolean;
  ecran: boolean;
}) {
  const visible = plan.plans.some((x) => x.visuel === 'camera' || x.camera !== 'cachee');
  const [format, setFormat] = useState<FormatStudio>(plan.format);
  const [montrer, setMontrer] = useState(visible);
  const [sousTitres, setSousTitres] = useState(plan.sousTitres);
  const [demande, setDemande] = useState('');
  const [message, setMessage] = useState<{ ton: 'succes' | 'danger'; texte: string } | null>(null);
  const [enCours, demarrer] = useTransition();
  const change = format !== plan.format || montrer !== visible || sousTitres !== plan.sousTitres;
  const agir = (f: () => Promise<{ ok: boolean; message?: string }>, succes: string) =>
    demarrer(async () => {
      setMessage(null);
      const r = await f();
      setMessage(
        r.ok
          ? { ton: 'succes', texte: succes }
          : { ton: 'danger', texte: r.message ?? 'Action impossible.' },
      );
    });
  const appliquer = () =>
    agir(
      () =>
        modifierPlan({
          projetId,
          plan: { ...(camera ? avecCamera(plan, montrer, { ecran }) : plan), format, sousTitres },
        }),
      'Réglages appliqués : la vidéo est refaite.',
    );
  return (
    <div className="grid content-start gap-3">
      <Field label="Format">
        <Select value={format} onChange={(e) => setFormat(e.target.value as FormatStudio)}>
          {NOMS_FORMATS.map((f) => (
            <option key={f} value={f}>
              {FORMATS_STUDIO[f].libelle}
            </option>
          ))}
        </Select>
      </Field>
      {camera ? (
        <Checkbox checked={montrer} onChange={(e) => setMontrer(e.target.checked)}>
          M’afficher à l’image (caméra)
        </Checkbox>
      ) : null}
      <Checkbox checked={sousTitres} onChange={(e) => setSousTitres(e.target.checked)}>
        Sous-titres mot à mot
      </Checkbox>
      <div>
        <Button variant="secondaire" disabled={!change || enCours} onClick={appliquer}>
          Appliquer les réglages
        </Button>
      </div>
      <Field
        label="Demander une retouche à Claude"
        aide="Ex. « l’accroche est trop longue », « montre plus la fiche », « finis sur l’adresse du site »."
      >
        <Textarea value={demande} onChange={(e) => setDemande(e.target.value)} rows={3} />
      </Field>
      <div>
        <Button
          disabled={demande.trim().length < 3 || enCours}
          onClick={() =>
            agir(
              () => retoucher({ projetId, demande: demande.trim() }),
              'Retouche faite : la nouvelle version est en fabrication.',
            )
          }
        >
          {enCours ? 'Claude retouche…' : 'Revoir avec Claude'}
        </Button>
      </div>
      {message ? <Banner tone={message.ton}>{message.texte}</Banner> : null}
      <details>
        <summary className="min-h-11 cursor-pointer text-sm font-semibold">
          {plan.plans.length} plans · {Math.round(dureePlan(plan) / 1000)} s
        </summary>
        <ol className="m-0 grid gap-1 pl-5 text-sm">
          {plan.plans.map((x) => (
            <li key={x.id}>
              {Math.round((x.source.fin - x.source.debut) / 100) / 10} s ·{' '}
              {LIBELLES_VISUEL[x.visuel]}
              {x.camera !== 'cachee' ? ` · caméra ${LIBELLES_CAMERA[x.camera].toLowerCase()}` : ''}
              {x.calques.length ? ` · ${x.calques.length} animation(s)` : ''}
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}
