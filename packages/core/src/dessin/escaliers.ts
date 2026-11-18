import { echec, succes, type Resultat } from '../resultat';
import { escalier as schemaEscalier, type Niveau, type Point } from '../schemas/dessinScene';
import type { Contexte } from './commandes';

/** Escaliers (DES-15) : calcul des marches, emprise au sol, trémie de l'étage. */
export type Escalier = Niveau['escaliers'][number];
export type TypeEscalier = Escalier['type'];

export const LIBELLES_ESCALIER: Record<TypeEscalier, string> = {
  droit: 'Escalier droit',
  quart_bas: 'Quart tournant en bas',
  quart_haut: 'Quart tournant en haut',
  deux_quarts: 'Deux quarts tournants',
  helicoidal: 'Hélicoïdal',
  meunier: 'Échelle de meunier',
};

/** Hauteur de marche visée (17,5 cm) et loi de Blondel (2 h + g = 63 cm). */
const HAUTEUR_IDEALE = 175;
const BLONDEL = 630;

/** Nombre de marches et giron pour une hauteur à monter. */
export function calculerMarches(
  hauteurAMonter: number,
  type: TypeEscalier,
): { nbMarches: number; giron: number } {
  const h = type === 'meunier' ? 210 : HAUTEUR_IDEALE;
  const nbMarches = Math.min(40, Math.max(2, Math.round(hauteurAMonter / h)));
  const hauteur = hauteurAMonter / nbMarches;
  const giron = type === 'meunier' ? 150 : Math.round(BLONDEL - 2 * hauteur);
  return { nbMarches, giron: Math.min(400, Math.max(100, giron)) };
}

/** Longueur au sol de la volée (ligne de foulée), en mm. */
export const longueurVolee = (e: Pick<Escalier, 'nbMarches' | 'giron'>) =>
  (e.nbMarches - 1) * e.giron;

/**
 * Emprise au sol (polygone, avant rotation autour de `position`) : un rectangle pour un
 * escalier droit, un L pour un quart tournant, un U pour deux quarts, un carré pour un
 * hélicoïdal.
 */
export function empriseLocale(
  e: Pick<Escalier, 'type' | 'largeur' | 'nbMarches' | 'giron'>,
): Point[] {
  const L = longueurVolee(e);
  const l = e.largeur;
  if (e.type === 'helicoidal') {
    const c = Math.max(2 * l, 1400);
    return [
      { x: 0, y: 0 },
      { x: c, y: 0 },
      { x: c, y: c },
      { x: 0, y: c },
    ];
  }
  if (e.type === 'quart_bas' || e.type === 'quart_haut') {
    const branche = Math.max(l, L - l);
    return [
      { x: 0, y: 0 },
      { x: l, y: 0 },
      { x: l, y: branche },
      { x: l + branche, y: branche },
      { x: l + branche, y: branche + l },
      { x: 0, y: branche + l },
    ];
  }
  if (e.type === 'deux_quarts') {
    const branche = Math.max(l, (L - l) / 2);
    return [
      { x: 0, y: 0 },
      { x: 2 * l, y: 0 },
      { x: 2 * l, y: branche + l },
      { x: 0, y: branche + l },
    ];
  }
  return [
    { x: 0, y: 0 },
    { x: l, y: 0 },
    { x: l, y: L },
    { x: 0, y: L },
  ];
}

/** Emprise placée sur le plan : rotation (dixièmes de degré) autour de `position`. */
export function emprise(e: Escalier): Point[] {
  const a = (e.rotation / 10) * (Math.PI / 180);
  const c = Math.cos(a);
  const s = Math.sin(a);
  return empriseLocale(e).map((p) => ({
    x: Math.round(e.position.x + p.x * c - p.y * s),
    y: Math.round(e.position.y + p.x * s + p.y * c),
  }));
}

export function poserEscalier(
  n: Niveau,
  e: { type: TypeEscalier; position: Point; hauteurAMonter: number; largeur?: number },
  ctx: Contexte,
): Resultat<Niveau> {
  const r = schemaEscalier.safeParse({
    id: ctx.nouvelId('esc'),
    type: e.type,
    position: e.position,
    largeur: e.largeur ?? (e.type === 'meunier' ? 600 : 900),
    hauteurAMonter: e.hauteurAMonter,
    ...calculerMarches(e.hauteurAMonter, e.type),
  });
  if (!r.success) return echec('ENTREE_INVALIDE', { message: r.error.issues[0]!.message });
  return succes({ ...n, escaliers: [...n.escaliers, r.data] });
}

export type ModificationEscalier = Partial<
  Pick<
    Escalier,
    'type' | 'largeur' | 'hauteurAMonter' | 'rotation' | 'position' | 'sens' | 'gardeCorps'
  >
>;

/** Modifier un escalier : marches et giron recalculés si le type ou la hauteur change. */
export function modifierEscalier(
  n: Niveau,
  id: string,
  modif: ModificationEscalier,
): Resultat<Niveau> {
  const e = n.escaliers.find((x) => x.id === id);
  if (!e) return echec('INTROUVABLE');
  const suite = { ...e, ...modif };
  const recalcul =
    modif.type !== undefined || modif.hauteurAMonter !== undefined
      ? calculerMarches(suite.hauteurAMonter, suite.type)
      : {};
  const r = schemaEscalier.safeParse({
    ...suite,
    ...recalcul,
    rotation: ((suite.rotation % 3600) + 3600) % 3600,
  });
  if (!r.success) return echec('ENTREE_INVALIDE', { message: r.error.issues[0]!.message });
  return succes({ ...n, escaliers: n.escaliers.map((x) => (x.id === id ? r.data : x)) });
}

export function supprimerEscalier(n: Niveau, id: string): Resultat<Niveau> {
  if (!n.escaliers.some((x) => x.id === id)) return echec('INTROUVABLE');
  return succes({ ...n, escaliers: n.escaliers.filter((x) => x.id !== id) });
}
