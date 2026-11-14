'use client';

import {
  useState,
  useSyncExternalStore,
  type KeyboardEvent as EvtClavier,
  type PointerEvent as EvtPointeur,
} from 'react';

export type Cote = 'gauche' | 'droite';
type Largeurs = Record<Cote, number>;

const CLE = 'ph-studio-largeurs';
const DEFAUT: Largeurs = { gauche: 340, droite: 340 };
const MIN: Largeurs = { gauche: 240, droite: 260 };
/** Place gardée à l'aperçu au centre. */
const APERCU_MIN = 360;
const PAS = 16;

const lire = () => {
  try {
    return localStorage.getItem(CLE) ?? '';
  } catch {
    return '';
  }
};
const abonner = (f: () => void) => {
  window.addEventListener('storage', f);
  return () => window.removeEventListener('storage', f);
};

function borner(l: Largeurs): Largeurs {
  const ecran = typeof window === 'undefined' ? 1440 : window.innerWidth;
  const max = (c: Cote, autre: number) => Math.max(MIN[c], ecran - autre - APERCU_MIN);
  const gauche = Math.min(Math.max(MIN.gauche, l.gauche), max('gauche', l.droite));
  return { gauche, droite: Math.min(Math.max(MIN.droite, l.droite), max('droite', gauche)) };
}

function decoder(brut: string): Largeurs {
  const [g, d] = brut.split(',').map(Number);
  return { gauche: g || DEFAUT.gauche, droite: d || DEFAUT.droite };
}

/**
 * Largeurs des panneaux du Studio (bibliothèque à gauche, réglages à droite), réglées en tirant
 * les séparateurs ou au clavier (flèches), et gardées dans ce navigateur.
 */
export function useLargeursPanneaux() {
  const enregistre = useSyncExternalStore(abonner, lire, () => '');
  // Pendant un glissement (ou si le navigateur ne garde rien) : la largeur en cours.
  const [locale, setLocale] = useState<Largeurs | null>(null);
  const actuel = borner(locale ?? decoder(enregistre));

  const garder = (l: Largeurs) => {
    try {
      localStorage.setItem(CLE, `${l.gauche},${l.droite}`);
      window.dispatchEvent(new StorageEvent('storage', { key: CLE }));
      setLocale(null);
    } catch {
      setLocale(l);
    }
  };

  const tirer = (cote: Cote) => (e: EvtPointeur<HTMLElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const x0 = e.clientX;
    const depart = actuel;
    let dernier = depart;
    const bouger = (m: PointerEvent) => {
      const dx = m.clientX - x0;
      dernier = borner({ ...depart, [cote]: depart[cote] + (cote === 'gauche' ? dx : -dx) });
      setLocale(dernier);
    };
    const fin = () => {
      window.removeEventListener('pointermove', bouger);
      window.removeEventListener('pointerup', fin);
      garder(dernier);
    };
    window.addEventListener('pointermove', bouger);
    window.addEventListener('pointerup', fin);
  };

  const clavier = (cote: Cote) => (e: EvtClavier<HTMLElement>) => {
    const sens = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!sens) return;
    e.preventDefault();
    garder(borner({ ...actuel, [cote]: actuel[cote] + sens * PAS * (cote === 'gauche' ? 1 : -1) }));
  };

  return { ...actuel, tirer, clavier };
}
