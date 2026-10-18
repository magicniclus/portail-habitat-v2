'use client';

import {
  COOKIE_CONNECTE,
  lireBrouillon,
  type BrouillonParcours,
  type OptionsLecture,
  type Parcours,
} from '@ph/core/parcours';
import type { Resultat } from '@ph/core/resultat';
import { useCallback, useEffect, useRef, useState } from 'react';
import { posterJson } from '@/lib/posterJson';

const URL_COMPTE = '/api/parcours/compte';

const connecte = () => document.cookie.split('; ').includes(`${COOKIE_CONNECTE}=1`);

/**
 * Niveau « compte » de la reprise (REPRISE_PARCOURS §5) : pour une personne connectée seulement,
 * brouillon lu à l'arrivée et écrit sur le serveur à chaque changement d'étape (et au départ de
 * la page, via `sendBeacon`). Hors connexion, aucun appel réseau.
 */
export function useBrouillonCompte(
  parcours: Parcours,
  options: Omit<OptionsLecture, 'parcours' | 'maintenant'>,
) {
  const [trouve, setTrouve] = useState<BrouillonParcours | null>(null);
  const etapeEnvoyee = useRef<number | null>(null);
  const aEnvoyer = useRef<BrouillonParcours | null>(null);
  const { prestationExiste, etapeMinimale } = options;

  useEffect(() => {
    if (!connecte()) return;
    let actif = true;
    void posterJson<BrouillonParcours | null>(URL_COMPTE, { action: 'lire', parcours }).then(
      (r: Resultat<BrouillonParcours | null>) => {
        if (!actif || !r.ok || !r.data) return;
        const b = lireBrouillon(r.data, {
          parcours,
          maintenant: Date.now(),
          prestationExiste,
          etapeMinimale,
        });
        etapeEnvoyee.current = b?.etape ?? null;
        setTrouve(b);
      },
    );
    const surDepart = () => {
      const b = aEnvoyer.current;
      if (!b || !connecte()) return;
      aEnvoyer.current = null;
      navigator.sendBeacon?.(
        URL_COMPTE,
        new Blob([JSON.stringify({ action: 'sauver', brouillon: b })], {
          type: 'application/json',
        }),
      );
    };
    window.addEventListener('pagehide', surDepart);
    return () => {
      actif = false;
      window.removeEventListener('pagehide', surDepart);
    };
  }, [parcours, prestationExiste, etapeMinimale]);

  /** Appelé après chaque écriture locale : envoi immédiat si l'étape a changé, sinon au départ. */
  const surEcriture = useCallback((b: BrouillonParcours) => {
    if (!connecte()) return;
    if (b.etape === etapeEnvoyee.current) {
      aEnvoyer.current = b;
      return;
    }
    etapeEnvoyee.current = b.etape;
    aEnvoyer.current = null;
    void posterJson(URL_COMPTE, { action: 'sauver', brouillon: b });
  }, []);

  const surEffacement = useCallback(() => {
    aEnvoyer.current = null;
    etapeEnvoyee.current = null;
    setTrouve(null);
    if (connecte()) void posterJson(URL_COMPTE, { action: 'effacer', parcours });
  }, [parcours]);

  return { trouve, surEcriture, surEffacement };
}
