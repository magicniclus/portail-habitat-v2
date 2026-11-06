'use client';

import { Banner, Button } from '@ph/ui';
import { useState } from 'react';
import { envoyerVoix } from './envoiPrise';

/** Importer une voix seule (mp3, m4a, wav) : la vidéo se fait avec les captures et des cartons. */
export function ImportVoix({ projetId }: { projetId: string }) {
  const [fichier, setFichier] = useState<File | null>(null);
  const [envoi, setEnvoi] = useState<number | null>(null);
  const [message, setMessage] = useState<{ ton: 'succes' | 'danger'; texte: string } | null>(null);
  const envoyer = async () => {
    if (!fichier) return;
    setMessage(null);
    setEnvoi(0);
    const erreur = await envoyerVoix(projetId, fichier, setEnvoi);
    setEnvoi(null);
    setMessage(
      erreur
        ? { ton: 'danger', texte: erreur }
        : { ton: 'succes', texte: 'Voix envoyée : la transcription et le montage commencent.' },
    );
    if (!erreur) setFichier(null);
  };
  return (
    <div className="grid content-start gap-3">
      <label className="grid min-h-11 cursor-pointer place-items-center gap-1 rounded-card border-2 border-dashed border-neutre-400 bg-neutre-100 p-6 text-center hover:border-accent">
        <span className="font-semibold">
          {fichier ? fichier.name : 'Choisir un fichier audio (.mp3, .m4a ou .wav)'}
        </span>
        <span className="text-sm text-neutre-700">
          {fichier
            ? `${Math.round(fichier.size / 1024 / 1024)} Mo`
            : 'Dictaphone, téléphone, micro externe · 200 Mo et 15 min au plus'}
        </span>
        <input
          type="file"
          accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg"
          className="sr-only"
          onChange={(e) => setFichier(e.target.files?.[0] ?? null)}
        />
      </label>
      <p className="m-0 text-sm text-neutre-700">
        Sans image de vous ni de votre écran : le montage montre Portail Travaux, des textes et des
        animations sur toute la vidéo.
      </p>
      {message ? <Banner tone={message.ton}>{message.texte}</Banner> : null}
      <div>
        <Button taille="lg" disabled={!fichier || envoi !== null} onClick={() => void envoyer()}>
          {envoi !== null ? `Envoi… ${Math.round(envoi * 100)} %` : 'Envoyer cette voix'}
        </Button>
      </div>
    </div>
  );
}
