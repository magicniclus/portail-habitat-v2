'use client';

import { useEffect, useState } from 'react';
import { lireFond, type EspaceDessin } from './api';

export interface FondCharge {
  url: string;
  largeurPx: number;
  hauteurPx: number;
}

/** Image du plan importé : lue par l'API (droits vérifiés), puis mesurée par le navigateur. */
export function useFond(espace: EspaceDessin, planId: string, storagePath: string | null) {
  const [fond, setFond] = useState<{ chemin: string; image: FondCharge } | null>(null);
  useEffect(() => {
    if (!storagePath) return;
    let actif = true;
    void lireFond(espace, planId, storagePath).then((r) => {
      if (!actif || !r.ok) return;
      const img = new Image();
      img.onload = () => {
        if (actif)
          setFond({
            chemin: storagePath,
            image: { url: r.data.url, largeurPx: img.naturalWidth, hauteurPx: img.naturalHeight },
          });
      };
      img.src = r.data.url;
    });
    return () => {
      actif = false;
    };
  }, [espace, planId, storagePath]);
  return fond && fond.chemin === storagePath ? fond.image : null;
}

/** Image réduite à 3 000 px de côté au plus, en JPEG (fond blanc), pour l'envoi (D91). */
export async function reduireImage(fichier: File): Promise<string> {
  const bitmap = await createImageBitmap(fichier);
  const k = Math.min(1, 3000 / Math.max(bitmap.width, bitmap.height));
  const toile = document.createElement('canvas');
  toile.width = Math.round(bitmap.width * k);
  toile.height = Math.round(bitmap.height * k);
  const c = toile.getContext('2d')!;
  c.fillStyle = 'white';
  c.fillRect(0, 0, toile.width, toile.height);
  c.drawImage(bitmap, 0, 0, toile.width, toile.height);
  return toile.toDataURL('image/jpeg', 0.85).split(',')[1]!;
}
