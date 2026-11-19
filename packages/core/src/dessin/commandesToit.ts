import { echec, succes, type Resultat } from '../resultat';
import {
  toiture as schemaToiture,
  type Niveau,
  type Point,
  type Scene,
} from '../schemas/dessinScene';
import type { Contexte } from './commandes';
import { toit3D } from './toits3d';
import { niveauxTries } from './niveaux';
import {
  altitudeToit,
  emprisesToit,
  PENTE_DEFAUT,
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
  const ici = altitudeToit(t, emprisesToit(n), position);
  if (!ici) return echec('PRECONDITION', { message: 'Posez-le sur le toit.' });
  const { b } = versLocal(ici.aile, position);
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

/** Quantités de la toiture (DES-17) : couverture, gouttières, éléments, combles Carrez. */
export function quantitesToiture(n: Niveau, dessus: Niveau | null = null) {
  const t3 = toit3D(n, dessus);
  if (!t3 || !n.toiture) return null;
  return {
    couverture: t3.surface,
    gouttieres: t3.longueurGouttieres,
    fenetresToit: n.toiture.fenetresToit.length,
    cheminees: n.toiture.cheminees.length,
    lucarnes: n.toiture.lucarnes.length,
    carrez: n.type === 'combles' ? t3.carrez : null,
    egout: t3.egout,
    faitage: t3.faitage,
  };
}

/**
 * Toit sur toute la maison, en un clic : chaque niveau reçoit la forme choisie sur la partie
 * qui n'a pas d'étage au-dessus (les éléments déjà posés sont gardés) ; sinon pas de toit.
 */
export function toitureAutomatique(s: Scene, type: TypeToiture): Resultat<Scene> {
  const tries = niveauxTries(s).filter((n) => n.type !== 'sous_sol');
  if (!tries.some((n) => n.murs.length >= 3))
    return echec('PRECONDITION', { message: 'Dessinez d’abord les murs de la maison.' });
  const niveaux = s.niveaux.map((n) => {
    const i = tries.findIndex((x) => x.id === n.id);
    if (i < 0) return n;
    const dessus = tries[i + 1] ?? null;
    const neuf = definirToiture(n, type);
    if (!neuf.ok) return { ...n, toiture: null };
    const toiture = n.toiture
      ? { ...neuf.data.toiture!, ...elementsDe(n.toiture) }
      : neuf.data.toiture;
    const avec = { ...n, toiture };
    return emprisesToit(avec, dessus).length ? avec : { ...n, toiture: null };
  });
  return succes({ ...s, niveaux });
}
const elementsDe = (t: Toiture) => ({
  fenetresToit: t.fenetresToit,
  cheminees: t.cheminees,
  lucarnes: t.lucarnes,
  debord: t.debord,
  couverture: t.couverture,
});

/**
 * Hauteurs prises depuis le sol (altitude 0 = sol du rez-de-chaussée) : l'égout règle la
 * hauteur des murs du niveau, le faîtage règle la pente (recherche par dichotomie).
 */
export function reglerHauteursToit(
  n: Niveau,
  h: { egout?: number; faitage?: number },
  dessus: Niveau | null = null,
): Resultat<Niveau> {
  if (!n.toiture) return echec('INTROUVABLE');
  let suite = n;
  if (h.egout !== undefined) {
    const murs = Math.round(h.egout - n.altitude);
    if (murs < 200 || murs > 20_000)
      return echec('PRECONDITION', { message: 'Hauteur à l’égout hors limites pour ce niveau.' });
    suite = {
      ...suite,
      murs: suite.murs.map((m) =>
        m.type === 'mur' ? { ...m, hauteur: murs, hauteurB: undefined } : m,
      ),
    };
  }
  if (h.faitage !== undefined && suite.toiture!.type !== 'plate') {
    const faitageA = (pente: number) =>
      toit3D({ ...suite, toiture: { ...suite.toiture!, pentes: [pente] } }, dessus)?.faitage ?? 0;
    if (h.faitage <= faitageA(10) || h.faitage >= faitageA(800))
      return echec('PRECONDITION', {
        message:
          'Faîtage impossible avec cette forme : choisissez une hauteur entre les deux limites.',
      });
    let [bas, haut] = [10, 800];
    for (let i = 0; i < 30 && haut - bas > 1; i++) {
      const m = (bas + haut) / 2;
      if (faitageA(m) < h.faitage) bas = m;
      else haut = m;
    }
    suite = { ...suite, toiture: { ...suite.toiture!, pentes: [Math.round((bas + haut) / 2)] } };
  }
  return succes(suite);
}
