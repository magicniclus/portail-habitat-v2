'use client';

import { useEffect, useLayoutEffect, useRef, useState, type Dispatch, type RefObject } from 'react';
import type { Action } from './etat';
import { MoteurCamera, type Cadre } from './moteurCamera';

/**
 * Navigation du plan 2D, comme dans les logiciels de dessin : une caméra (centre et zoom) que
 * seul l'utilisateur déplace. Le dessin qui grandit, un mur ajouté ou un panneau qui s'ouvre ne
 * font jamais bouger la vue ; la molette zoome autour du pointeur sans à-coup ; les boutons et
 * « Ajuster » (tout le dessin, au-dessus de la feuille du téléphone) glissent en douceur.
 */
export function useCamera(
  conteneur: RefObject<HTMLDivElement | null>,
  /** Zoom de l'état (boutons, raccourcis) et compteur « Ajuster ». */
  etat: { zoom: number; ajustement: number },
  dispatch: Dispatch<Action>,
  /** Ce qu'« Ajuster » doit montrer, lu au moment d'ajuster. */
  aCadrer: () => Cadre,
  /** Hauteur (px) masquée en bas par une feuille ouverte (téléphone). */
  reserveBas: number,
) {
  const [moteur] = useState(() => new MoteurCamera(etat.zoom));
  const [cam, setCam] = useState(moteur.cam);
  const [taille, setTaille] = useState(moteur.taille);
  useLayoutEffect(() => {
    moteur.relier(dispatch, setCam);
  }, [moteur, dispatch]);
  useLayoutEffect(() => {
    const el = conteneur.current;
    return el ? moteur.observer(el, setTaille) : undefined;
  }, [conteneur, moteur]);
  useEffect(() => moteur.zoomExterne(etat.zoom), [moteur, etat.zoom]);

  // « Ajuster » : sans animation la première fois (ouverture du plan).
  const lecture = useRef({ aCadrer, reserveBas });
  useLayoutEffect(() => {
    lecture.current = { aCadrer, reserveBas };
  });
  const premier = useRef(true);
  const pret = taille.w > 0 && taille.h > 0;
  useLayoutEffect(() => {
    if (!pret) return;
    const l = lecture.current;
    moteur.ajuster(l.aCadrer(), l.reserveBas, !premier.current);
    premier.current = false;
  }, [moteur, etat.ajustement, pret]);

  const k = 1000 / cam.zoom;
  const vue: Cadre = {
    x: cam.cx - (taille.w / 2) * k,
    y: cam.cy - (taille.h / 2) * k,
    l: Math.max(1, taille.w * k),
    h: Math.max(1, taille.h * k),
  };
  return { vue, taille, mmParPx: k, moteur };
}
