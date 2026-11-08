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

/** Vidéo importée du téléphone (son compris) : 1 Go au plus. */
const IMPORT_MAX_OCTETS = 1024 * 1024 * 1024;

export const dureeMedia = (f: File, balise: 'video' | 'audio') =>
  new Promise<number>((ok) => {
    const v = document.createElement(balise);
    const url = URL.createObjectURL(f);
    v.preload = 'metadata';
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      ok(Number.isFinite(v.duration) ? Math.round(v.duration * 1000) : 0);
    };
    v.onerror = () => ok(0);
    v.src = url;
  });

/**
 * Importe une vidéo tournée au téléphone : elle donne à la fois l'image (face caméra ou écran) et
 * la voix. Envoyée dans Storage (`import.<ext>`), puis le serveur lance la transcription.
 */
export async function envoyerImport(
  projetId: string,
  fichier: File,
  role: 'camera' | 'ecran',
  avancement: (fraction: number) => void,
): Promise<string | null> {
  if (fichier.size > IMPORT_MAX_OCTETS)
    return 'Vidéo trop lourde (plus de 1 Go) : exportez-la en 1080p depuis votre téléphone.';
  const ext = (/\.(mp4|mov|m4v|webm)$/i.exec(fichier.name)?.[1] ?? '').toLowerCase();
  const type = fichier.type || (ext === 'mov' ? 'video/quicktime' : 'video/mp4');
  if (!ext || !/^video\/(mp4|quicktime|webm|x-m4v)$/.test(type))
    return 'Format non pris en charge : choisissez une vidéo .mp4 ou .mov.';
  const dureeMs = await dureeMedia(fichier, 'video');
  if (dureeMs < 1_000)
    return 'Impossible de lire la durée de cette vidéo. Essayez une autre vidéo.';
  if (dureeMs > 15 * 60_000) return 'Vidéo trop longue : 15 minutes au plus.';
  const auth = await authClient();
  await auth.authStateReady();
  const uid = auth.currentUser?.uid;
  if (!uid) return 'Session expirée : déconnectez-vous puis reconnectez-vous à l’admin.';
  const priseId = `p${Date.now().toString(36)}`;
  const chemin = `studio/${uid}/${priseId}/import.${ext}`;
  try {
    await deposerPrise(chemin, new Blob([fichier], { type }), avancement);
  } catch (e) {
    return e instanceof EnvoiImpossible ? e.message : 'L’envoi n’a pas abouti. Réessayez.';
  }
  const r = await enregistrerPrise({
    projetId,
    priseId,
    fichiers:
      role === 'camera' ? { camera: chemin, voix: chemin } : { ecran: chemin, voix: chemin },
    dureeMs,
  });
  return r.ok ? null : r.message;
}

/** Voix seule enregistrée ailleurs (dictaphone, téléphone) : 200 Mo au plus. */
const VOIX_MAX_OCTETS = 200 * 1024 * 1024;
const TYPES_VOIX: Record<string, string> = {
  mp3: 'audio/mpeg',
  m4a: 'audio/x-m4a',
  aac: 'audio/aac',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  webm: 'audio/webm',
};

/**
 * Importe une voix seule : pas d'écran ni de caméra, le montage montre les captures de Portail
 * Travaux, des cartons et des animations sur toute la vidéo.
 */
export async function envoyerVoix(
  projetId: string,
  fichier: File,
  avancement: (fraction: number) => void,
): Promise<string | null> {
  if (fichier.size > VOIX_MAX_OCTETS) return 'Fichier trop lourd (plus de 200 Mo).';
  const ext = (/\.(mp3|m4a|aac|wav|ogg|webm)$/i.exec(fichier.name)?.[1] ?? '').toLowerCase();
  const type = TYPES_VOIX[ext];
  if (!type) return 'Format non pris en charge : choisissez un fichier .mp3, .m4a ou .wav.';
  const dureeMs = await dureeMedia(fichier, 'audio');
  if (dureeMs < 1_000) return 'Impossible de lire la durée de ce son. Essayez un autre fichier.';
  if (dureeMs > 15 * 60_000) return 'Voix trop longue : 15 minutes au plus.';
  const auth = await authClient();
  await auth.authStateReady();
  const uid = auth.currentUser?.uid;
  if (!uid) return 'Session expirée : déconnectez-vous puis reconnectez-vous à l’admin.';
  const priseId = `p${Date.now().toString(36)}`;
  const chemin = `studio/${uid}/${priseId}/voix-import.${ext}`;
  try {
    await deposerPrise(chemin, new Blob([fichier], { type }), avancement);
  } catch (e) {
    return e instanceof EnvoiImpossible ? e.message : 'L’envoi n’a pas abouti. Réessayez.';
  }
  const r = await enregistrerPrise({ projetId, priseId, fichiers: { voix: chemin }, dureeMs });
  return r.ok ? null : r.message;
}
