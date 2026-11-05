'use client';

import { PRISE_MAX_MS, type SujetStudio } from '@ph/core/studio';
import { Banner, Button, Checkbox, Field, Select } from '@ph/ui';
import { useEffect, useMemo, useRef, useState } from 'react';
import { envoyerPrise } from './envoiPrise';
import { NiveauMicro } from './NiveauMicro';
import { Prompteur } from './Prompteur';
import { useEnregistrement } from './useEnregistrement';

const minutes = (ms: number) =>
  `${Math.floor(ms / 60_000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;

/** Étape 2 : écran + voix (+ caméra), micro au choix, prompteur, puis envoi de la prise. */
export function EtapeEnregistrement({
  projetId,
  script,
  cameraPrevue,
  dejaEnregistre,
}: {
  projetId: string;
  script: SujetStudio['script'];
  cameraPrevue: boolean;
  dejaEnregistre: boolean;
}) {
  const [micro, setMicro] = useState('');
  const [camera, setCamera] = useState<string | null>(cameraPrevue ? '' : null);
  const [avecEcran, setAvecEcran] = useState(true);
  const [reductionBruit, setReductionBruit] = useState(true);
  const [envoi, setEnvoi] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const e = useEnregistrement({ micro, camera, reductionBruit });
  const apercu = useRef<HTMLVideoElement>(null);
  const ecoute = useMemo(() => (e.prise ? URL.createObjectURL(e.prise.voix) : null), [e.prise]);
  useEffect(() => () => void (ecoute && URL.revokeObjectURL(ecoute)), [ecoute]);
  useEffect(() => {
    if (apercu.current) apercu.current.srcObject = e.fluxCamera;
  }, [e.fluxCamera]);
  const envoyer = async () => {
    if (!e.prise) return;
    setMessage(null);
    setEnvoi(0);
    const erreur = await envoyerPrise(projetId, e.prise, setEnvoi);
    setEnvoi(null);
    if (erreur) setMessage(erreur);
    else e.recommencer();
  };
  const libre = e.etat === 'pret';
  return (
    <details open={!dejaEnregistre} className="rounded-card border border-trait bg-blanc p-4">
      <summary className="min-h-11 cursor-pointer text-lg font-bold">
        2. Enregistrement {dejaEnregistre ? '· prise envoyée (vous pouvez la refaire)' : ''}
      </summary>
      <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)]">
        <div className="grid content-start gap-3">
          <Field label="Micro">
            <Select value={micro} disabled={!libre} onChange={(x) => setMicro(x.target.value)}>
              <option value="">Micro par défaut de l’ordinateur</option>
              {e.peripheriques.micros.map((m) => (
                <option key={m.deviceId} value={m.deviceId}>
                  {m.label || 'Micro'}
                </option>
              ))}
            </Select>
          </Field>
          <NiveauMicro flux={e.fluxMicro} />
          <Checkbox
            checked={reductionBruit}
            disabled={!libre}
            onChange={(x) => setReductionBruit(x.target.checked)}
          >
            Réduction du bruit (à décocher avec un bon micro externe)
          </Checkbox>
          <Field label="Caméra">
            <Select
              value={camera ?? 'aucune'}
              disabled={!libre}
              onChange={(x) => setCamera(x.target.value === 'aucune' ? null : x.target.value)}
            >
              <option value="aucune">Sans caméra</option>
              <option value="">Caméra par défaut</option>
              {e.peripheriques.cameras.map((c) => (
                <option key={c.deviceId} value={c.deviceId}>
                  {c.label || 'Caméra'}
                </option>
              ))}
            </Select>
          </Field>
          <Checkbox
            checked={avecEcran}
            disabled={!libre}
            onChange={(x) => setAvecEcran(x.target.checked)}
          >
            Enregistrer mon écran (le navigateur demande quoi partager)
          </Checkbox>
          {e.erreur ? <Banner tone="danger">{e.erreur}</Banner> : null}
          {message ? <Banner tone="danger">{message}</Banner> : null}
          <div className="flex flex-wrap items-center gap-3">
            {libre ? (
              <Button
                taille="lg"
                disabled={!e.fluxMicro}
                onClick={() => void e.demarrer(avecEcran)}
              >
                ● Démarrer l’enregistrement
              </Button>
            ) : null}
            {e.etat === 'decompte' ? (
              <strong className="text-4xl" aria-live="assertive">
                {e.decompte}
              </strong>
            ) : null}
            {e.etat === 'enregistre' ? (
              <>
                <Button taille="lg" variant="danger" onClick={e.arreter}>
                  ■ Arrêter
                </Button>
                <span className="font-semibold tabular-nums" aria-live="off">
                  {minutes(e.ecoule)} / {minutes(PRISE_MAX_MS)}
                </span>
              </>
            ) : null}
            {e.etat === 'termine' && e.prise ? (
              <>
                <Button taille="lg" disabled={envoi !== null} onClick={() => void envoyer()}>
                  {envoi !== null ? `Envoi… ${Math.round(envoi * 100)} %` : 'Envoyer cette prise'}
                </Button>
                <Button variant="secondaire" disabled={envoi !== null} onClick={e.recommencer}>
                  Refaire
                </Button>
                <span className="text-sm text-neutre-700">Prise de {minutes(e.prise.dureeMs)}</span>
              </>
            ) : null}
          </div>
          {e.etat === 'termine' && ecoute ? (
            <audio controls src={ecoute} className="w-full" aria-label="Réécouter la voix" />
          ) : null}
        </div>
        <div className="grid content-start gap-3">
          {camera !== null ? (
            <video
              ref={apercu}
              autoPlay
              muted
              playsInline
              className="aspect-video w-full rounded-card bg-neutre-900 object-cover"
              aria-label="Aperçu de la caméra"
            />
          ) : null}
          <Prompteur script={script} />
        </div>
      </div>
    </details>
  );
}
