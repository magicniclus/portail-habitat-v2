import type { Niveau } from '../schemas/dessinScene';
import { ailesDuNiveau, repereMaison, sousToit } from './ailesToit';
import type { TypeToiture } from './toitures';

/** Au-delà de cette profondeur, un monopente (15°) monte de plus de 2 m : peu adapté. */
const PROFONDEUR_MONOPENTE = 7_000;
/** En deçà, des combles en mansarde n'ont pas la place de leurs brisis. */
const PROFONDEUR_MANSARDE = 7_000;
/** Écart toléré (rad) pour qu'un mur suive les axes de la maison. */
const TOLERANCE_AXE = (2 * Math.PI) / 180;

const TYPES: TypeToiture[] = [
  'deux_pans',
  'quatre_pans',
  'croupe',
  'monopente',
  'plate',
  'mansarde',
];

/**
 * Toits conseillés selon la forme de la maison (DES-16) : `null` = conseillé, sinon la raison
 * pour laquelle cette forme n'est pas optimale ici (affichée sous la carte). Tous restent
 * possibles : c'est un conseil, jamais un refus.
 */
export function conseilsToit(
  n: Pick<Niveau, 'murs' | 'pieces'>,
  dessus: Pick<Niveau, 'murs' | 'pieces'> | null = null,
): Record<TypeToiture, string | null> {
  const avis = Object.fromEntries(TYPES.map((t) => [t, null])) as Record<
    TypeToiture,
    string | null
  >;
  const ailes = n.murs.length >= 3 ? ailesDuNiveau(n, dessus) : [];
  if (!ailes.length) return avis;
  const plusieurs = ailes.length > 1;
  // Profondeur sous le faîtage : le petit côté de la plus large des parties.
  const profondeur = Math.max(...ailes.map((w) => Math.min(w.a1 - w.a0, w.b1 - w.b0)));
  const r = repereMaison(n);
  const biais = n.murs
    .filter((m) => m.type === 'mur')
    .some((m) => {
      const angle = Math.atan2(m.b.y - m.a.y, m.b.x - m.a.x) - Math.atan2(r.u.y, r.u.x);
      const reste = Math.abs(angle) % (Math.PI / 2);
      return Math.min(reste, Math.PI / 2 - reste) > TOLERANCE_AXE;
    });
  const patio = n.pieces.length > sousToit(n.pieces).length;

  if (plusieurs) {
    const raison = 'Maison en plusieurs parties (L, T, U…) : raccords difficiles, peu courant.';
    avis.monopente = 'Maison en plusieurs parties : un seul pan monterait très haut d’un côté.';
    avis.croupe = raison;
    avis.mansarde = raison;
  } else if (profondeur > PROFONDEUR_MONOPENTE)
    avis.monopente = 'Maison profonde : le pan unique monterait très haut.';
  if (!plusieurs && biais)
    avis.mansarde = 'Murs en biais : brisis de mansarde difficiles à raccorder.';
  else if (!plusieurs && profondeur < PROFONDEUR_MANSARDE)
    avis.mansarde = 'Maison trop étroite pour des combles en mansarde.';
  if (patio)
    avis.deux_pans =
      'Autour d’un patio, les pignons se multiplient : préférez quatre pans ou plat.';
  return avis;
}
