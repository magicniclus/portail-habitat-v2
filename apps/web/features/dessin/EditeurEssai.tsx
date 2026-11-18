'use client';

import { nouvelleScene, type Scene } from '@ph/core/dessin';
import { Skeleton } from '@ph/ui';
import { useEffect, useState } from 'react';
import { routes } from '@/lib/routes';
import { contexteNavigateur } from './etatBase';
import { EspaceDeTravail } from './EspaceDeTravail';
import { lireEssai } from './essai';

/** Éditeur d'essai (DES-03) : reprend l'essai gardé sur l'appareil, sinon un plan vierge. */
export function EditeurEssai() {
  const [scene, setScene] = useState<Scene | null>(null);
  useEffect(() => {
    void lireEssai().then((b) => setScene(b?.scene ?? nouvelleScene(contexteNavigateur.nouvelId)));
  }, []);
  if (!scene)
    return (
      <div className="grid h-dvh place-items-center p-6">
        <Skeleton className="h-40 w-full max-w-md" />
      </div>
    );
  return (
    <EspaceDeTravail
      espace="particulier"
      planId=""
      titre="Mon essai"
      scene={scene}
      revision={0}
      retour={routes.dessin}
      essai
    />
  );
}
