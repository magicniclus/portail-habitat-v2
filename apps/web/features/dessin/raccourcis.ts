import type { Action } from './etat';
import type { Vue } from './etatBase';

/** Événement qui ouvre la liste des raccourcis (bouton du rail de droite). */
export const OUVRIR_RACCOURCIS = 'dessin:raccourcis';

/** Raccourcis de l'éditeur (DES-47), listés par la touche « ? » et dans le menu Aide. */
export const RACCOURCIS: readonly [touches: string, action: string][] = [
  ['V', 'Sélectionner'],
  ['M', 'Tracer un mur'],
  ['C', 'Tracer une cloison'],
  ['P', 'Dessiner une pièce rectangulaire'],
  ['O', 'Poser une porte'],
  ['F', 'Poser une fenêtre'],
  ['E', 'Poser un escalier'],
  ['K', 'Coter (deux clics)'],
  ['T', 'Ajouter un texte'],
  ['A', 'Magnétisme activé ou coupé'],
  ['+ et −', 'Zoomer, dézoomer'],
  ['Molette', 'Zoomer autour du pointeur'],
  ['Espace + glisser, ou bouton du milieu', 'Déplacer la vue'],
  ['Glisser une porte ou fenêtre ; ses ronds', 'La déplacer sur son mur ; l’agrandir'],
  ['Chiffres pendant un tracé', 'Taper la longueur du mur'],
  ['Ctrl + Z', 'Annuler'],
  ['Ctrl + Maj + Z ou Ctrl + Y', 'Rétablir'],
  ['Échap', 'Finir le tracé et revenir au curseur normal'],
  ['Alt + glisser', 'Sans aimant (murs, escaliers, poignées de terrasse et de piscine)'],
  ['Maj + clic', 'Ajouter à la sélection, ou en retirer'],
  ['Glisser depuis le fond', 'Choisir tout ce qui est dans le rectangle (souris)'],
  ['Ctrl + A', 'Tout choisir sur ce niveau'],
  ['Ctrl + C puis Ctrl + V', 'Copier, puis coller (sur ce niveau ou un autre)'],
  ['Ctrl + D', 'Dupliquer la sélection'],
  ['Suppr', 'Supprimer la sélection'],
  ['Flèches', 'Déplacer la sélection de 1 cm'],
  ['Maj + flèches', 'Déplacer de 10 cm'],
  ['R', 'Tourner l’objet choisi d’un quart de tour'],
  ['3D : glisser ; Espace + glisser ou clic droit', 'Déplacer la vue ; tourner autour'],
  ['3D : flèches ; Maj + flèches', 'Déplacer la vue ; tourner autour'],
  ['3D : + et − ou molette', 'Zoomer, dézoomer'],
  ['Visite : ↑ ↓ ; ← →', 'Avancer, reculer ; tourner'],
  ['Visite : Z Q S D (ou W A S D)', 'Marcher, se décaler'],
  ['Visite : Ctrl ou Maj enfoncé', 'Accélérer le pas'],
  ['Visite : glisser', 'Regarder autour'],
  ['?', 'Afficher cette liste'],
];

/** Touches simples (sans Ctrl) : outils et zoom. Les chiffres restent à la saisie des longueurs. */
const SIMPLES: Record<string, Action> = {
  v: { type: 'outil', outil: 'selection' },
  m: { type: 'outil', outil: 'mur', typeMur: 'mur' },
  c: { type: 'outil', outil: 'mur', typeMur: 'cloison' },
  p: { type: 'outil', outil: 'piece' },
  o: { type: 'outil', outil: 'ouverture', typeOuverture: 'porte' },
  f: { type: 'outil', outil: 'ouverture', typeOuverture: 'fenetre' },
  e: { type: 'outil', outil: 'escalier', modeleEscalier: 'limons' },
  k: { type: 'outil', outil: 'cote' },
  t: { type: 'outil', outil: 'texte' },
  a: { type: 'aimant' },
  '+': { type: 'zoomer', facteur: 1.25 },
  '=': { type: 'zoomer', facteur: 1.25 },
  '-': { type: 'zoomer', facteur: 0.8 },
};

/**
 * Raccourcis (DES-47) : ignorés pendant une saisie dans un champ. Hors du plan 2D (3D, visite,
 * photo, façades), seuls annuler, rétablir et Échap restent : les flèches et les lettres
 * pilotent alors la caméra ou la marche, jamais le plan.
 */
export function raccourci(
  ev: globalThis.KeyboardEvent,
  dispatch: (a: Action) => void,
  vue: Vue = 'plan',
) {
  const cible = ev.target as HTMLElement;
  if (cible.closest('input, textarea, select, [contenteditable="true"]')) return;
  const mod = ev.metaKey || ev.ctrlKey;
  const k = ev.key.toLowerCase();
  if (vue !== 'plan' && !(mod && (k === 'z' || k === 'y')) && k !== 'escape') return;
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
  else if (k === 'escape') dispatch({ type: 'echap' });
  else if (!mod && !ev.altKey && SIMPLES[k]) dispatch(SIMPLES[k]);
  else if (k === 'r' && !mod) dispatch({ type: 'tournerSelection' });
  else if (k === 'delete' || k === 'backspace') dispatch({ type: 'supprimerSelection' });
  else if (fleches[k]) {
    dispatch({ type: 'deplacerClavier', delta: fleches[k] });
    dispatch({ type: 'finGeste' });
  } else return;
  ev.preventDefault();
}
