'use client';

import type { Media } from '@ph/core/studio';
import { Banner, Button, Checkbox, Field, Select } from '@ph/ui';
import { useEffect, useRef, useState } from 'react';
import { importerMedia } from './envoiMedia';
import { useEnregistrement } from './useEnregistrement';

export type PriseImportee = { role: 'voix' | 'ecran' | 'camera'; media: Media }[];

const minutes = (ms: number) =>
  `${Math.floor(ms / 60_000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;

/**
 * Tourner sans quitter le Studio : écran (partage), voix (micro au choix) et caméra
 * facultative ; la prise rejoint la bibliothèque et se pose sur les pistes (voix sur l'audio,
 * écran sur la vidéo, caméra en incrustation par-dessus).
 */
export function EnregistreurPistes(p: {
  projetId: string;
  onPrise: (prise: PriseImportee, dureeMs: number) => void;
}) {
  const [micro, setMicro] = useState('');
  const [camera, setCamera] = useState<string | null>(null);
  const [avecEcran, setAvecEcran] = useState(true);
  const [envoi, setEnvoi] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const e = useEnregistrement({ micro, camera, reductionBruit: true });
  const apercu = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (apercu.current) apercu.current.srcObject = e.fluxCamera;
  }, [e.fluxCamera]);
  const libre = e.etat === 'pret';

  const ajouter = async () => {
    const prise = e.prise;
    if (!prise) return;
    setMessage(null);
    const morceaux = (
      [
        ['voix', prise.voix],
        ['ecran', prise.ecran],
        ['camera', prise.camera],
      ] as const
    ).filter((x): x is readonly ['voix' | 'ecran' | 'camera', Blob] => Boolean(x[1]));
    const faits: PriseImportee = [];
    for (const [i, [role, blob]] of morceaux.entries()) {
      setEnvoi(i / morceaux.length);
      const f = new File([blob], `${role}.webm`, {
        type: blob.type || (role === 'voix' ? 'audio/webm' : 'video/webm'),
      });
      const r = await importerMedia(
        p.projetId,
        f,
        (a) => setEnvoi((i + a) / morceaux.length),
        prise.dureeMs,
      );
      if (typeof r === 'string') {
        setEnvoi(null);
        return setMessage(r);
      }
      faits.push({ role, media: r });
    }
    setEnvoi(null);
    p.onPrise(faits, prise.dureeMs);
    e.recommencer();
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
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
        <Field label="Caméra">
          <Select
            value={camera ?? 'aucune'}
            disabled={!libre}
            onChange={(x) => setCamera(x.target.value === 'aucune' ? null : x.target.value)}
          >
            <option value="aucune">Pas de caméra</option>
            <option value="">Caméra par défaut</option>
            {e.peripheriques.cameras.map((c) => (
              <option key={c.deviceId} value={c.deviceId}>
                {c.label || 'Caméra'}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Checkbox
        checked={avecEcran}
        disabled={!libre}
        onChange={(x) => setAvecEcran(x.target.checked)}
      >
        Enregistrer aussi l’écran
      </Checkbox>
      {camera !== null ? (
        <video
          ref={apercu}
          autoPlay
          muted
          playsInline
          className="aspect-video w-48 rounded-control bg-neutre-900"
        />
      ) : null}
      {e.erreur ? <Banner tone="danger">{e.erreur}</Banner> : null}
      {message ? <Banner tone="danger">{message}</Banner> : null}
      <div className="flex flex-wrap items-center gap-3">
        {libre ? (
          <Button onClick={() => void e.demarrer(avecEcran)}>● Démarrer l’enregistrement</Button>
        ) : e.etat === 'decompte' ? (
          <p className="m-0 text-2xl font-bold" role="status">
            {e.decompte}
          </p>
        ) : e.etat === 'enregistre' ? (
          <>
            <Button variant="danger" onClick={e.arreter}>
              ■ Arrêter
            </Button>
            <span className="font-mono tabular-nums" role="status">
              {minutes(e.ecoule)}
            </span>
          </>
        ) : (
          <>
            <Button disabled={envoi !== null} onClick={() => void ajouter()}>
              {envoi !== null ? `Envoi… ${Math.round(envoi * 100)} %` : 'Ajouter à mes pistes'}
            </Button>
            <Button variant="secondaire" disabled={envoi !== null} onClick={e.recommencer}>
              Recommencer
            </Button>
            <span className="text-sm text-neutre-700">
              Prise de {minutes(e.prise?.dureeMs ?? 0)}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
