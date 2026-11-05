'use client';

import { FICHIER_PRISE_MAX_OCTETS } from '@ph/core/studio';
import { authClient, deposerPrise, EnvoiImpossible } from '@/lib/firebaseClient';
import { enregistrerPrise } from './actions';
import type { Prise } from './useEnregistrement';

const extension = (b: Blob) => (b.type.includes('mp4') ? 'mp4' : 'webm');

/** Envoie les fichiers de la prise dans Storage (studio/{uid}/{prise}/), puis prévient le serveur. */
export async function envoyerPrise(
  projetId: string,
  prise: Prise,
  avancement: (fraction: number) => void,
): Promise<string | null> {
  const auth = await authClient();
  await auth.authStateReady();
  const uid = auth.currentUser?.uid;
  if (!uid) return 'Session expirée : déconnectez-vous puis reconnectez-vous à l’admin.';
  const priseId = `p${Date.now().toString(36)}`;
  const fichiers = Object.entries({
    voix: prise.voix,
    ecran: prise.ecran,
    camera: prise.camera,
  }).filter((x): x is [string, Blob] => Boolean(x[1]));
  const trop = fichiers.find(([, b]) => b.size > FICHIER_PRISE_MAX_OCTETS);
  if (trop) return 'Prise trop lourde (plus de 100 Mo) : faites une prise plus courte.';
  const total = fichiers.reduce((n, [, b]) => n + b.size, 0) || 1;
  let envoye = 0;
  const chemins: Record<string, string> = {};
  try {
    for (const [nom, blob] of fichiers) {
      const chemin = `studio/${uid}/${priseId}/${nom}.${extension(blob)}`;
      await deposerPrise(chemin, blob, (f) => avancement((envoye + f * blob.size) / total));
      envoye += blob.size;
      chemins[nom] = chemin;
    }
  } catch (e) {
    return e instanceof EnvoiImpossible ? e.message : 'L’envoi n’a pas abouti. Réessayez.';
  }
  const r = await enregistrerPrise({
    projetId,
    priseId,
    fichiers: {
      voix: chemins.voix!,
      ...(chemins.ecran ? { ecran: chemins.ecran } : {}),
      ...(chemins.camera ? { camera: chemins.camera } : {}),
    },
    dureeMs: prise.dureeMs,
  });
  return r.ok ? null : r.message;
}
