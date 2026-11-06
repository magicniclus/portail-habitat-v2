'use client';

import { Banner, Button } from '@ph/ui';
import { useState } from 'react';
import { envoyerImport } from './envoiPrise';

/** Importer une vidéo tournée au téléphone (image + son), au lieu d'enregistrer ici. */
export function ImportVideo({ projetId }: { projetId: string }) {
  const [fichier, setFichier] = useState<File | null>(null);
  const [role, setRole] = useState<'camera' | 'ecran'>('camera');
  const [envoi, setEnvoi] = useState<number | null>(null);
  const [message, setMessage] = useState<{ ton: 'succes' | 'danger'; texte: string } | null>(null);
  const envoyer = async () => {
    if (!fichier) return;
    setMessage(null);
    setEnvoi(0);
    const erreur = await envoyerImport(projetId, fichier, role, setEnvoi);
    setEnvoi(null);
    setMessage(
      erreur
        ? { ton: 'danger', texte: erreur }
        : { ton: 'succes', texte: 'Vidéo envoyée : la transcription et le montage commencent.' },
    );
    if (!erreur) setFichier(null);
  };
  return (
    <div className="grid content-start gap-3">
      <label className="grid min-h-11 cursor-pointer place-items-center gap-1 rounded-card border-2 border-dashed border-neutre-400 bg-neutre-100 p-6 text-center hover:border-accent">
        <span className="font-semibold">
          {fichier ? fichier.name : 'Choisir une vidéo (.mp4 ou .mov, son compris)'}
        </span>
        <span className="text-sm text-neutre-700">
          {fichier
            ? `${Math.round(fichier.size / 1024 / 1024)} Mo`
            : 'Depuis votre téléphone ou votre ordinateur · 1 Go et 15 min au plus'}
        </span>
        <input
          type="file"
          accept="video/mp4,video/quicktime,video/x-m4v,video/webm,.mov,.mp4,.m4v"
          className="sr-only"
          onChange={(e) => setFichier(e.target.files?.[0] ?? null)}
        />
      </label>
      <fieldset className="m-0 flex flex-wrap gap-4 border-0 p-0">
        <legend className="mb-1 text-sm font-semibold">Cette vidéo, c’est…</legend>
        {(
          [
            ['camera', 'Moi face caméra'],
            ['ecran', 'Un enregistrement d’écran'],
          ] as const
        ).map(([v, l]) => (
          <label key={v} className="flex min-h-11 cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="role-import"
              checked={role === v}
              onChange={() => setRole(v)}
            />
            {l}
          </label>
        ))}
      </fieldset>
      {message ? <Banner tone={message.ton}>{message.texte}</Banner> : null}
      <div>
        <Button taille="lg" disabled={!fichier || envoi !== null} onClick={() => void envoyer()}>
          {envoi !== null ? `Envoi… ${Math.round(envoi * 100)} %` : 'Envoyer cette vidéo'}
        </Button>
      </div>
    </div>
  );
}
