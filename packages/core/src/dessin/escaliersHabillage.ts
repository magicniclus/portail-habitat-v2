import type { Point } from '../schemas/dessinScene';
import { type Escalier } from './escaliers';
import { pasDeFoulee, versPlan } from './escaliers3d';
import { radians } from './geometrie';
import type { Pave } from './volumes';

/**
 * Escalier dessiné comme en menuiserie (DES-15, DES-33) : marches à nez débordant posées sur
 * leur support — socle enduit (dessous plein, contremarches visibles), limons latéraux (bois,
 * béton : paillasse) ou limon central (métal) pour un dessous ouvert —, garde-corps à poteaux
 * et main courante, fût central pour un colimaçon.
 */
export type MatiereEscalier = 'marche' | 'socle' | 'limon' | 'rampe';
export interface PieceEscalier extends Pave {
  matiere: MatiereEscalier;
  /** Inclinaison de l'axe l au-dessus de l'horizontale (radians) ; 0 : à plat. */
  pente: number;
}

/** Épaisseur de marche (mm), nez débordant (mm). */
const EPAISSEUR = { bois: 40, metal: 30, beton: 60 } as const;
const NEZ = 30;
/** Hauteur du garde-corps au-dessus du nez de marche (mm) et section des poteaux. */
const GARDE_CORPS = 900;
const POTEAU = 40;

type Appui = { x: number; y: number; z: number };

/** Tronçons inclinés reliant des appuis successifs (limon, main courante). */
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
  const { depart, pas, centres } = pasDeFoulee(e);
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

  centres.forEach(({ local, sens }, i) => {
    const dessus = (i + 1) * hMarche;
    const angle = sens + rot - Math.PI / 2;
    // Marche : le nez déborde vers le bas de l'escalier.
    out.push({
      centre: plan(decale(local, sens, 0, -NEZ / 2), dessus - ep / 2),
      taille: { l: largeur, p: pas + NEZ, h: ep },
      angle,
      pente: 0,
      matiere: 'marche',
    });
    // Dessous plein : socle enduit sous la marche, sa face avant fait contremarche.
    if (!ouvert && dessus - ep > 1)
      out.push({
        centre: plan(local, (dessus - ep) / 2),
        taille: { l: largeur, p: pas, h: dessus - ep },
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
    if (m === 'metal') out.push(...troncons(appuis(0, -ep), 80, 160, 'limon'));
    else {
      // Deux limons latéraux qui enserrent les marches (bois), ou paillasse sous elles (béton).
      const [p, h] = m === 'beton' ? [largeur, 180] : [50, 260];
      const cotes = m === 'beton' ? [0] : [-(largeur + p) / 2, (largeur + p) / 2];
      for (const t of cotes)
        out.push(...troncons(appuis(t, m === 'beton' ? -ep : 60), p, h, 'limon'));
    }
  }

  // Garde-corps du côté droit de la montée : un poteau toutes les deux marches, main courante.
  const bord = largeur / 2 - POTEAU;
  const poteaux = centres.filter((_, i) => i % 2 === 0 || i === centres.length - 1);
  const tetes: Appui[] = [];
  centres.forEach((c, i) => {
    if (!poteaux.includes(c)) return;
    const dessus = (i + 1) * hMarche;
    const pied = plan(decale(c.local, c.sens, bord), dessus + GARDE_CORPS / 2);
    out.push({
      centre: pied,
      taille: { l: POTEAU, p: POTEAU, h: GARDE_CORPS },
      angle: c.sens + rot,
      pente: 0,
      matiere: 'rampe',
    });
    tetes.push({ ...pied, z: dessus + GARDE_CORPS + 20 });
  });
  out.push(...troncons(tetes, 50, 40, 'rampe'));
  return out;
}
