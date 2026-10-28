'use client';

import {
  changerNombreBlocs,
  operationNoeud,
  parentDe,
  trouverNoeud,
  type Ligne,
  type PageSite,
} from '@ph/core/sites';
import { useCallback, useEffect, useState } from 'react';
import type { MessageApercu } from './Canevas';
import type { OpSelection } from './selection';

const nouvelId = () => Math.random().toString(36).slice(2, 10);

/**
 * Sélection de l'éditeur : clic dans l'aperçu ou la structure, actions (monter, dupliquer,
 * supprimer…), Échap pour le parent, raccourcis Suppr, Ctrl D, Ctrl Z (aussi depuis l'aperçu).
 */
export function useSelection(o: {
  page: PageSite;
  majPage: (f: (p: PageSite) => PageSite) => void;
  annuler: () => void;
  retablir: () => void;
  flash: (m: string) => void;
  /** « + Zone » / « + Section » sous la sélection : ouvre Ajouter sur le bon onglet. */
  ouvrirAjout: (onglet: 'zones' | 'sections' | 'contenus') => void;
  /** Texte modifié directement sur la page (double-clic). */
  onTexte: (id: string, html: string, texte: string, simple: boolean) => void;
}) {
  const { page, majPage, annuler, retablir, flash, ouvrirAjout, onTexte } = o;
  const [selection, setSelection] = useState<string | null>(null);
  const [defiler, setDefiler] = useState(0);

  const agir = useCallback(
    (op: OpSelection | 'zone' | 'section' | 'contenu', id = selection) => {
      // Ajouter sous la sélection (ou, sans sélection, en bas de la page) : le panneau Ajouter
      // s'ouvre, l'insertion suit la sélection.
      if (op === 'zone' || op === 'section' || op === 'contenu')
        return ouvrirAjout(op === 'zone' ? 'zones' : op === 'section' ? 'sections' : 'contenus');
      if (!id) return;
      if (id === 'nav') {
        if (op === 'supprimer')
          flash(
            'La navigation est commune à tout le site : masquez-la sur cette page (onglet Avancé).',
          );
        return;
      }
      if (op === 'bloc') {
        const l = trouverNoeud(page, id)?.noeud as Ligne | undefined;
        if (!l || l.cols.length >= 6) return flash('6 blocs au maximum.');
        return majPage((p) => changerNombreBlocs(p, id, l.cols.length + 1, nouvelId));
      }
      const sens = op === 'gauche' ? 'haut' : op === 'droite' ? 'bas' : op;
      const r = operationNoeud(page, id, sens, nouvelId);
      if (r.erreur) return flash(r.erreur);
      majPage(() => r.page);
      setSelection(r.selection);
      if (sens === 'supprimer') flash('Supprimé · Ctrl Z pour annuler');
    },
    [selection, page, majPage, flash, ouvrirAjout],
  );

  const touche = useCallback(
    (k: { key: string; ctrl: boolean; shift: boolean }) => {
      const t = k.key.toLowerCase();
      if (k.ctrl && (t === 'y' || (t === 'z' && k.shift))) return retablir();
      if (k.ctrl && t === 'z') return annuler();
      if (k.ctrl && t === 'd') return agir('dupliquer');
      if (t === 'escape') return setSelection((s) => (s && s !== 'nav' ? parentDe(page, s) : null));
      if (t === 'delete' || t === 'backspace') agir('supprimer');
    },
    [agir, annuler, retablir, page],
  );

  // Raccourcis de la page elle-même (hors champs de saisie ; Ctrl Z est géré par l'historique).
  useEffect(() => {
    const clavier = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, select, [contenteditable]')) return;
      const ctrl = e.ctrlKey || e.metaKey;
      if (e.key === 'Escape' || e.key === 'Delete' || (ctrl && e.key.toLowerCase() === 'd')) {
        e.preventDefault();
        touche({ key: e.key, ctrl, shift: e.shiftKey });
      }
    };
    window.addEventListener('keydown', clavier);
    return () => window.removeEventListener('keydown', clavier);
  }, [touche]);

  const recevoir = useCallback(
    (m: MessageApercu) => {
      if (m.type === 'choisir') setSelection(m.id);
      else if (m.type === 'action') {
        // « + » d'une zone ou d'un bloc vide : il devient la sélection, puis Ajouter s'ouvre.
        if (m.id) setSelection(m.id);
        agir(m.op as OpSelection, m.id);
      } else if (m.type === 'edition') setSelection(m.id);
      else if (m.type === 'texte') onTexte(m.id, m.html, m.texte, m.simple);
      else if (m.type === 'touche') touche(m);
    },
    [agir, touche, onTexte],
  );

  return {
    selection,
    choisir: (id: string | null, amener = false) => {
      setSelection(id);
      if (amener) setDefiler((n) => n + 1);
    },
    defiler,
    agir,
    recevoir,
  };
}
