'use client';

import { jetonPush } from '@/lib/firebaseClient';
import { posterJson } from '@/lib/posterJson';

/** Le navigateur sait-il recevoir des notifications push (Safari iOS : application installée) ? */
export const pushPossible = () =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

/** Autorisation demandée sur un geste de la personne (jamais au chargement), puis abonnement. */
export async function activerPush(): Promise<string | null> {
  if ((await Notification.requestPermission()) !== 'granted')
    return 'Notifications refusées : autorisez-les dans les réglages du navigateur.';
  const jeton = await jetonPush(await navigator.serviceWorker.ready).catch(() => null);
  if (!jeton) return 'Les notifications ne sont pas disponibles sur cet appareil.';
  const r = await posterJson<null>('/api/pro/push', { jeton, actif: true });
  return r.ok ? null : r.message;
}

/** Désabonnement de cet appareil (aussi à la déconnexion : plus rien n'arrive ici). */
export async function desactiverPush(): Promise<void> {
  if (!pushPossible() || Notification.permission !== 'granted') return;
  const reg = await navigator.serviceWorker.getRegistration('/pro/');
  if (!reg) return;
  const jeton = await jetonPush(reg, true).catch(() => null);
  if (jeton) await posterJson<null>('/api/pro/push', { jeton, actif: false });
}
