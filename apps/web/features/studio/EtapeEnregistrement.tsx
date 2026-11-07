'use client';

import { PRISE_MAX_MS, type SujetStudio } from '@ph/core/studio';
import { Banner, Button, Checkbox, Field, Select } from '@ph/ui';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { envoyerPrise } from './envoiPrise';
import { ImportVideo } from './ImportVideo';
import { ImportVoix } from './ImportVoix';
import { NiveauMicro } from './NiveauMicro';
import { Prompteur } from './Prompteur';
import { SansPrise } from './SansPrise';
import { useEnregistrement } from './useEnregistrement';
import { VoixSynthese } from './VoixSynthese';

const minutes = (ms: number) =>
  `${Math.floor(ms / 60_000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;

/** Étape 2 : écran + voix (+ caméra), micro au choix, prompteur, puis envoi de la prise. */
function EnregistrementIci({
  projetId,
  script,
}: {
  projetId: string;
  script: SujetStudio['script'];
}) {
  const [micro, setMicro] = useState('');
  // Caméra choisie par l'auteur : rien n'est demandé au navigateur tant qu'il n'en veut pas.
  const [camera, setCamera] = useState<string | null>(null);
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
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)]">
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
        <p className="m-0 text-sm text-neutre-700">
          Sans écran ni caméra : voix seule, le montage montre Portail Travaux et des animations.
        </p>
        {e.erreur ? <Banner tone="danger">{e.erreur}</Banner> : null}
        {message ? <Banner tone="danger">{message}</Banner> : null}
        <div className="flex flex-wrap items-center gap-3">
          {libre ? (
            <Button taille="lg" disabled={!e.fluxMicro} onClick={() => void e.demarrer(avecEcran)}>
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
  );
}

const MODES = [
  ['ici', '● Enregistrer ici'],
  ['import', '↑ Vidéo du téléphone'],
  ['voix', '🎙 Voix seule (fichier audio)'],
  ['synthese', '✦ Voix ElevenLabs'],
  ['muet', '✦ Claude fait tout (rien à tourner)'],
] as const;
type Mode = (typeof MODES)[number][0];

/**
 * Étape 2 : enregistrer ici (écran, voix, caméra au choix), importer une vidéo du téléphone ou une
 * voix seule, ou faire lire le script par ElevenLabs. Tout mène au même montage.
 */
export function EtapeEnregistrement({
  projetId,
  script,
  dureeCibleS,
  dejaEnregistre,
}: {
  projetId: string;
  script: SujetStudio['script'];
  /** Durée visée du sujet choisi (30 s sans sujet). */
  dureeCibleS: number;
  dejaEnregistre: boolean;
}) {
  const [mode, setMode] = useState<Mode>('ici');
  const aCote = (contenu: ReactNode) => (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)]">
      {contenu}
      <Prompteur script={script} />
    </div>
  );
  return (
    <details open={!dejaEnregistre} className="rounded-card border border-trait bg-blanc p-4">
      <summary className="min-h-11 cursor-pointer text-lg font-bold">
        2. Tournage {dejaEnregistre ? '· vidéo envoyée (vous pouvez la refaire)' : ''}
      </summary>
      <div className="mt-3 grid gap-4">
        <div role="tablist" aria-label="Façon de tourner" className="flex flex-wrap gap-2">
          {MODES.map(([v, l]) => (
            <Button
              key={v}
              role="tab"
              aria-selected={mode === v}
              variant={mode === v ? 'primaire' : 'secondaire'}
              onClick={() => setMode(v)}
            >
              {l}
            </Button>
          ))}
        </div>
        {mode === 'ici' ? <EnregistrementIci projetId={projetId} script={script} /> : null}
        {mode === 'import' ? aCote(<ImportVideo projetId={projetId} />) : null}
        {mode === 'voix' ? aCote(<ImportVoix projetId={projetId} />) : null}
        {mode === 'synthese' ? <VoixSynthese projetId={projetId} script={script} /> : null}
        {mode === 'muet' ? (
          <SansPrise projetId={projetId} dureeCibleS={dureeCibleS} script={script} />
        ) : null}
      </div>
    </details>
  );
}
