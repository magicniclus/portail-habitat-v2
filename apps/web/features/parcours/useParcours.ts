'use client';

import {
  brouillonAJour,
  cleBrouillon,
  lireBrouillon,
  type BrouillonParcours,
  type DonneesBrouillon,
  type OptionsLecture,
  type Parcours,
} from '@ph/core/parcours';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';

/** Regroupe les écritures (un curseur en émet des dizaines, REPRISE_PARCOURS §2). */
const DELAI_ECRITURE_MS = 400;

/** `localStorage` peut être absent ou bloqué (navigation privée, quota) : jamais d'erreur visible. */
const stockage = {
  lire(cle: string): string | null {
    try {
      return window.localStorage.getItem(cle);
    } catch {
      return null;
    }
  },
  ecrire(cle: string, valeur: string) {
    try {
      window.localStorage.setItem(cle, valeur);
    } catch {
      // Stockage indisponible : le parcours continue sans reprise (SIM-06i).
    }
  },
  effacer(cle: string) {
    try {
      window.localStorage.removeItem(cle);
    } catch {
      // idem
    }
  },
};

const nouvelId = () =>
  typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID().replace(/-/g, '')
    : Math.random().toString(36).slice(2, 14).padEnd(12, '0');

const sAbonner = () => () => {};

/**
 * Brouillon d'un parcours sur l'appareil (niveau 1 de REPRISE_PARCOURS §1). Le brouillon trouvé à
 * l'arrivée est lu après l'hydratation (le HTML statique n'en sait rien) puis figé : les écritures du
 * parcours en cours ne font pas réapparaître l'encart.
 */
export function useParcours(
  parcours: Parcours,
  options: Omit<OptionsLecture, 'parcours' | 'maintenant'>,
) {
  const cle = cleBrouillon(parcours);
  // Brut lu une seule fois au premier rendu client (null côté serveur et pendant l'hydratation).
  const brutArrivee = useSyncExternalStore(
    sAbonner,
    () => premiereLecture(cle),
    () => null,
  );
  const { prestationExiste, etapeMinimale } = options;
  const trouve = useMemo(() => {
    if (brutArrivee === null || brutArrivee.brut === null) return null;
    let brut: unknown = null;
    try {
      brut = JSON.parse(brutArrivee.brut);
    } catch {
      brut = null;
    }
    const b = lireBrouillon(brut, {
      parcours,
      maintenant: brutArrivee.lu,
      prestationExiste,
      etapeMinimale,
    });
    // Brouillon illisible, expiré ou d'une prestation disparue : supprimé sans message (§4).
    if (!b) stockage.effacer(cle);
    return b;
  }, [brutArrivee, cle, parcours, prestationExiste, etapeMinimale]);

  const precedent = useRef<BrouillonParcours | null>(null);
  const minuterie = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const enAttente = useRef<(() => void) | null>(null);
  const [autreOnglet, setAutreOnglet] = useState(false);

  useEffect(() => {
    precedent.current = trouve;
  }, [trouve]);

  useEffect(() => {
    const surStockage = (e: StorageEvent) => {
      if (e.key === cle && precedent.current) setAutreOnglet(true);
    };
    // Onglet fermé pendant le délai de regroupement : la dernière réponse est écrite quand même.
    const surDepart = () => enAttente.current?.();
    window.addEventListener('storage', surStockage);
    window.addEventListener('pagehide', surDepart);
    return () => {
      window.removeEventListener('storage', surStockage);
      window.removeEventListener('pagehide', surDepart);
      clearTimeout(minuterie.current);
      // Dernière réponse pas encore écrite (départ de la page) : écrite tout de suite.
      enAttente.current?.();
      // Prochaine arrivée sur le parcours (navigation côté client) : nouvelle lecture.
      lectures.delete(cle);
    };
  }, [cle]);

  /** Enregistre l'état du parcours (sans coordonnées : le schéma strict les refuserait). */
  const ecrire = useCallback(
    (d: Omit<DonneesBrouillon, 'parcours'>) => {
      clearTimeout(minuterie.current);
      enAttente.current = () => {
        enAttente.current = null;
        try {
          const b = brouillonAJour(precedent.current, { ...d, parcours }, Date.now(), nouvelId);
          precedent.current = b;
          stockage.ecrire(cle, JSON.stringify(b));
        } catch {
          // Donnée hors format : on n'enregistre rien plutôt que de bloquer le parcours.
        }
      };
      minuterie.current = setTimeout(() => enAttente.current?.(), DELAI_ECRITURE_MS);
    },
    [cle, parcours],
  );

  const effacer = useCallback(() => {
    clearTimeout(minuterie.current);
    enAttente.current = null;
    precedent.current = null;
    stockage.effacer(cle);
  }, [cle]);

  /** Remet un brouillon effacé (« Annuler » après « Recommencer », §3). */
  const restaurer = useCallback(
    (b: BrouillonParcours) => {
      precedent.current = b;
      stockage.ecrire(cle, JSON.stringify(b));
    },
    [cle],
  );

  return { trouve, ecrire, effacer, restaurer, autreOnglet };
}

interface Lecture {
  brut: string | null;
  /** Instant de la lecture : référence pour la durée de vie du brouillon (30 jours). */
  lu: number;
}

const lectures = new Map<string, Lecture>();
/** Instantané stable pour `useSyncExternalStore` : la première valeur lue dans cette page. */
function premiereLecture(cle: string): Lecture {
  let l = lectures.get(cle);
  if (!l) {
    l = { brut: stockage.lire(cle), lu: Date.now() };
    lectures.set(cle, l);
  }
  return l;
}
