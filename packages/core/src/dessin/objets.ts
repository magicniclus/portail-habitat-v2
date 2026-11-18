import { echec, succes, type Resultat } from '../resultat';
import {
  objet as schemaObjet,
  type Mur,
  type Niveau,
  type Objet,
  type Point,
} from '../schemas/dessinScene';
import { objetDuCatalogue, plagesDe } from './catalogue';
import type { Contexte } from './commandes';
import { arrondir, distance, projeter } from './geometrie';
import { contourMur, longueurMur } from './murs';

/** Objets posés sur le plan (DES-22) : position = centre, rotation en dixièmes de degré. */

const rad = (dixiemes: number) => (dixiemes / 10) * (Math.PI / 180);

/** Les 4 coins de l'objet vu de dessus. Le « dos » est le côté y = -p/2 (contre le mur). */
export function contourObjet(o: Pick<Objet, 'position' | 'rotation' | 'dimensions'>): Point[] {
  const a = rad(o.rotation);
  const c = Math.cos(a);
  const s = Math.sin(a);
  const { l, p } = o.dimensions;
  return [
    { x: -l / 2, y: -p / 2 },
    { x: l / 2, y: -p / 2 },
    { x: l / 2, y: p / 2 },
    { x: -l / 2, y: p / 2 },
  ].map((q) => ({ x: o.position.x + q.x * c - q.y * s, y: o.position.y + q.x * s + q.y * c }));
}

/** Distance maximale pour coller un objet « contre mur » au mur le plus proche. */
const ATTRACTION_MUR = 700;

/**
 * Objet contre un mur (DES-22) : dos parallèle au mur, plaqué contre la face du côté du clic.
 * Renvoie l'objet tel quel si aucun mur n'est assez proche.
 */
export function plaquerContreMur(o: Objet, murs: readonly Mur[]): Objet {
  let meilleur: { m: Mur; d: number; t: number } | null = null;
  for (const m of murs) {
    if (m.type === 'separation') continue;
    const { point, t } = projeter(o.position, m.a, m.b);
    const d = distance(o.position, point);
    if (d <= ATTRACTION_MUR + m.epaisseur / 2 && (!meilleur || d < meilleur.d))
      meilleur = { m, d, t };
  }
  if (!meilleur) return o;
  const { m, t } = meilleur;
  const l = longueurMur(m);
  const u = { x: (m.b.x - m.a.x) / l, y: (m.b.y - m.a.y) / l };
  const n = { x: -u.y, y: u.x };
  const surAxe = { x: m.a.x + u.x * t * l, y: m.a.y + u.y * t * l };
  // Côté du mur où l'objet a été posé : +1 du côté de la normale gauche.
  const cote = (o.position.x - surAxe.x) * n.x + (o.position.y - surAxe.y) * n.y >= 0 ? 1 : -1;
  const ecart = m.epaisseur / 2 + o.dimensions.p / 2;
  const position = arrondir({ x: surAxe.x + n.x * cote * ecart, y: surAxe.y + n.y * cote * ecart });
  // Le dos (y local négatif) regarde le mur : l'axe y local pointe dans le sens de n·côté.
  const angle = Math.atan2(n.y * cote, n.x * cote) - Math.PI / 2;
  const rotation = (((Math.round((angle * 180) / Math.PI) * 10) % 3600) + 3600) % 3600;
  return { ...o, position, rotation, accrocheMurId: m.id };
}

export function poserObjet(
  n: Niveau,
  e: { catalogueId: string; position: Point },
  ctx: Contexte,
): Resultat<Niveau> {
  const c = objetDuCatalogue(e.catalogueId);
  if (!c) return echec('INTROUVABLE');
  let o: Objet = schemaObjet.parse({
    id: ctx.nouvelId('obj'),
    catalogueId: c.id,
    position: arrondir(e.position),
    dimensions: c.dimensions,
    altitude: c.altitude ?? 0,
  });
  if (c.contreMur) o = plaquerContreMur(o, n.murs);
  return succes({ ...n, objets: [...n.objets, o] });
}

const trouver = (n: Niveau, id: string) => n.objets.find((o) => o.id === id);
const remplacer = (n: Niveau, o: Objet): Niveau => ({
  ...n,
  objets: n.objets.map((x) => (x.id === o.id ? o : x)),
});

/** Glisser un objet ; un objet « contre mur » se recolle au mur le plus proche. */
export function deplacerObjet(n: Niveau, id: string, vers: Point): Resultat<Niveau> {
  const o = trouver(n, id);
  if (!o) return echec('INTROUVABLE');
  const deplace: Objet = { ...o, position: arrondir(vers) };
  const { accrocheMurId: _ancien, ...libre } = deplace;
  const c = objetDuCatalogue(o.catalogueId);
  return succes(remplacer(n, c?.contreMur ? plaquerContreMur(libre, n.murs) : libre));
}

/** Pivoter (pas de 15° ou 90°), sans décrocher l'objet de sa position. */
export function tournerObjet(n: Niveau, id: string, dixiemes: number): Resultat<Niveau> {
  const o = trouver(n, id);
  if (!o) return echec('INTROUVABLE');
  return succes(remplacer(n, { ...o, rotation: (((o.rotation + dixiemes) % 3600) + 3600) % 3600 }));
}

export type ModificationObjet = Partial<Pick<Objet, 'dimensions' | 'altitude' | 'materiaux'>>;

/** Dimensions dans les plages du modèle, hauteur de pose, couleurs (DES-22). */
export function modifierObjet(n: Niveau, id: string, modif: ModificationObjet): Resultat<Niveau> {
  const o = trouver(n, id);
  if (!o) return echec('INTROUVABLE');
  const c = objetDuCatalogue(o.catalogueId);
  const suite = { ...o, ...modif };
  if (c && modif.dimensions) {
    const plages = plagesDe(c);
    for (const cle of ['l', 'p', 'h'] as const) {
      const [min, max] = plages[cle];
      const v = suite.dimensions[cle];
      if (v < min || v > max)
        return echec('ENTREE_INVALIDE', {
          message: `Dimension hors de la plage du modèle (${Math.round(min / 10)} à ${Math.round(max / 10)} cm).`,
        });
    }
  }
  const r = schemaObjet.safeParse(suite);
  if (!r.success) return echec('ENTREE_INVALIDE', { message: r.error.issues[0]!.message });
  return succes(remplacer(n, r.data));
}

export function dupliquerObjet(
  n: Niveau,
  id: string,
  ctx: Contexte,
): Resultat<Niveau & { copieId: string }> {
  const o = trouver(n, id);
  if (!o) return echec('INTROUVABLE');
  // Décalée d'une largeur, dans l'axe de l'objet : utile pour aligner des meubles.
  const a = rad(o.rotation);
  const copie: Objet = {
    ...o,
    id: ctx.nouvelId('obj'),
    position: arrondir({
      x: o.position.x + Math.cos(a) * o.dimensions.l,
      y: o.position.y + Math.sin(a) * o.dimensions.l,
    }),
  };
  return succes({ ...n, objets: [...n.objets, copie], copieId: copie.id });
}

export function supprimerObjet(n: Niveau, id: string): Resultat<Niveau> {
  if (!trouver(n, id)) return echec('INTROUVABLE');
  return succes({ ...n, objets: n.objets.filter((o) => o.id !== id) });
}

/** Deux polygones convexes se chevauchent-ils (axes séparateurs), au-delà de `marge` mm ? */
export function chevauchent(a: readonly Point[], b: readonly Point[], marge = 5): boolean {
  for (const poly of [a, b]) {
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i]!;
      const q = poly[(i + 1) % poly.length]!;
      const axe = { x: q.y - p.y, y: p.x - q.x };
      const l = Math.hypot(axe.x, axe.y);
      const proj = (pts: readonly Point[]) => pts.map((r) => (r.x * axe.x + r.y * axe.y) / l);
      const [pa, pb] = [proj(a), proj(b)];
      if (Math.max(...pa) - marge <= Math.min(...pb) || Math.max(...pb) - marge <= Math.min(...pa))
        return false;
    }
  }
  return true;
}

export interface Collision {
  objetId: string;
  avec: { genre: 'objet' | 'mur'; id: string };
}

/**
 * Collisions signalées (non bloquantes, DES-22) : objets au sol qui se chevauchent, objets qui
 * traversent un mur. Les objets en hauteur (meubles hauts, luminaires…) sont ignorés au sol.
 */
export function collisions(n: Niveau): Collision[] {
  const auSol = n.objets.filter(
    (o) => o.altitude === 0 && objetDuCatalogue(o.catalogueId)?.symbole !== 'tapis',
  );
  const contours = new Map(auSol.map((o) => [o.id, contourObjet(o)]));
  const resultat: Collision[] = [];
  auSol.forEach((o, i) => {
    for (const autre of auSol.slice(i + 1))
      if (chevauchent(contours.get(o.id)!, contours.get(autre.id)!))
        resultat.push({ objetId: o.id, avec: { genre: 'objet', id: autre.id } });
    for (const m of n.murs)
      if (m.type !== 'separation' && chevauchent(contours.get(o.id)!, contourMur(m)))
        resultat.push({ objetId: o.id, avec: { genre: 'mur', id: m.id } });
  });
  return resultat;
}
