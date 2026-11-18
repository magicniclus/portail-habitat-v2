import {
  aire,
  cadreImpression,
  formatSurface,
  FORMATS_PAPIER,
  HAUTEUR_CARTOUCHE,
  libelleLigneMetre,
  MARGE_PAPIER,
  miseEnPage,
  quantiteMetre,
  type Echelle,
  type FormatPapier,
  type LigneMetre,
  type Scene,
} from '@ph/core/dessin';
import { formatDate } from '@ph/core/format';
import { COULEURS_PLAN } from '@ph/ui/tokens';
import PDFDocument from 'pdfkit';
import { dessinerNiveau, net, PT } from './planDessin';

/** Ce que le PDF du plan affiche (DES-41) ; les lignes de métré sont celles cochées. */
export interface DonneesPdfPlan {
  titre: string;
  date: Date;
  scene: Scene;
  niveauId: string;
  echelle: Echelle;
  format: FormatPapier;
  metre: readonly LigneMetre[];
  menuiseries: readonly { libelle: string; nombre: number }[];
}

const MENTION = 'Plan indicatif réalisé avec Portail Travaux : cotes à vérifier sur place.';

/**
 * PDF à l'échelle : une page à l'italienne (plan, flèche du nord, échelle graphique, cartouche,
 * légende), puis le métré en annexe. Lève une erreur lisible si le plan ne tient pas.
 */
export function genererPdfPlan(d: DonneesPdfPlan): Promise<Buffer> {
  const n = d.scene.niveaux.find((x) => x.id === d.niveauId);
  const cadre = n && cadreImpression(n);
  if (!n || !cadre) return Promise.reject(new Error('Dessinez d’abord les murs de ce niveau.'));
  const mise = miseEnPage(cadre, d.echelle, d.format);
  if (!mise.ok) return Promise.reject(new Error(mise.message));
  const papier = FORMATS_PAPIER[d.format];
  const doc = new PDFDocument({
    size: [papier.l * PT, papier.h * PT],
    margin: 0,
    info: { Title: net(d.titre), CreationDate: d.date, ModDate: d.date },
    lang: 'fr-FR',
  });
  const morceaux: Buffer[] = [];
  doc.on('data', (b: Buffer) => morceaux.push(b));
  const fin = new Promise<Buffer>((ok) => doc.on('end', () => ok(Buffer.concat(morceaux))));

  dessinerNiveau(doc, n, cadre, mise.data);
  const k = mise.data.k;
  const [L, H] = [papier.l * PT, papier.h * PT];
  const M = MARGE_PAPIER * PT;

  // Flèche du nord (en haut à droite), tournée comme le plan.
  doc
    .save()
    .translate(L - M - 18, M + 22)
    .rotate(d.scene.orientationNord / 10);
  doc
    .moveTo(0, -14)
    .lineTo(6, 8)
    .lineTo(0, 4)
    .lineTo(-6, 8)
    .closePath()
    .fillColor(COULEURS_PLAN.mur)
    .fill();
  doc.restore().font('Helvetica-Bold').fontSize(8).fillColor(COULEURS_PLAN.mur);
  doc.text('N', L - M - 24, M, { width: 12, align: 'center' });

  // Échelle graphique : 5 m en tranches de 1 m.
  const yBarre = H - M - HAUTEUR_CARTOUCHE * PT - 14;
  for (let i = 0; i < 5; i++) {
    doc.rect(M + i * 1000 * k * PT, yBarre, 1000 * k * PT, 3);
    doc
      .fillColor(i % 2 ? 'white' : COULEURS_PLAN.mur)
      .strokeColor(COULEURS_PLAN.mur)
      .lineWidth(0.4)
      .fillAndStroke();
  }
  doc.font('Helvetica').fontSize(6).fillColor(COULEURS_PLAN.cote);
  doc.text('0', M - 2, yBarre + 5).text('5 m', M + 5000 * k * PT - 6, yBarre + 5);

  // Cartouche : titre, niveau, échelle, date, surface ; légende à droite.
  const yC = H - M - HAUTEUR_CARTOUCHE * PT;
  doc
    .rect(M, yC, L - 2 * M, HAUTEUR_CARTOUCHE * PT)
    .lineWidth(0.6)
    .strokeColor(COULEURS_PLAN.mur)
    .stroke();
  const surface = n.pieces.reduce((s, p) => s + Math.round(aire(p.contour)), 0);
  doc.font('Helvetica-Bold').fontSize(11).fillColor(COULEURS_PLAN.mur);
  doc.text(net(d.titre), M + 8, yC + 8, { width: L / 2 - M, lineBreak: false, ellipsis: true });
  doc.font('Helvetica').fontSize(8).fillColor(COULEURS_PLAN.cote);
  doc.text(
    net(
      `${n.nom} · Échelle 1/${d.echelle} · ${d.format} · ${formatDate(d.date)} · Surface des pièces ${formatSurface(surface)}`,
    ),
    M + 8,
    yC + 26,
    { width: L / 2 - M },
  );
  doc.fontSize(6.5).text(net(MENTION), M + 8, yC + 44, { width: L / 2 - M });
  const xL = L / 2 + 20;
  const legende: [string, string][] = [
    [COULEURS_PLAN.mur, 'Mur'],
    [COULEURS_PLAN.cote, 'Cloison'],
  ];
  legende.forEach(([c, t], i) => {
    doc
      .rect(xL + i * 80, yC + 12, 14, 6)
      .fillColor(c)
      .fill();
    doc
      .fillColor(COULEURS_PLAN.cote)
      .fontSize(8)
      .text(t, xL + i * 80 + 18, yC + 11);
  });
  doc
    .fontSize(8)
    .text('Porte : vantail et débattement en tirets · Fenêtre : double trait', xL, yC + 30);

  // Annexe : métré des postes cochés.
  if (d.metre.length || d.menuiseries.length) {
    doc.addPage({ size: 'A4', margin: 40 });
    doc.font('Helvetica-Bold').fontSize(14).fillColor(COULEURS_PLAN.mur).text('Métré');
    doc.font('Helvetica').fontSize(9).fillColor(COULEURS_PLAN.cote);
    doc.text(net('Quantités calculées depuis le plan, tous niveaux. Indicatif.')).moveDown();
    const ligne = (a: string, b: string) => {
      const y = doc.y;
      doc.fillColor(COULEURS_PLAN.mur).text(net(a), 40, y, { width: 380 });
      doc.text(net(b), 420, y, { width: 135, align: 'right' });
      doc
        .moveTo(40, doc.y + 2)
        .lineTo(555, doc.y + 2)
        .lineWidth(0.3)
        .strokeColor(COULEURS_PLAN.etiquetteTrait)
        .stroke();
      doc.moveDown(0.5);
    };
    for (const l of d.metre) ligne(libelleLigneMetre(l), quantiteMetre(l));
    for (const m of d.menuiseries) ligne(`Menuiserie : ${m.libelle}`, `× ${m.nombre}`);
  }
  doc.end();
  return fin;
}
