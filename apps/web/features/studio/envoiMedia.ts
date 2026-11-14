'use client';

import { LIMITES_MEDIAS, type Media } from '@ph/core/studio';
import { authClient, deposerPrise, EnvoiImpossible } from '@/lib/firebaseClient';
import { ajouterMedia } from './actions';
import { dureeMedia } from './envoiPrise';

const EXTENSIONS = /\.(mp4|mov|m4v|webm|mp3|m4a|wav|aac|ogg|png|jpg|jpeg|webp)$/i;
const LIBELLES = { video: 'Vidéo', audio: 'Son', image: 'Image' } as const;
const PLAFOND = { video: '1 Go', audio: '200 Mo', image: '20 Mo' } as const;

/** Type de média d'un fichier glissé (ou null : ni vidéo, ni son, ni image). */
function typeMedia(f: File): Media['type'] | null {
  if (!EXTENSIONS.test(f.name)) return null;
  const t = f.type.split('/')[0];
  return t === 'video' || t === 'audio' || t === 'image' ? t : null;
}

/**
 * Importe un fichier de l'ordinateur dans la bibliothèque du projet : envoi dans Storage
 * (`studio/{uid}/medias/{id}.{ext}`), durée lue dans le navigateur, puis le serveur relit taille
 * et type et l'ajoute à la frise. Rend le média, ou un message d'erreur.
 */
export async function importerMedia(
  projetId: string,
  fichier: File,
  avancement: (fraction: number) => void,
  /** Durée connue (prise enregistrée ici : le navigateur ne la lit pas toujours). */
  dureeConnueMs?: number,
): Promise<Media | string> {
  const type = typeMedia(fichier);
  if (!type) return `« ${fichier.name} » n’est ni une vidéo, ni un son, ni une image.`;
  if (fichier.size > LIMITES_MEDIAS[type])
    return `${LIBELLES[type]} trop lourde : ${PLAFOND[type]} au plus.`;
  const auth = await authClient();
  await auth.authStateReady();
  const uid = auth.currentUser?.uid;
  if (!uid) return 'Session expirée : déconnectez-vous puis reconnectez-vous à l’admin.';
  const ext = fichier.name.split('.').pop()!.toLowerCase();
  const id = `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const chemin = `studio/${uid}/medias/${id}.${ext}`;
  const dureeMs = type === 'image' ? 0 : (dureeConnueMs ?? (await dureeMedia(fichier, type)));
  try {
    await deposerPrise(chemin, fichier, avancement);
  } catch (e) {
    return e instanceof EnvoiImpossible ? e.message : 'L’envoi n’a pas abouti. Réessayez.';
  }
  const r = await ajouterMedia({
    projetId,
    media: { id, type, chemin, nom: fichier.name.slice(0, 120), dureeMs, taille: fichier.size },
  });
  return r.ok ? r.data : r.message;
}
