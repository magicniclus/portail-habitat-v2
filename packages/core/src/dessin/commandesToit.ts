import { echec, succes, type Resultat } from '../resultat';
import { toiture as schemaToiture, type Niveau, type Point } from '../schemas/dessinScene';
import type { Contexte } from './commandes';
import { toit3D } from './toits3d';
import {
  empriseToit,
  PENTE_DEFAUT,
  surfaceCarrezCombles,
  versLocal,
  type Toiture,
  type TypeToiture,
} from './toitures';

/** Toiture du niveau (DES-16, DES-17) : création, réglages, éléments posés sur les pans. */

export function definirToiture(n: Niveau, type: TypeToiture | null): Resultat<Niveau> {
  if (type === null) return succes({ ...n, toiture: null });
  if (n.murs.length < 3)
    return echec('PRECONDITION', { message: 'Dessinez d’abord les murs de la maison.' });
  const toiture = schemaToiture.parse({
    type,
    pentes: [PENTE_DEFAUT[type] * 10],
    couverture: { famille: type === 'plate' ? 'bac_acier' : 'tuile' },
  });
  return succes({ ...n, toiture });
}

export type ModificationToiture = Partial<
  Pick<Toiture, 'type' | 'pentes' | 'debord' | 'faitageAngle' | 'couverture'>
>;

export function modifierToiture(n: Niveau, modif: ModificationToiture): Resultat<Niveau> {
  if (!n.toiture) return echec('INTROUVABLE');
  const r = schemaToiture.safeParse({ ...n.toiture, ...modif });
  if (!r.success) return echec('ENTREE_INVALIDE', { message: r.error.issues[0]!.message });
  return succes({ ...n, toiture: r.data });
}

export type ElementToit = 'fenetre' | 'cheminee' | 'jacobine' | 'capucine' | 'chien_assis';

/** Pose une fenêtre de toit, une cheminée ou une lucarne au point cliqué, sur le toit. */
export function ajouterElementToit(
  n: Niveau,
  genre: ElementToit,
  position: Point,
  ctx: Contexte,
): Resultat<Niveau> {
  const t = n.toiture;
  if (!t) return echec('INTROUVABLE');
  const e = empriseToit(n, t)!;
  const { a, b } = versLocal(e, position);
  if (Math.abs(a) > e.L / 2 || Math.abs(b) > e.P / 2)
    return echec('PRECONDITION', { message: 'Posez-le sur le toit.' });
  const p = { x: Math.round(position.x), y: Math.round(position.y) };
  const pan = b < 0 ? 0 : 1;
  const suite: Toiture =
    genre === 'fenetre'
      ? {
          ...t,
          fenetresToit: [
            ...t.fenetresToit,
            { id: ctx.nouvelId('ft'), pan, position: p, largeur: 780, hauteur: 980 },
          ],
        }
      : genre === 'cheminee'
        ? {
            ...t,
            cheminees: [
              ...t.cheminees,
              { id: ctx.nouvelId('ch'), position: p, largeur: 500, profondeur: 500 },
            ],
          }
        : {
            ...t,
            lucarnes: [
              ...t.lucarnes,
              { id: ctx.nouvelId('l'), type: genre, pan, position: p, largeur: 1_200 },
            ],
          };
  const r = schemaToiture.safeParse(suite);
  if (!r.success)
    return echec('PRECONDITION', { message: 'Nombre maximal d’éléments atteint sur ce toit.' });
  return succes({ ...n, toiture: r.data });
}

export function retirerElementToit(n: Niveau, id: string): Resultat<Niveau> {
  const t = n.toiture;
  const garder = <T extends { id: string }>(l: T[]) => l.filter((x) => x.id !== id);
  if (!t || ![...t.fenetresToit, ...t.cheminees, ...t.lucarnes].some((x) => x.id === id))
    return echec('INTROUVABLE');
  return succes({
    ...n,
    toiture: {
      ...t,
      fenetresToit: garder(t.fenetresToit),
      cheminees: garder(t.cheminees),
      lucarnes: garder(t.lucarnes),
    },
  });
}

/** Quantités de la toiture (DES-17) : couverture, gouttières, fenêtres de toit, combles. */
export function quantitesToiture(n: Niveau) {
  const t3 = toit3D(n);
  if (!t3 || !n.toiture) return null;
  return {
    couverture: t3.surface,
    gouttieres: t3.longueurGouttieres,
    fenetresToit: n.toiture.fenetresToit.length,
    cheminees: n.toiture.cheminees.length,
    lucarnes: n.toiture.lucarnes.length,
    carrez: n.type === 'combles' ? surfaceCarrezCombles(n.toiture, t3.emprise) : null,
  };
}
