'use client';

import { Banner, Button, ConfirmDialog } from '@ph/ui';
import { useState } from 'react';
import { LigneReglage } from '@/features/espace/LigneReglage';
import { authClient } from '@/lib/firebaseClient';
import { oublierPagesHorsLigne } from '@/features/pwa/horsLigne';
import { desactiverPush } from '@/features/pwa/push';
import { posterJson } from '@/lib/posterJson';
import { routes } from '@/lib/routes';

/**
 * Appareils connectés : celui-ci, et « Déconnecter tous les appareils » (jetons révoqués partout,
 * y compris ici : il faut se reconnecter).
 */
export function Appareils({ appareil }: { appareil: string }) {
  const [erreur, setErreur] = useState<string | null>(null);
  const deconnecter = async (partout: boolean) => {
    await desactiverPush().catch(() => undefined);
    const r = partout
      ? await posterJson<null>('/api/pro/compte/deconnexion', {})
      : await fetch('/api/session', { method: 'DELETE' }).then(
          () => ({ ok: true as const }),
          () => ({ ok: false as const, message: 'Réseau indisponible. Réessayez.' }),
        );
    if (!r.ok) return setErreur(r.message);
    await Promise.all([authClient().then((a) => a.signOut()), oublierPagesHorsLigne()]).catch(
      () => undefined,
    );
    window.location.assign(routes.connexionPro);
  };
  return (
    <>
      <LigneReglage
        libelle={appareil}
        valeur="Cet appareil · actif maintenant"
        action={
          <Button variant="secondaire" taille="sm" onClick={() => deconnecter(false)}>
            Se déconnecter
          </Button>
        }
      />
      <LigneReglage
        libelle="Tous les appareils"
        valeur="Ordinateurs, téléphones et tablettes où vous êtes connecté"
        action={
          <ConfirmDialog
            declencheur={
              <Button variant="secondaire" taille="sm">
                Tout déconnecter
              </Button>
            }
            titre="Déconnecter tous les appareils ?"
            libelleConfirmer="Tout déconnecter"
            onConfirmer={() => deconnecter(true)}
          >
            Vous serez aussi déconnecté ici. À faire si un appareil a été perdu ou si vous pensez
            que quelqu&apos;un d&apos;autre utilise votre compte.
          </ConfirmDialog>
        }
      />
      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
    </>
  );
}
