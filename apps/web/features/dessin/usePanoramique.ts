'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import type { MoteurCamera } from './moteurCamera';

type Pointeur = { pointerId: number; clientX: number; clientY: number };

/** Saisie en cours dans un champ : la barre d'espace y tape une espace. */
const dansUnChamp = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

type Geste = { current: { id: number; x: number; y: number } | null };

const commencer = (
  geste: Geste,
  moteur: MoteurCamera,
  setEnCours: (v: boolean) => void,
  ev: Pointeur,
) => {
  moteur.arreter();
  geste.current = { id: ev.pointerId, x: ev.clientX, y: ev.clientY };
  setEnCours(true);
};

/**
 * Faire glisser le plan, comme une feuille sur la table : bouton du milieu, ou barre d'espace
 * maintenue et clic, n'importe où ; au doigt, un doigt sur le fond du plan (`demarrer`).
 * Pendant le geste, rien d'autre ne réagit au pointeur.
 */
export function usePanoramique(conteneur: RefObject<HTMLDivElement | null>, moteur: MoteurCamera) {
  const [espace, setEspace] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const geste = useRef<{ id: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const el = conteneur.current;
    if (!el) return;
    const bas = (ev: PointerEvent) => {
      if (ev.button !== 1 && !(ev.button === 0 && espaceTenu.current)) return;
      ev.preventDefault();
      ev.stopPropagation();
      commencer(geste, moteur, setEnCours, ev);
    };
    const bouge = (ev: PointerEvent) => {
      const g = geste.current;
      if (!g || g.id !== ev.pointerId) return;
      moteur.deplacer(ev.clientX - g.x, ev.clientY - g.y);
      geste.current = { ...g, x: ev.clientX, y: ev.clientY };
    };
    const haut = (ev: PointerEvent) => {
      if (geste.current?.id !== ev.pointerId) return;
      geste.current = null;
      setEnCours(false);
    };
    const espaceTenu = { current: false };
    // La barre d'espace ne vaut « main » qu'avec le pointeur sur le plan, et jamais quand un
    // bouton ou un champ ailleurs a le focus (elle doit alors l'activer ou taper une espace).
    const survol = { current: false };
    const entre = () => void (survol.current = true);
    const sort = () => void (survol.current = false);
    const touche = (ev: KeyboardEvent) => {
      if (ev.key !== ' ' || dansUnChamp(ev.target)) return;
      const tenu = ev.type === 'keydown';
      const ailleurs =
        ev.target instanceof Element && ev.target !== document.body && !el.contains(ev.target);
      if (tenu && (!survol.current || ailleurs)) return;
      if (!tenu && !espaceTenu.current) return;
      if (tenu) ev.preventDefault();
      espaceTenu.current = tenu;
      setEspace(tenu);
    };
    el.addEventListener('pointerdown', bas, { capture: true });
    el.addEventListener('pointerenter', entre);
    el.addEventListener('pointerleave', sort);
    window.addEventListener('pointermove', bouge);
    window.addEventListener('pointerup', haut);
    window.addEventListener('pointercancel', haut);
    window.addEventListener('keydown', touche);
    window.addEventListener('keyup', touche);
    return () => {
      el.removeEventListener('pointerdown', bas, { capture: true });
      el.removeEventListener('pointerenter', entre);
      el.removeEventListener('pointerleave', sort);
      window.removeEventListener('pointermove', bouge);
      window.removeEventListener('pointerup', haut);
      window.removeEventListener('pointercancel', haut);
      window.removeEventListener('keydown', touche);
      window.removeEventListener('keyup', touche);
    };
  }, [conteneur, moteur]);

  return {
    /** Un doigt posé sur le fond du plan : il fait glisser la vue. */
    demarrer: (ev: Pointeur) => commencer(geste, moteur, setEnCours, ev),
    /** Un second doigt arrive : le pincement prend la main. */
    annuler: () => {
      geste.current = null;
      setEnCours(false);
    },
    curseur: enCours ? 'cursor-grabbing' : espace ? 'cursor-grab' : null,
  };
}
