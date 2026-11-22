import type { Point } from '../schemas/dessinScene';
import { type Escalier } from './escaliers';
import { pasDeFoulee, versPlan } from './escaliers3d';
import { radians } from './geometrie';
import type { Pave } from './volumes';

/**
 * Escalier dessiné comme en menuiserie (DES-15, DES-33) : marches à nez débordant posées sur
 * leur support — socle enduit (dessous plein, contremarches visibles), limons latéraux (bois,
 * béton : paillasse) ou limon central (métal) pour un dessous ouvert —, fût central pour un
 * colimaçon. Pas de garde-corps ni de main courante.
 */
export type MatiereEscalier = 'marche' | 'socle' | 'limon';
export interface PieceEscalier extends Pave {
  matiere: MatiereEscalier;
  /** Inclinaison de l'axe l au-dessus de l'horizontale (radians) ; 0 : à plat. */
  pente: number;
}

/** Épaisseur de marche (mm), nez débordant (mm). */
const EPAISSEUR = { bois: 40, metal: 30, beton: 60 } as const;
const NEZ = 30;

type Appui = { x: number; y: number; z: number };

/** Tronçons inclinés reliant des appuis successifs (limons). */
function troncons(
  appuis: Appui[],
  p: number,
  h: number,
  matiere: MatiereEscalier,
): PieceEscalier[] {
  return appuis.slice(1).map((b, i) => {
    const a = appuis[i]!;
    const auSol = Math.hypot(b.x - a.x, b.y - a.y);
    return {
      centre: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 - h / 2 },
      taille: { l: Math.hypot(auSol, b.z - a.z), p, h },
      angle: Math.atan2(b.y - a.y, b.x - a.x),
      pente: Math.atan2(b.z - a.z, auSol),
      matiere,
    };
  });
}

export function habillageEscalier(e: Escalier, altitude: number): PieceEscalier[] {
  const { depart, centres } = pasDeFoulee(e);
  const hMarche = e.hauteurAMonter / e.nbMarches;
  const plan = versPlan(e, altitude);
  const rot = radians(e.rotation);
  const m = e.materiau ?? 'bois';
  const ep = EPAISSEUR[m];
  const helice = e.type === 'helicoidal';
  const largeur = helice ? Math.max(2 * e.largeur, 1400) / 2 - 100 : e.largeur;
  const ouvert = e.structure === 'ouverte';
  /** Point de la foulée décalé en travers (vers la droite de la montée) et en long. */
  const decale = (local: Point, sens: number, travers: number, long = 0): Point => ({
    x: local.x + Math.cos(sens) * long - Math.sin(sens) * travers,
    y: local.y + Math.sin(sens) * long + Math.cos(sens) * travers,
  });
  const out: PieceEscalier[] = [];

  centres.forEach(({ local, sens, profondeur, palier }, i) => {
    const dessus = (i + 1) * hMarche;
    const angle = sens + rot - Math.PI / 2;
    // Marche : le nez déborde vers le bas de l'escalier (un palier n'a pas de nez).
    const nez = palier ? 0 : NEZ;
    out.push({
      centre: plan(decale(local, sens, 0, -nez / 2), dessus - ep / 2),
      taille: { l: largeur, p: profondeur + nez, h: ep },
      angle,
      pente: 0,
      matiere: 'marche',
    });
    // Dessous plein : socle enduit sous la marche, sa face avant fait contremarche.
    if (!ouvert && dessus - ep > 1)
      out.push({
        centre: plan(local, (dessus - ep) / 2),
        taille: { l: largeur, p: profondeur, h: dessus - ep },
        angle,
        pente: 0,
        matiere: 'socle',
      });
  });

  if (helice) {
    // Fût central du colimaçon, du sol à l'arrivée.
    const c = Math.max(2 * e.largeur, 1400) / 2;
    out.push({
      centre: plan({ x: c, y: c }, e.hauteurAMonter / 2),
      taille: { l: 120, p: 120, h: e.hauteurAMonter },
      angle: rot,
      pente: 0,
      matiere: 'limon',
    });
  } else if (ouvert) {
    const appuis = (travers: number, auDessus: number) => [
      plan(decale(depart, centres[0]!.sens, travers), 0),
      ...centres.map((c, i) =>
        plan(decale(c.local, c.sens, travers), (i + 1) * hMarche + auDessus),
      ),
    ];
    // Limons choisis (tracé), sinon selon le matériau : central en métal, paillasse en béton.
    const style = e.limon ?? (m === 'metal' ? 'central' : m === 'beton' ? 'paillasse' : 'lateraux');
    if (style === 'central') out.push(...troncons(appuis(0, -ep), 80, 160, 'limon'));
    else if (style === 'paillasse') out.push(...troncons(appuis(0, -ep), largeur, 180, 'limon'));
    else if (style === 'lateraux')
      // Deux limons latéraux qui enserrent les marches.
      for (const t of [-(largeur + 50) / 2, (largeur + 50) / 2])
        out.push(...troncons(appuis(t, 60), 50, 260, 'limon'));
    // « aucun » : marches suspendues, scellées dans le mur.
  }

  return out;
}
