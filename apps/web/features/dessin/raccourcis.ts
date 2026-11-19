import type { Action } from './etat';

/** Raccourcis de l'éditeur (DES-47), listés par la touche « ? » et dans le menu Aide. */
export const RACCOURCIS: readonly [touches: string, action: string][] = [
  ['Ctrl + Z', 'Annuler'],
  ['Ctrl + Maj + Z ou Ctrl + Y', 'Rétablir'],
  ['Échap', 'Finir le tracé en cours'],
  ['Maj + clic', 'Ajouter à la sélection, ou en retirer'],
  ['Glisser depuis le fond', 'Choisir tout ce qui est dans le rectangle (souris)'],
  ['Ctrl + A', 'Tout choisir sur ce niveau'],
  ['Ctrl + C puis Ctrl + V', 'Copier, puis coller (sur ce niveau ou un autre)'],
  ['Ctrl + D', 'Dupliquer la sélection'],
  ['Suppr', 'Supprimer la sélection'],
  ['Flèches', 'Déplacer la sélection de 1 cm'],
  ['Maj + flèches', 'Déplacer de 10 cm'],
  ['R', 'Tourner l’objet choisi d’un quart de tour'],
  ['?', 'Afficher cette liste'],
];

/** Raccourcis (DES-47) : ignorés pendant une saisie dans un champ. */
export function raccourci(ev: globalThis.KeyboardEvent, dispatch: (a: Action) => void) {
  const cible = ev.target as HTMLElement;
  if (cible.closest('input, textarea, select, [contenteditable="true"]')) return;
  const mod = ev.metaKey || ev.ctrlKey;
  const k = ev.key.toLowerCase();
  const pas = ev.shiftKey ? 100 : 10;
  const fleches: Record<string, { x: number; y: number }> = {
    arrowleft: { x: -pas, y: 0 },
    arrowright: { x: pas, y: 0 },
    arrowup: { x: 0, y: -pas },
    arrowdown: { x: 0, y: pas },
  };
  if (mod && k === 'z') dispatch({ type: ev.shiftKey ? 'retablir' : 'annuler' });
  else if (mod && k === 'y') dispatch({ type: 'retablir' });
  else if (mod && k === 'c') dispatch({ type: 'copier' });
  else if (mod && k === 'v') dispatch({ type: 'coller' });
  else if (mod && k === 'd') dispatch({ type: 'dupliquerSelection' });
  else if (mod && k === 'a') dispatch({ type: 'toutSelectionner' });
  else if (k === 'escape') dispatch({ type: 'terminerTrace' });
  else if (k === 'r' && !mod) dispatch({ type: 'tournerSelection' });
  else if (k === 'delete' || k === 'backspace') dispatch({ type: 'supprimerSelection' });
  else if (fleches[k]) {
    dispatch({ type: 'deplacerClavier', delta: fleches[k] });
    dispatch({ type: 'finGeste' });
  } else return;
  ev.preventDefault();
}
