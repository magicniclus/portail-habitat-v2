import type { Niveau, Objet, Point } from '../schemas/dessinScene';
import { objetDuCatalogue } from './catalogue';
import { arrondir } from './geometrie';
import { longueurMur } from './murs';
import { contourObjet } from './emprise';

/**
 * Placement automatique (DES-22) : en posant ou en glissant, l'objet cherche la meilleure place.
 * 1. Meuble « contre mur » : dos collé au mur le plus proche, tourné face à la pièce.
 *    Autre meuble : redressé parallèle au mur s'il en est presque parallèle, bord contre le mur.
 * 2. Angle : calé aussi contre le mur perpendiculaire tout proche.
 * 3. Voisin : bord à bord avec un meuble de même orientation et de hauteur commune, aligné.
 * Renvoie aussi les guides à afficher (segments sur lesquels l'objet s'est accroché).
 */

/** Distance du dos au mur sous laquelle un meuble « contre mur » s'y colle. */
const PORTEE_MUR = 400;
/** Distance d'un bord à un mur, ou à un voisin, sous laquelle on le cale. */
const PORTEE_BORD = 150;
const PORTEE_ANGLE = 250;
/** Chevauchement toléré avant de considérer qu'on veut vraiment superposer. */
const TOLERANCE = 30;
/** Écart d'angle (dixièmes de degré) sous lequel on redresse un meuble libre. */
const REDRESSER = 100;
const ALIGNER = 100;

export interface Guide {
  a: Point;
  b: Point;
}

interface Face {
  murId: string;
  p0: Point;
  /** Direction du mur (unitaire). */
  u: Point;
  longueur: number;
  /** Normale unitaire, tournée vers l'extérieur du mur. */
  n: Point;
}

const dot = (a: Point, b: Point) => a.x * b.x + a.y * b.y;
const moins = (a: Point, b: Point) => ({ x: a.x - b.x, y: a.y - b.y });
const plus = (a: Point, v: Point, k: number) => ({ x: a.x + v.x * k, y: a.y + v.y * k });
const norm = (d: number) => ((Math.round(d) % 3600) + 3600) % 3600;
const ecartAngle = (a: number, b: number) => {
  const d = Math.abs(norm(a) - norm(b));
  return Math.min(d, 3600 - d);
};

function faces(n: Niveau): Face[] {
  return n.murs
    .filter((m) => m.type !== 'separation' && m.type !== 'poutre')
    .flatMap((m) => {
      // Longueur non nulle : garantie par le schéma du mur.
      const longueur = longueurMur(m);
      const u = { x: (m.b.x - m.a.x) / longueur, y: (m.b.y - m.a.y) / longueur };
      return [1, -1].map((s) => {
        const normale = { x: -u.y * s, y: u.x * s };
        return { murId: m.id, p0: plus(m.a, normale, m.epaisseur / 2), u, longueur, n: normale };
      });
    });
}

/** Distance signée la plus courte des coins de l'objet à une face (négative : dans le mur). */
const ecartFace = (coins: Point[], f: Face) =>
  Math.min(...coins.map((c) => dot(moins(c, f.p0), f.n)));
const devant = (o: Objet, f: Face) => {
  const t = dot(moins(o.position, f.p0), f.u);
  return dot(moins(o.position, f.p0), f.n) > 0 && t >= 0 && t <= f.longueur;
};
/** Segment de la face couvert par l'objet : le guide affiché. */
function guideFace(coins: Point[], f: Face): Guide {
  const ts = coins.map((c) => Math.min(f.longueur, Math.max(0, dot(moins(c, f.p0), f.u))));
  return { a: plus(f.p0, f.u, Math.min(...ts)), b: plus(f.p0, f.u, Math.max(...ts)) };
}
/** Rotation qui met le dos de l'objet (y local négatif) contre la face. */
const dosContre = (f: Face) => norm(((Math.atan2(f.n.y, f.n.x) - Math.PI / 2) * 1800) / Math.PI);
const directionMur = (f: Face) => (Math.atan2(f.u.y, f.u.x) * 1800) / Math.PI;

function contreUnMur(o: Objet, fs: Face[], contreMur: boolean) {
  let choix: { objet: Objet; face: Face; d: number } | null = null;
  for (const f of fs) {
    if (!devant(o, f)) continue;
    let rotation = o.rotation;
    if (contreMur) rotation = dosContre(f);
    else {
      const quart = norm(Math.round((o.rotation - directionMur(f)) / 900) * 900 + directionMur(f));
      if (ecartAngle(o.rotation, quart) > REDRESSER) continue;
      rotation = quart;
    }
    const tourne = { ...o, rotation };
    const d = ecartFace(contourObjet(tourne), f);
    const portee = contreMur ? PORTEE_MUR : PORTEE_BORD;
    const min = contreMur ? -o.dimensions.p : -TOLERANCE;
    if (d < min || d > portee || (choix && d >= choix.d)) continue;
    const objet: Objet = { ...tourne, position: plus(o.position, f.n, -d) };
    choix = { objet: contreMur ? { ...objet, accrocheMurId: f.murId } : objet, face: f, d };
  }
  return choix;
}

function dansUnAngle(o: Objet, principale: Face, fs: Face[]) {
  for (const f of fs) {
    if (Math.abs(dot(f.n, principale.u)) < 0.99 || !devant(o, f)) continue;
    const d = ecartFace(contourObjet(o), f);
    if (d < -TOLERANCE || d > PORTEE_ANGLE) continue;
    const objet = { ...o, position: plus(o.position, f.n, -d) };
    return { objet, guide: guideFace(contourObjet(objet), f) };
  }
  return null;
}

function contreUnVoisin(o: Objet, n: Niveau, aligner: boolean) {
  const a = (o.rotation / 1800) * Math.PI;
  const ux = { x: Math.cos(a), y: Math.sin(a) };
  const uy = { x: -ux.y, y: ux.x };
  const plage = (pts: Point[], u: Point) => {
    const v = pts.map((p) => dot(p, u));
    return [Math.min(...v), Math.max(...v)] as const;
  };
  const coins = contourObjet(o);
  const [ox0, ox1] = plage(coins, ux);
  const [oy0, oy1] = plage(coins, uy);
  for (const q of n.objets) {
    if (q.id === o.id || ecartAngle(q.rotation % 1800, o.rotation % 1800) > 20) continue;
    // Hauteurs communes : un meuble haut ne se cale pas sur un tapis.
    if (q.altitude >= o.altitude + o.dimensions.h || o.altitude >= q.altitude + q.dimensions.h)
      continue;
    const cq = contourObjet(q);
    const [qx0, qx1] = plage(cq, ux);
    const [qy0, qy1] = plage(cq, uy);
    if (Math.min(oy1, qy1) - Math.max(oy0, qy0) <= 0) continue;
    const droite = qx0 - ox1;
    const gauche = ox0 - qx1;
    const dx =
      droite >= -TOLERANCE && droite <= PORTEE_BORD
        ? droite
        : gauche >= -TOLERANCE && gauche <= PORTEE_BORD
          ? -gauche
          : null;
    if (dx === null) continue;
    const dy = aligner && Math.abs(qy0 - oy0) <= ALIGNER ? qy0 - oy0 : 0;
    const objet = { ...o, position: plus(plus(o.position, ux, dx), uy, dy) };
    const x = dx === droite ? qx0 : qx1;
    const local = (u: number, v: number) => ({ x: ux.x * u + uy.x * v, y: ux.y * u + uy.y * v });
    const guide = { a: local(x, Math.min(oy0 + dy, qy0)), b: local(x, Math.max(oy1 + dy, qy1)) };
    return { objet, guide };
  }
  return null;
}

export function placerIdealement(o: Objet, n: Niveau): { objet: Objet; guides: Guide[] } {
  const c = objetDuCatalogue(o.catalogueId);
  const fs = faces(n);
  const { accrocheMurId: _a, ...libre } = o;
  let objet: Objet = libre;
  const guides: Guide[] = [];
  const mur = contreUnMur(objet, fs, c?.contreMur ?? false);
  if (mur) {
    objet = mur.objet;
    guides.push(guideFace(contourObjet(objet), mur.face));
    const angle = dansUnAngle(objet, mur.face, fs);
    if (angle) {
      objet = angle.objet;
      guides.push(angle.guide);
    }
  }
  if (guides.length < 2) {
    const voisin = contreUnVoisin(objet, n, !mur);
    if (voisin) {
      objet = voisin.objet;
      guides.push(voisin.guide);
    }
  }
  if (!guides.length) return { objet: libre, guides: [] };
  return {
    objet: { ...objet, position: arrondir(objet.position) },
    guides: guides.map((g) => ({ a: arrondir(g.a), b: arrondir(g.b) })),
  };
}
