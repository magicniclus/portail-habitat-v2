import type { Mur, Niveau, Ouverture } from '../schemas/dessinScene';
import { versInterieur } from './menuiseries';
import { CATALOGUE_OUVERTURES } from './ouvertures';
import type { Pave } from './volumes';
import { versLePlan, volets, type Local } from './habillage3d';
import { vantail } from './vantail3d';

/**
 * Menuiseries en 3D (DES-13, DES-33) : dormant, vantaux pleins, vitrés, semi-vitrés ou à
 * cassettes, petits bois, imposte, poignée, volets, seuil, rail des coulissants en applique.
 * `ouvert` (0 à 1) : vantaux battants pivotés vers leur côté, coulissants rangés.
 */
export type Matiere =
  'cadre' | 'panneau' | 'verre' | 'petit_bois' | 'poignee' | 'volet' | 'rail' | 'seuil';
export interface PieceMenuiserie extends Pave {
  matiere: Matiere;
}

const DORMANT = 60;
const IMPOSTE = 400;
const DEUX_VANTAUX: readonly Ouverture['type'][] = [
  'porte_double',
  'porte_galandage_double',
  'fenetre_double',
  'porte_fenetre',
  'baie_coulissante',
];
const COULISSANTS: readonly Ouverture['type'][] = [
  'porte_coulissante',
  'porte_galandage',
  'porte_galandage_double',
  'baie_coulissante',
];
const FIXES: readonly Ouverture['type'][] = ['fenetre_fixe', 'oeil_de_boeuf', 'porte_garage'];
const AVEC_SEUIL: readonly Ouverture['type'][] = [
  'porte_entree',
  'porte_fenetre',
  'baie_coulissante',
];

/** Mesures d'une baie dans son mur, partagées par le dormant et les vantaux. */
interface Baie {
  o: Ouverture;
  ep: number;
  prof: number;
  /** Côté intérieur du mur (+1 ou −1). */
  vi: number;
  p0: number;
  p1: number;
  bas: number;
  haut: number;
  fenetre: boolean;
  /** Porte coulissante en applique : ni dormant ni imposte, un rail au-dessus. */
  applique: boolean;
}
type Pousser = (x: Omit<Local, 'ang'> & { ang?: number }) => void;

/** Dormant (pas de traverse basse sous une porte), imposte vitrée, seuil ; renvoie [z0, z1]. */
function dormant(b: Baie, pousser: Pousser): [number, number] {
  const { o, prof, p0, p1, bas, haut } = b;
  const cadre = (s: number, z: number, l: number, h: number) =>
    pousser({ s, t: 0, z, l, e: prof, h, matiere: 'cadre' });
  if (!b.applique) {
    cadre(p0 + DORMANT / 2, (bas + haut) / 2, DORMANT, o.hauteur);
    cadre(p1 - DORMANT / 2, (bas + haut) / 2, DORMANT, o.hauteur);
    cadre((p0 + p1) / 2, haut - DORMANT / 2, o.largeur, DORMANT);
    if (b.fenetre) cadre((p0 + p1) / 2, bas + DORMANT / 2, o.largeur, DORMANT);
  }
  let z1 = haut - DORMANT;
  if (o.imposte && !b.applique) {
    z1 -= IMPOSTE;
    cadre((p0 + p1) / 2, z1 + DORMANT / 2, o.largeur - 2 * DORMANT, DORMANT);
    pousser({
      s: (p0 + p1) / 2,
      t: 0,
      z: (z1 + DORMANT + haut - DORMANT) / 2,
      l: o.largeur - 2 * DORMANT,
      e: 8,
      h: haut - 2 * DORMANT - z1,
      matiere: 'verre',
    });
  }
  if (AVEC_SEUIL.includes(o.type))
    pousser({
      s: (p0 + p1) / 2,
      t: 0,
      z: bas + 10,
      l: o.largeur,
      e: b.ep,
      h: 20,
      matiere: 'seuil',
    });
  return [b.fenetre ? bas + DORMANT : bas, z1];
}

/** Vantaux : charnière, sens d'ouverture ou de coulissement, poignée sur le dernier ; rail. */
function vantaux(
  b: Baie,
  [z0, z1]: [number, number],
  ouvert: number,
  out: Local[],
  pousser: Pousser,
) {
  const { o, ep, p0, p1, bas, haut, applique } = b;
  const nb = DEUX_VANTAUX.includes(o.type) ? 2 : 1;
  const coulissant = COULISSANTS.includes(o.type);
  const [i0, i1] = applique ? [p0 - 40, p1 + 40] : [p0 + DORMANT, p1 - DORMANT];
  const w = o.type === 'baie_coulissante' ? (i1 - i0) / 2 + 30 : (i1 - i0) / nb;
  const zPoignee = b.fenetre ? (z0 + z1) / 2 : bas + 1_050;
  const cote = o.cote === 'interieur' ? b.vi : -b.vi;
  const tApplique = applique ? cote * (ep / 2 + 30) : 0;
  const zHaut = applique ? haut + 40 : z1;
  for (let i = 0; i < nb; i++) {
    // Vantail i : départ (charnière ou bord) et direction le long du mur.
    const droite = nb === 2 ? i === 1 : o.sens === 'droite';
    const base = droite ? i1 : i0;
    let d = droite ? -1 : 1;
    let dirT = 0;
    let decalage = 0;
    let t0 = tApplique;
    if (coulissant) {
      if (o.type === 'baie_coulissante') {
        t0 = i === 0 ? -20 : 20;
        decalage = i === 1 ? -ouvert * (w - 60) : 0;
      } else decalage = ouvert * w * (droite ? 1 : -1);
    } else if (!FIXES.includes(o.type)) {
      const a = (ouvert * 80 * Math.PI) / 180;
      [d, dirT] = [d * Math.cos(a), cote * Math.sin(a)];
    }
    const ang = Math.atan2(dirT, d);
    const poignee = !FIXES.includes(o.type) && i === nb - 1;
    for (const q of vantail(o, w, applique ? bas : z0, zHaut, poignee, zPoignee))
      out.push({
        s: base + d * q.x - dirT * q.dt + decalage,
        t: t0 + dirT * q.x + d * q.dt,
        z: q.z,
        l: q.l,
        e: q.e,
        h: q.h,
        ang,
        matiere: q.matiere,
      });
  }
  if (applique)
    pousser({
      s: o.sens === 'gauche' ? p0 - o.largeur / 2 + 20 : p1 + o.largeur / 2 - 20,
      t: tApplique,
      z: haut + 60,
      l: 2 * o.largeur + 80,
      e: 40,
      h: 40,
      matiere: 'rail',
    });
}

export function menuiserie3D(
  o: Ouverture,
  m: Mur,
  n: Pick<Niveau, 'pieces' | 'altitude'>,
  ouvert = 0,
): PieceMenuiserie[] {
  const famille = CATALOGUE_OUVERTURES[o.type].famille;
  if (famille === 'libre') return [];
  const out: Local[] = [];
  const pousser: Pousser = (x) => out.push({ ang: 0, ...x });
  const vi = versInterieur(n, m, o);
  const b: Baie = {
    o,
    ep: m.epaisseur,
    prof: Math.min(70, m.epaisseur),
    vi,
    p0: o.position,
    p1: o.position + o.largeur,
    bas: o.allege,
    haut: o.allege + o.hauteur,
    fenetre: famille === 'fenetre' && o.type !== 'baie_coulissante',
    applique: o.type === 'porte_coulissante',
  };
  vantaux(b, dormant(b, pousser), ouvert, out, pousser);
  out.push(...volets(o, m.epaisseur, vi));
  return versLePlan(out, m, n.altitude);
}
