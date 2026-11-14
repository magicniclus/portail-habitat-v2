'use client';

import { Banner, Button } from '@ph/ui';
import { useState, useSyncExternalStore } from 'react';
import { LigneReglage } from '@/features/espace/LigneReglage';
import { activerPush, desactiverPush, pushPossible } from '@/features/pwa/push';

const ignorer = () => () => undefined;

/**
 * Notifications push de cet appareil (MOB-06) : proposées seulement si le push est ouvert (flag
 * `notificationsPush` + clé VAPID) et géré par le navigateur ; autorisation demandée au clic.
 */
export function NotificationsPush() {
  // Lue dans le navigateur seulement (rendu serveur : indisponible).
  const permission = useSyncExternalStore(
    ignorer,
    () => (pushPossible() ? Notification.permission : null),
    () => null,
  );
  const [choix, setEtat] = useState<'actif' | 'inactif' | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const etat =
    permission === null
      ? 'indisponible'
      : (choix ?? (permission === 'granted' ? 'actif' : 'inactif'));
  if (etat === 'indisponible') return null;
  const basculer = async () => {
    setErreur(null);
    if (etat === 'actif') {
      await desactiverPush();
      return setEtat('inactif');
    }
    const e = await activerPush();
    if (e) setErreur(e);
    else setEtat('actif');
  };
  return (
    <>
      <LigneReglage
        libelle="Notifications sur cet appareil"
        valeur={
          etat === 'actif'
            ? 'Activées : nouvelles demandes, messages et avis s’affichent ici.'
            : 'Soyez prévenu d’une nouvelle demande, même application fermée.'
        }
        action={
          <Button
            variant={etat === 'actif' ? 'secondaire' : 'primaire'}
            taille="sm"
            onClick={basculer}
          >
            {etat === 'actif' ? 'Désactiver' : 'Activer'}
          </Button>
        }
      />
      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
    </>
  );
}
