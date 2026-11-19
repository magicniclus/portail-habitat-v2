import { echec, succes, type Resultat } from '../resultat';
import type { Niveau, Point, Scene } from '../schemas/dessinScene';
import { ajouterMur, appliquerRevetement, type Contexte } from './commandes';
import { toitureAutomatique } from './commandesToit';
import {
  ajouterAllee,
  ajouterPiscine,
  ajouterTerrasse,
  ajouterVegetal,
  parcelleAutour,
  tracerCloture,
} from './exterieur';
import { mursDepuisForme } from './formes';
import { pointDansPolygone } from './geometrie';
import { nouvelleScene } from './migrations';
import { poserObjet, tournerObjet } from './objets';
import { murSousLePoint, poserOuverture } from './ouvertures';
import { detecterPieces, synchroniserPieces, typerPiece } from './pieces';
import { ESCALIER, ETAGE, RDC, sol, SOLS, type PlanNiveau } from './demoDonnees';
import { poserEscalier } from './escaliers';
import { ajouterNiveau } from './niveaux';
import { revetirMursDeLaPiece } from './revetements';

/**
 * Maison de démonstration (modèle « Maison en L meublée ») : L de 13 × 11 m sur deux niveaux.
 * Rez-de-chaussée : deux chambres, salle de bains, WC, cuisine, séjour, escalier ; étage : trois
 * chambres, salle d'eau, bureau, palier ; meubles, revêtements, terrasse, patio, piscine, allée,
 * arbres, grillage, toit deux pans. Millimètres, axes des murs ; tout reste modifiable.
 */
const p = (x: number, y: number): Point => ({ x, y });

class Arret extends Error {}
const etape = <T>(r: Resultat<T>): T => {
  if (!r.ok) throw new Arret(r.message);
  return r.data;
};

/** Cloisons, pièces typées et revêtues, ouvertures et meubles d'un niveau. */
function amenager(n: Niveau, plan: PlanNiveau, ctx: Contexte): Niveau {
  for (const [a, b] of plan.cloisons) n = etape(ajouterMur(n, { a, b, type: 'cloison' }, ctx));
  for (const [point, type] of plan.pieces) {
    const piece = n.pieces.find((x) => pointDansPolygone(point, x.contour));
    if (!piece) throw new Arret('Pièce introuvable dans la maison de démonstration.');
    n = etape(typerPiece(n, piece.id, type));
    const r = SOLS[type];
    if (r)
      n = etape(appliquerRevetement(n, { genre: 'piece', pieceId: piece.id, surface: 'sol' }, r));
    if (type === 'salle_de_bain' || type === 'salle_d_eau')
      n = etape(revetirMursDeLaPiece(n, piece.id, sol('faience', 'fa-metro', 'droite')));
  }
  for (const [point, type] of plan.ouvertures) {
    const cible = murSousLePoint(n.murs, point, 150);
    if (!cible) throw new Arret('Mur introuvable pour une ouverture de démonstration.');
    n = etape(poserOuverture(n, { murId: cible.mur.id, type, centre: cible.distanceDepuisA }, ctx));
  }
  for (const [catalogueId, position, tour] of plan.objets) {
    n = etape(poserObjet(n, { catalogueId, position }, ctx));
    if (tour) n = etape(tournerObjet(n, n.objets.at(-1)!.id, tour));
  }
  return n;
}

/** Extérieur du rez-de-chaussée : terrasses, piscine, allée, arbres, grillage. */
function exterieur(n: Niveau, ctx: Contexte): Niveau {
  // Extérieur : terrasse devant le séjour, patio dans le creux du L, piscine, allée, végétation.
  n = etape(ajouterTerrasse(n, p(3_500, 11_000), p(9_500, 14_500), ctx, { aimant: false }));
  n = etape(ajouterTerrasse(n, p(8_000, 1_000), p(13_000, 5_000), ctx, { aimant: false }));
  n = etape(ajouterPiscine(n, p(15_500, 15_000), 'rectangle', ctx));
  n = etape(ajouterAllee(n, p(1_000, 11_000), p(2_000, 18_900)));
  for (const [x, y] of [
    [-4_500, -3_500],
    [17_500, -3_500],
    [-4_500, 14_500],
    [19_000, 9_000],
  ] as const)
    n = etape(ajouterVegetal(n, p(x, y), 'arbre', ctx, { aimant: false }));
  // Grillage autour de la parcelle, ouvert devant l'allée.
  const tour = [
    p(20_900, 18_900),
    p(20_900, -7_900),
    p(-7_900, -7_900),
    p(-7_900, 18_900),
    p(800, 18_900),
  ];
  let cloture = etape(
    tracerCloture(n, { a: p(2_200, 18_900), b: tour[0]!, type: 'grillage' }, ctx),
  );
  for (let i = 1; i < tour.length; i++)
    cloture = etape(
      tracerCloture(
        cloture,
        { id: cloture.elementId, a: tour[i - 1]!, b: tour[i]!, type: 'grillage' },
        ctx,
      ),
    );
  const { elementId: _id, ...avecCloture } = cloture;
  n = avecCloture;
  return n;
}

/** Scène complète de la maison de démonstration. */
export function sceneDemo(ctx: Contexte): Resultat<Scene> {
  try {
    const s = nouvelleScene(ctx.nouvelId);
    const base = s.niveaux[0]!;
    const murs = etape(
      mursDepuisForme(
        {
          forme: 'L',
          largeur: 13_000,
          profondeur: 11_000,
          decoupe: { largeur: 5_000, profondeur: 5_000 },
        },
        { epaisseur: 200, hauteur: base.hauteurSousPlafond, nouvelId: ctx.nouvelId },
      ),
    );
    const pieces = synchroniserPieces([], detecterPieces(murs), () => ctx.nouvelId('p'));
    let rdc = exterieur(amenager({ ...base, murs, pieces }, RDC, ctx), ctx);
    const monter = rdc.hauteurSousPlafond + rdc.epaisseurPlancher;
    rdc = etape(
      poserEscalier(
        rdc,
        { type: 'droit', position: ESCALIER.position, hauteurAMonter: monter },
        ctx,
      ),
    );
    // Étage : murs extérieurs repris, puis aménagé ; toit deux pans sur l'étage.
    const avecEtage = etape(
      ajouterNiveau(
        etape(parcelleAutour({ ...s, niveaux: [rdc] }, 8_000)),
        { type: 'etage', copierMurs: true },
        ctx,
      ),
    );
    const { niveauId, ...scene } = avecEtage;
    const etage = amenager(
      scene.niveaux.find((x) => x.id === niveauId)!,
      ETAGE,
      ctx,
    );
    const complete = {
      ...scene,
      niveaux: scene.niveaux.map((x) => (x.id === niveauId ? etage : x)),
    };
    return succes(etape(toitureAutomatique(complete, 'deux_pans')));
  } catch (e) {
    if (e instanceof Arret) return echec('PRECONDITION', { message: e.message });
    throw e;
  }
}
