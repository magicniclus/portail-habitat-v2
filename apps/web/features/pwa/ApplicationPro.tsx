'use client';

import { Banner, Button } from '@ph/ui';
import { useEffect, useState } from 'react';
import { modeInstallation, type ModeInstallation } from './installation';
import { PWA_PRO } from './manifest';

interface InvitePwa extends Event {
  prompt: () => Promise<void>;
}

const CLE_VISITES = 'ph-pro-visites';
const CLE_REFUS = 'ph-pro-installation-refusee';

/** Stockage local au mieux : navigation privée ou stockage bloqué → rien n'est retenu. */
function lire(cle: string, stockage: 'local' | 'session' = 'local') {
  try {
    return (stockage === 'local' ? localStorage : sessionStorage).getItem(cle);
  } catch {
    return null;
  }
}
function ecrire(cle: string, valeur: string, stockage: 'local' | 'session' = 'local') {
  try {
    (stockage === 'local' ? localStorage : sessionStorage).setItem(cle, valeur);
  } catch {
    /* rien */
  }
}

/**
 * Application pro (MOB-06) : enregistre le service worker, compte les visites et, dès la 2e,
 * propose d'installer l'application (bouton du navigateur, ou guide pour Safari iOS).
 */
export function ApplicationPro() {
  const [invite, setInvite] = useState<InvitePwa | null>(null);
  const [mode, setMode] = useState<ModeInstallation>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator)
      navigator.serviceWorker
        .register(PWA_PRO.serviceWorker, { scope: PWA_PRO.portee })
        .catch(() => undefined);
    if (!lire('visite', 'session')) {
      ecrire('visite', '1', 'session');
      ecrire(CLE_VISITES, String(Number(lire(CLE_VISITES) ?? 0) + 1));
    }
    const calculer = (e: InvitePwa | null) =>
      setMode(
        modeInstallation({
          visites: Number(lire(CLE_VISITES) ?? 0),
          autonome: window.matchMedia('(display-mode: standalone)').matches,
          refusee: lire(CLE_REFUS) === '1',
          invitePossible: e !== null,
          userAgent: navigator.userAgent,
        }),
      );
    const surInvite = (e: Event) => {
      e.preventDefault();
      setInvite(e as InvitePwa);
      calculer(e as InvitePwa);
    };
    window.addEventListener('beforeinstallprompt', surInvite);
    calculer(null);
    return () => window.removeEventListener('beforeinstallprompt', surInvite);
  }, []);

  if (!mode) return null;
  const refuser = () => {
    ecrire(CLE_REFUS, '1');
    setMode(null);
  };
  return (
    <div className="px-[clamp(16px,3vw,32px)] pt-3">
      <Banner
        tone="info"
        titre="Installez l'application Portail Habitat Pro"
        action={
          <span className="flex flex-wrap gap-2">
            {mode === 'bouton' && invite ? (
              <Button
                taille="sm"
                onClick={() =>
                  invite.prompt().then(
                    () => setMode(null),
                    () => undefined,
                  )
                }
              >
                Installer
              </Button>
            ) : null}
            <Button variant="secondaire" taille="sm" onClick={refuser}>
              Plus tard
            </Button>
          </span>
        }
      >
        {mode === 'bouton'
          ? 'Vos demandes en un geste depuis l’écran d’accueil, même avec peu de réseau.'
          : 'Dans Safari, touchez Partager puis « Sur l’écran d’accueil ».'}
      </Banner>
    </div>
  );
}
