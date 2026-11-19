import { echec, succes, type Resultat } from '../resultat';
import { objet as schemaObjet, type Niveau, type Objet, type Point } from '../schemas/dessinScene';
import { objetDuCatalogue, plagesDe } from './catalogue';
import { contourObjet } from './emprise';
import type { Contexte } from './commandes';
import { arrondir, radians } from './geometrie';
import { contourMur } from './murs';
import { placerIdealement, type Guide } from './placement';

export { contourObjet };

/** Objets posés sur le plan (DES-22) : position = centre, rotation en dixièmes de degré. */

export function poserObjet(
  n: Niveau,
  e: { catalogueId: string; position: Point },
  ctx: Contexte,
  options: { aimant?: boolean } = {},
): Resultat<Niveau> {
  const c = objetDuCatalogue(e.catalogueId);
  if (!c) return echec('INTROUVABLE');
  const o: Objet = schemaObjet.parse({
    id: ctx.nouvelId('obj'),
    catalogueId: c.id,
    position: arrondir(e.position),
    dimensions: c.dimensions,
    altitude: c.altitude ?? 0,
  });
  const place = options.aimant === false ? o : placerIdealement(o, n).objet;
  return succes({ ...n, objets: [...n.objets, place] });
}

const trouver = (n: Niveau, id: string) => n.objets.find((o) => o.id === id);
/** Objet à modifier : introuvable, ou verrouillé (DES-29) et donc intouchable. */
function modifiable(n: Niveau, id: string): Resultat<Objet> {
  const o = trouver(n, id);
  if (!o) return echec('INTROUVABLE');
  if (o.verrouille) return echec('PRECONDITION', { message: 'Cet élément est verrouillé.' });
  return succes(o);
}
const remplacer = (n: Niveau, o: Objet): Niveau => ({
  ...n,
  objets: n.objets.map((x) => (x.id === o.id ? o : x)),
});

/** Glisser un objet : placement automatique (mur, angle, voisin), sauf aimant coupé. */
export function deplacerObjet(
  n: Niveau,
  id: string,
  vers: Point,
  options: { aimant?: boolean } = {},
): Resultat<Niveau & { guides: Guide[] }> {
  const cible = modifiable(n, id);
  if (!cible.ok) return cible;
  const o = cible.data;
  const { accrocheMurId: _ancien, ...libre } = { ...o, position: arrondir(vers) };
  const r = options.aimant === false ? { objet: libre, guides: [] } : placerIdealement(libre, n);
  return succes({ ...remplacer(n, r.objet), guides: r.guides });
}

/** Pivoter (pas de 15° ou 90°), sans décrocher l'objet de sa position. */
export function tournerObjet(n: Niveau, id: string, dixiemes: number): Resultat<Niveau> {
  const cible = modifiable(n, id);
  if (!cible.ok) return cible;
  const o = cible.data;
  return succes(remplacer(n, { ...o, rotation: (((o.rotation + dixiemes) % 3600) + 3600) % 3600 }));
}

/**
 * Rotation libre sur 3 axes (angles absolus, dixièmes de degré) : `rotation` autour de la
 * verticale, `x` bascule avant/arrière, `y` bascule de côté. À plat, l'inclinaison disparaît.
 */
export function orienterObjet(
  n: Niveau,
  id: string,
  angles: { rotation?: number; x?: number; y?: number },
): Resultat<Niveau> {
  const cible = modifiable(n, id);
  if (!cible.ok) return cible;
  const o = cible.data;
  const norm = (d: number) => ((Math.round(d) % 3600) + 3600) % 3600;
  const x = norm(angles.x ?? o.inclinaison?.x ?? 0);
  const y = norm(angles.y ?? o.inclinaison?.y ?? 0);
  const { inclinaison: _i, ...sans } = o;
  const suite: Objet = {
    ...sans,
    rotation: norm(angles.rotation ?? o.rotation),
    ...(x || y ? { inclinaison: { x, y } } : {}),
  };
  return succes(remplacer(n, suite));
}

export type ModificationObjet = Partial<Pick<Objet, 'dimensions' | 'altitude' | 'materiaux'>>;

/** Dimensions dans les plages du modèle, hauteur de pose, couleurs (DES-22). */
export function modifierObjet(n: Niveau, id: string, modif: ModificationObjet): Resultat<Niveau> {
  const cible = modifiable(n, id);
  if (!cible.ok) return cible;
  const o = cible.data;
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
  const a = radians(o.rotation);
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
  const cible = modifiable(n, id);
  if (!cible.ok) return cible;
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
