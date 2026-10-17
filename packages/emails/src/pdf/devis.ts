import {
  attestationTvaReduite,
  formulaireRetractation,
  TEXTE_BON_POUR_ACCORD,
  type LigneDevis,
  type ParametresFacturation,
} from '@ph/core/devis';
import { formatDate, formatEuros } from '@ph/core/format';
import { couleurs, neutres, rampes } from '@ph/ui/tokens';
import PDFDocument from 'pdfkit';

/** Ce que le PDF affiche, déjà calculé (totaux, conditions, annexes) : le gabarit ne décide rien. */
export interface DonneesPdf {
  type: 'devis' | 'facture' | 'acompte' | 'avoir';
  numero: string;
  date: Date;
  validiteLe?: Date;
  datePrestationLe?: Date;
  echeanceLe?: Date;
  client: { nom: string; adresse: string; email?: string };
  sirenClient?: string;
  lieuExecution?: string;
  objet: string;
  /** Texte simple (HTML assaini converti). */
  description: string;
  lignes: readonly LigneDevis[];
  totaux: {
    htBrutCentimes: number;
    remiseCentimes: number;
    htCentimes: number;
    tva: Record<string, number>;
    ttcCentimes: number;
  };
  remisePct: number;
  acomptesDeduits?: { numero: string; ttcCentimes: number }[];
  resteCentimes?: number;
  conditions: string[];
  notes?: string;
  annexes: ('retractation' | 'attestation_tva_reduite')[];
  entreprise: ParametresFacturation & { rcPro?: string; telephone?: string; email?: string };
  logo?: Buffer;
  /** Cachet de l'entreprise (image) : à côté de « Bon pour accord » ou sous les conditions. */
  tampon?: Buffer;
}

const TITRES: Record<DonneesPdf['type'], string> = {
  devis: 'DEVIS',
  facture: 'FACTURE',
  acompte: 'FACTURE D’ACOMPTE',
  avoir: 'AVOIR',
};

/** Polices standard (WinAnsi) : les espaces fines insécables de `Intl` deviennent des espaces. */
const net = (s: string) => s.replace(/[\u202f\u2009]/gu, ' ').replace(/≈/gu, '~');
const eur = (c: number) => net(formatEuros(c, { decimales: 'toujours' }));
const quantite = (q: number) => net(new Intl.NumberFormat('fr-FR').format(q));

/** `<b>a</b><ul><li>b</li></ul>` → « a\n• b » pour le PDF. */
export function htmlEnTexte(html: string): string {
  return html
    .replace(/<li>/gi, '\n• ')
    .replace(/<\/(ul|ol|li)>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .trim();
}

const ORANGE = rampes.pro[600];
const GRIS = neutres[700];
const TEXTE = couleurs.texte;
const TRAIT = neutres[300];
const MARGE = 46;

/**
 * PDF A4 du devis ou de la facture, généré côté serveur (DATABASE §8 ter) et enregistré tel quel :
 * le fichier téléchargé est celui envoyé au client (DEV-05). Date de création fixée à la date du
 * document, pour que le même document donne toujours le même fichier.
 */
export function genererPdf(d: DonneesPdf, o: { compresser?: boolean } = {}): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    margin: MARGE,
    compress: o.compresser ?? true,
    info: {
      Title: `${TITRES[d.type]} ${d.numero}`,
      Author: d.entreprise.raisonSociale,
      CreationDate: d.date,
      ModDate: d.date,
    },
    lang: 'fr-FR',
  });
  const morceaux: Buffer[] = [];
  doc.on('data', (b: Buffer) => morceaux.push(b));
  const fin = new Promise<Buffer>((ok) => doc.on('end', () => ok(Buffer.concat(morceaux))));
  const largeur = doc.page.width - 2 * MARGE;
  const e = d.entreprise;

  // En-tête : entreprise à gauche, type et numéro à droite.
  const haut = doc.y;
  if (d.logo) {
    try {
      doc.image(d.logo, MARGE, haut, { fit: [160, 50] });
      doc.moveDown(3.5);
    } catch {
      // Logo illisible : le PDF part sans lui.
    }
  }
  doc.font('Helvetica-Bold').fontSize(13).fillColor(TEXTE).text(net(e.raisonSociale), MARGE);
  doc.font('Helvetica').fontSize(9).fillColor(GRIS);
  const identite = [
    [e.formeJuridique, e.capitalSocial ? `au capital de ${e.capitalSocial}` : '']
      .filter(Boolean)
      .join(' '),
    e.adresseSiege,
    `SIRET ${e.siret}${e.rne ? ` · RNE ${e.rne}` : ''}`,
    e.tvaIntra ? `TVA intracommunautaire ${e.tvaIntra}` : '',
    [e.telephone, e.email].filter(Boolean).join(' · '),
  ].filter(Boolean);
  for (const l of identite) doc.text(net(l), { width: largeur / 2 });
  const basGauche = doc.y;
  doc
    .font('Helvetica-Bold')
    .fontSize(20)
    .fillColor(ORANGE)
    .text(TITRES[d.type], MARGE + largeur / 2, haut, { width: largeur / 2, align: 'right' });
  doc.font('Helvetica').fontSize(10).fillColor(TEXTE);
  const droite = [
    `N° ${d.numero}`,
    `Date : ${formatDate(d.date)}`,
    d.validiteLe ? `Valable jusqu’au ${formatDate(d.validiteLe)}` : '',
    d.datePrestationLe ? `Date de la prestation : ${formatDate(d.datePrestationLe)}` : '',
    d.echeanceLe ? `Échéance : ${formatDate(d.echeanceLe)}` : '',
  ].filter(Boolean);
  for (const l of droite) doc.text(net(l), { width: largeur / 2, align: 'right' });
  doc.y = Math.max(doc.y, basGauche) + 14;
  doc.x = MARGE;

  // Client et chantier.
  const yBloc = doc.y;
  const bloc = (titre: string, lignes: string[], x: number) => {
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(GRIS)
      .text(titre, x, yBloc, { width: largeur / 2 - 8 });
    doc.font('Helvetica').fontSize(10).fillColor(TEXTE);
    for (const l of lignes.filter(Boolean)) doc.text(net(l), x, doc.y, { width: largeur / 2 - 8 });
    return doc.y;
  };
  const y1 = bloc(
    'CLIENT',
    [
      d.client.nom,
      d.client.adresse,
      d.client.email ?? '',
      d.sirenClient ? `SIREN ${d.sirenClient}` : '',
    ],
    MARGE,
  );
  const y2 = bloc(
    'ADRESSE DU CHANTIER',
    [d.lieuExecution || d.client.adresse],
    MARGE + largeur / 2 + 8,
  );
  doc.y = Math.max(y1, y2) + 14;
  doc.x = MARGE;

  doc
    .font('Helvetica-Bold')
    .fontSize(12)
    .text(net(d.objet || ''), { width: largeur });
  if (d.description)
    doc.font('Helvetica').fontSize(10).text(net(d.description), { width: largeur });
  doc.moveDown(0.8);

  // Lignes.
  const colonnes = [
    { titre: 'Désignation', l: largeur - 300, align: 'left' as const },
    { titre: 'Qté', l: 50, align: 'right' as const },
    { titre: 'Unité', l: 50, align: 'left' as const },
    { titre: 'PU HT', l: 75, align: 'right' as const },
    { titre: 'TVA', l: 45, align: 'right' as const },
    { titre: 'Total HT', l: 80, align: 'right' as const },
  ];
  const ligneTableau = (cellules: string[], gras = false) => {
    const y = doc.y;
    let x = MARGE;
    let bas = y;
    doc.font(gras ? 'Helvetica-Bold' : 'Helvetica').fontSize(9.5);
    cellules.forEach((c, i) => {
      const col = colonnes[i]!;
      doc.text(net(c), x + 2, y, { width: col.l - 4, align: col.align });
      bas = Math.max(bas, doc.y);
      x += col.l;
    });
    doc.y = bas + 4;
    doc
      .moveTo(MARGE, doc.y - 2)
      .lineTo(MARGE + largeur, doc.y - 2)
      .lineWidth(0.4)
      .strokeColor(TRAIT)
      .stroke();
    if (doc.y > doc.page.height - 120) doc.addPage();
  };
  ligneTableau(
    colonnes.map((c) => c.titre),
    true,
  );
  for (const l of d.lignes)
    ligneTableau([
      l.designation,
      quantite(l.quantite),
      l.unite,
      eur(l.puHtCentimes),
      `${String(l.tva).replace('.', ',')} %`,
      eur(Math.round(l.quantite * l.puHtCentimes)),
    ]);

  // Totaux.
  doc.moveDown(0.4);
  const total = (libelle: string, montant: string, gras = false) => {
    const y = doc.y;
    doc.font(gras ? 'Helvetica-Bold' : 'Helvetica').fontSize(gras ? 11 : 10);
    doc.text(net(libelle), MARGE + largeur - 260, y, { width: 160, align: 'left' });
    doc.text(net(montant), MARGE + largeur - 100, y, { width: 100, align: 'right' });
  };
  if (d.totaux.remiseCentimes > 0) {
    total('Total HT avant remise', eur(d.totaux.htBrutCentimes));
    total(`Remise ${String(d.remisePct).replace('.', ',')} %`, `- ${eur(d.totaux.remiseCentimes)}`);
  }
  total('Total HT', eur(d.totaux.htCentimes));
  for (const [taux, montant] of Object.entries(d.totaux.tva))
    total(`TVA ${taux.replace('.', ',')} %`, eur(montant));
  total(d.type === 'avoir' ? 'Total TTC à déduire' : 'Total TTC', eur(d.totaux.ttcCentimes), true);
  for (const a of d.acomptesDeduits ?? [])
    total(`Acompte facturé ${a.numero}`, `- ${eur(a.ttcCentimes)}`);
  if (d.resteCentimes !== undefined && (d.acomptesDeduits?.length ?? 0) > 0)
    total('Reste à payer', eur(d.resteCentimes), true);
  doc.x = MARGE;
  doc.moveDown(1);

  // Conditions.
  doc.font('Helvetica-Bold').fontSize(10).text('Conditions', MARGE, doc.y, { width: largeur });
  doc.font('Helvetica').fontSize(8.5).fillColor(TEXTE);
  for (const c of d.conditions) doc.text(`• ${net(c)}`, { width: largeur });
  if (d.notes) {
    doc.moveDown(0.4);
    doc.text(net(d.notes), { width: largeur });
  }
  const cachet = (x: number, y: number) => {
    if (!d.tampon) return;
    try {
      doc.image(d.tampon, x, y, { fit: [150, 70] });
    } catch {
      // Cachet illisible : le PDF part sans lui.
    }
  };
  if (d.type === 'devis') {
    doc.moveDown(0.8);
    const y = doc.y;
    cachet(MARGE, y);
    doc
      .rect(MARGE + largeur / 2, y, largeur / 2, 70)
      .lineWidth(0.6)
      .strokeColor(neutres[400])
      .stroke();
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .text(net(TEXTE_BON_POUR_ACCORD), MARGE + largeur / 2 + 8, y + 8, {
        width: largeur / 2 - 16,
      });
    doc.y = y + 80;
  } else if (d.tampon) {
    doc.moveDown(0.8);
    const y = doc.y;
    cachet(MARGE + largeur / 2, y);
    doc.y = y + 80;
  }
  doc.x = MARGE;
  doc.moveDown(0.6);
  doc.font('Helvetica').fontSize(8).fillColor(GRIS);
  if (e.assuranceDecennale)
    doc.text(
      net(
        `Assurance décennale : ${e.assuranceDecennale.assureur}, contrat n° ${e.assuranceDecennale.contrat}, couverture : ${e.assuranceDecennale.zone}.${e.rcPro ? ` ${e.rcPro}.` : ''}`,
      ),
      { width: largeur },
    );

  // Annexes (DEV-03, DEV-04).
  const annexe = (a: { titre: string; lignes: string[] }) => {
    doc.addPage();
    doc.font('Helvetica-Bold').fontSize(14).fillColor(TEXTE).text(net(a.titre), { width: largeur });
    doc.moveDown(0.8);
    doc.font('Helvetica').fontSize(10);
    for (const l of a.lignes) {
      doc.text(net(l), { width: largeur });
      doc.moveDown(0.5);
    }
    doc.font('Helvetica').fontSize(9).fillColor(GRIS).text(`Annexe au devis ${d.numero}`);
  };
  if (d.annexes.includes('retractation')) annexe(formulaireRetractation(e));
  if (d.annexes.includes('attestation_tva_reduite')) annexe(attestationTvaReduite(d.client));

  doc.end();
  return fin;
}
