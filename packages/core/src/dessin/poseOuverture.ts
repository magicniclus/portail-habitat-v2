import { echec, type Resultat } from '../resultat';
import type { Niveau, Ouverture, Point } from '../schemas/dessinScene';
import type { Contexte } from './commandes';
import { projeter } from './geometrie';
import { versInterieur } from './menuiseries';
import { longueurMur } from './murs';
import {
  CATALOGUE_OUVERTURES,
  modifierOuverture,
  murSousLePoint,
  poserOuverture,
  type TypeOuverture,
} from './ouvertures';

/** En dessous (mm), les deux clics sont confondus : largeur du catalogue, centrée. */
const LARGEUR_MIN = 300;

/**
 * Menuiserie tirée sur un mur (DES-14) : le premier clic donne un bord et la charnière, le
 * pointeur l'autre bord ; le côté du mur où se trouve le pointeur donne le sens de l'ouvrant.
 * `null` si le premier point n'est sur aucun mur.
 */
export function ouvertureTiree(
  n: Niveau,
  type: TypeOuverture,
  premier: Point,
  pointeur: Point,
): Pick<Ouverture, 'murId' | 'position' | 'largeur' | 'sens' | 'cote'> | null {
  const cible = murSousLePoint(n.murs, premier, 0);
  if (!cible) return null;
  const m = cible.mur;
  const l = Math.round(longueurMur(m));
  const d1 = Math.round(cible.distanceDepuisA);
  const d2 = Math.round(Math.min(1, Math.max(0, projeter(pointeur, m.a, m.b).t)) * l);
  const tiree = Math.round(Math.abs(d2 - d1) / 10) * 10;
  const defaut = CATALOGUE_OUVERTURES[type].largeur;
  const largeur = tiree < LARGEUR_MIN ? defaut : tiree;
  const position =
    tiree < LARGEUR_MIN
      ? Math.max(0, Math.round(Math.min(d1 - largeur / 2, l - largeur)))
      : Math.min(d1, d2);
  // Côté du pointeur par rapport à la normale gauche du mur, comparé au côté de la pièce.
  const cote = (m.a.x - m.b.x) * (pointeur.y - m.a.y) + (m.b.y - m.a.y) * (pointeur.x - m.a.x);
  const signe = cote < 0 ? 1 : -1;
  const interieur = versInterieur(n, m, { position, largeur } as Ouverture);
  return {
    murId: m.id,
    position,
    largeur,
    sens: d2 >= d1 ? 'gauche' : 'droite',
    cote: signe === interieur ? 'interieur' : 'exterieur',
  };
}

/** Pose la menuiserie tirée en deux clics (voir `ouvertureTiree`). */
export function poserOuvertureTiree(
  n: Niveau,
  type: TypeOuverture,
  premier: Point,
  pointeur: Point,
  ctx: Contexte,
): Resultat<Niveau> {
  const o = ouvertureTiree(n, type, premier, pointeur);
  if (!o) return echec('PRECONDITION', { message: 'Cliquez sur un mur.' });
  return poserOuverture(n, { ...o, type, centre: o.position + o.largeur / 2 }, ctx);
}

/**
 * Fait glisser une menuiserie posée le long de son mur (DES-14) : son milieu suit la projection
 * du pointeur sur le mur, bornée aux extrémités. Refusé (sans rien changer) si elle chevauchait
 * une autre ouverture.
 */
export function glisserOuverture(n: Niveau, id: string, vers: Point): Resultat<Niveau> {
  const o = n.ouvertures.find((x) => x.id === id);
  const m = o && n.murs.find((x) => x.id === o.murId);
  if (!o || !m) return echec('INTROUVABLE');
  const l = Math.round(longueurMur(m));
  const milieu = projeter(vers, m.a, m.b).t * l;
  const position = Math.round(Math.max(0, Math.min(l - o.largeur, milieu - o.largeur / 2)));
  return modifierOuverture(n, id, { position });
}
