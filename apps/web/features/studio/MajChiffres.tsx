'use client';

import type { PublicationStudio } from '@ph/firebase/studio';
import { Banner, Button } from '@ph/ui';
import { useState, useTransition } from 'react';
import { ChampsChiffres, versEntree, type Chiffres } from './ChampsChiffres';
import { noterChiffres } from './publication';

const texte = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n));

/** Mettre à jour les chiffres d'une vidéo publiée à la main. */
export function MajChiffres({ publication }: { publication: PublicationStudio }) {
  const s = publication.stats;
  const [chiffres, setChiffres] = useState<Chiffres>({
    vues: texte(s?.vues),
    likes: texte(s?.likes),
    commentaires: texte(s?.commentaires),
    partages: texte(s?.partages),
    abonnesGagnes: texte(s?.abonnesGagnes),
    retentionPourcent:
      s?.retention === null || s?.retention === undefined
        ? ''
        : String(Math.round(s.retention * 100)),
  });
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  return (
    <details className="w-full">
      <summary className="min-h-11 cursor-pointer text-sm">Mettre à jour les chiffres</summary>
      <div className="mt-2 grid gap-3">
        <ChampsChiffres valeur={chiffres} onChange={setChiffres} />
        {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
        <div>
          <Button
            taille="sm"
            disabled={enCours || chiffres.vues.trim() === ''}
            onClick={() =>
              demarrer(async () => {
                setErreur(null);
                const r = await noterChiffres({
                  publicationId: publication.id,
                  ...versEntree(chiffres),
                });
                if (!r.ok) setErreur(r.message);
              })
            }
          >
            Enregistrer
          </Button>
        </div>
      </div>
    </details>
  );
}
