import {
  aire,
  centroide,
  contourMur,
  formatLongueur,
  formatSurface,
  longueurMur,
  type MiseEnPage,
  type Niveau,
  type Point,
} from '@ph/core/dessin';
import { COULEURS_PLAN } from '@ph/ui/tokens';

/** Points PDF par mm de papier. */
export const PT = 72 / 25.4;
export const net = (s: string) => s.replace(/[\u202f\u2009\u00a0]/gu, ' ');

type Doc = PDFKit.PDFDocument;
type Cadre = { x: number; y: number };

/** Fonctions de dessin d'un niveau : point du plan → point PDF, polygone. */
interface Trace {
  doc: Doc;
  v: (p: Point) => [number, number];
  poly: (pts: readonly Point[]) => void;
  k: number;
}

/** Dessin d'un niveau à l'échelle (DES-41) : pièces, murs, baies, noms, surfaces et cotes. */
export function dessinerNiveau(doc: Doc, n: Niveau, cadre: Cadre, m: MiseEnPage) {
  const v = (p: Point): [number, number] => [
    (m.origine.x + (p.x - cadre.x) * m.k) * PT,
    (m.origine.y + (p.y - cadre.y) * m.k) * PT,
  ];
  const poly = (pts: readonly Point[]) => {
    const [x0, y0] = v(pts[0]!);
    doc.moveTo(x0, y0);
    for (const p of pts.slice(1)) doc.lineTo(...v(p));
    doc.closePath();
  };
  const t: Trace = { doc, v, poly, k: m.k };
  dessinerPieces(t, n);
  dessinerMurs(t, n);
  dessinerBaies(t, n);
  dessinerTextes(t, n);
}

/** Pièces : fond blanc. */
function dessinerPieces({ doc, poly }: Trace, n: Niveau) {
  // Pièces : fond blanc, nom et surface au centre.
  for (const p of n.pieces) {
    poly(p.contour);
    doc.fillColor(COULEURS_PLAN.pieceVide).fill();
  }
}

/** Murs pleins, cloisons plus claires ; séparations invisibles en tirets. */
function dessinerMurs({ doc, v, poly }: Trace, n: Niveau) {
  // Murs pleins, cloisons plus claires ; séparations invisibles en tirets.
  for (const mur of n.murs) {
    if (mur.type === 'poutre') continue;
    if (mur.type === 'separation') {
      doc.moveTo(...v(mur.a)).lineTo(...v(mur.b));
      doc
        .dash(3, { space: 2 })
        .lineWidth(0.4)
        .strokeColor(COULEURS_PLAN.coteTrait)
        .stroke()
        .undash();
      continue;
    }
    // Prolongé d'une demi-épaisseur à chaque bout : les angles se referment.
    const lm = longueurMur(mur) || 1;
    const [dx, dy] = [
      ((mur.b.x - mur.a.x) / lm) * (mur.epaisseur / 2),
      ((mur.b.y - mur.a.y) / lm) * (mur.epaisseur / 2),
    ];
    poly(
      contourMur({
        ...mur,
        a: { x: mur.a.x - dx, y: mur.a.y - dy },
        b: { x: mur.b.x + dx, y: mur.b.y + dy },
      }),
    );
    doc.fillColor(mur.type === 'mur' ? COULEURS_PLAN.mur : COULEURS_PLAN.cote).fill();
  }
}

/** Baies : percement blanc, vantail et débattement d'une porte, double trait d'une fenêtre. */
function dessinerBaies({ doc, v, poly, k }: Trace, n: Niveau) {
  // Baies : percement blanc, vantail et arc pour une porte, double trait pour une fenêtre.
  for (const o of n.ouvertures) {
    const mur = n.murs.find((x) => x.id === o.murId);
    if (!mur) continue;
    const l = longueurMur(mur) || 1;
    const u = { x: (mur.b.x - mur.a.x) / l, y: (mur.b.y - mur.a.y) / l };
    const no = { x: -u.y, y: u.x };
    const at = (t: number, d: number) => ({
      x: mur.a.x + u.x * t + no.x * d,
      y: mur.a.y + u.y * t + no.y * d,
    });
    const e = mur.epaisseur / 2 + 20;
    const [t0, t1] = [o.position, o.position + o.largeur];
    poly([at(t0, -e), at(t1, -e), at(t1, e), at(t0, e)]);
    doc.fillColor('white').fill();
    doc.lineWidth(0.5).strokeColor(COULEURS_PLAN.mur);
    if (
      o.type.startsWith('porte') &&
      !o.type.includes('fenetre') &&
      !o.type.includes('galandage')
    ) {
      const charniere = at(t0, mur.epaisseur / 2);
      const bout = at(t0, mur.epaisseur / 2 + o.largeur);
      doc
        .moveTo(...v(charniere))
        .lineTo(...v(bout))
        .stroke();
      const [cx, cy] = v(charniere);
      const r = o.largeur * k * PT;
      const a0 = Math.atan2(no.y, no.x);
      const a1 = Math.atan2(u.y, u.x);
      const pas = 12;
      doc.moveTo(...v(bout));
      for (let i = 1; i <= pas; i++) {
        const a = a0 + (((a1 - a0 + 3 * Math.PI) % (2 * Math.PI)) - Math.PI) * (i / pas);
        doc.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      }
      doc.dash(2, { space: 1.5 }).stroke().undash();
    } else
      for (const d of [-mur.epaisseur / 6, mur.epaisseur / 6])
        doc
          .moveTo(...v(at(t0, d)))
          .lineTo(...v(at(t1, d)))
          .stroke();
  }
}

/** Noms et surfaces des pièces, cotes extérieures des murs. */
function dessinerTextes({ doc, v }: Trace, n: Niveau) {
  // Noms et surfaces des pièces, cotes des murs.
  doc.font('Helvetica').fontSize(7).fillColor(COULEURS_PLAN.cote);
  for (const p of n.pieces) {
    const [x, y] = v(centroide(p.contour));
    doc.font('Helvetica-Bold').text(net(p.nom), x - 60, y - 9, { width: 120, align: 'center' });
    doc.font('Helvetica').text(net(formatSurface(Math.round(aire(p.contour)))), x - 60, y, {
      width: 120,
      align: 'center',
    });
  }
  doc.fontSize(6);
  const centre = centroide(n.murs.flatMap((x) => [x.a, x.b]));
  for (const mur of n.murs.filter((x) => x.type === 'mur')) {
    const l = longueurMur(mur);
    if (l < 500) continue;
    // Cote du côté extérieur : à l'opposé du centre de la maison.
    const mi = { x: (mur.a.x + mur.b.x) / 2, y: (mur.a.y + mur.b.y) / 2 };
    let no = { x: -(mur.b.y - mur.a.y) / l, y: (mur.b.x - mur.a.x) / l };
    if ((mi.x - centre.x) * no.x + (mi.y - centre.y) * no.y < 0) no = { x: -no.x, y: -no.y };
    const d = mur.epaisseur / 2 + 350;
    const c = { x: mi.x + no.x * d, y: mi.y + no.y * d };
    const [x, y] = v(c);
    doc.text(net(formatLongueur(l)), x - 25, y - 3, { width: 50, align: 'center' });
  }
}
