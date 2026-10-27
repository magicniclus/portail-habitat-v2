import {
  attestationTvaReduite,
  estLigneChiffree,
  formulaireRetractation,
  LIBELLES_NATURE_LIGNE,
  natureLigne,
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
  client: {
    nom: string;
    adresse: string;
    complement?: string;
    codePostal?: string;
    ville?: string;
    pays?: string;
    email?: string;
  };
  sirenClient?: string;
  tvaIntraClient?: string;
  /** Intitulé choisi dans l'éditeur (« Proposition commerciale ») ; devis seulement. */
  intitule?: string;
  /** Rapide : désignation, TVA et montant HT, sans quantité ni prix unitaire. */
  modeSaisie?: 'rapide' | 'complet';
  conditionsAcceptation?: string;
  /** Brouillon téléchargé depuis la liste : marqué, jamais pris pour le devis validé. */
  brouillon?: boolean;
  /** Cadre « Bon pour accord » (devis) ; absent = imprimé (anciens devis). */
  champSignature?: boolean;
  champLibre?: { titre: string; texte: string };
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
/** Fond doux de l'accent : pastille du total TTC. */
const ORANGE_FOND = rampes.pro[100];
const GRIS = neutres[700];
const TEXTE = couleurs.texte;
const TRAIT = neutres[300];
const MARGE = 46;
/** Bas utile de la page : le pied « Page x / n » occupe les derniers points. */
const BAS = 36;

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
    bufferPages: true,
    info: {
      Title: `${d.type === 'devis' && d.intitule?.trim() ? d.intitule.trim() : TITRES[d.type]} ${d.numero}`,
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
  const titre =
    d.type === 'devis' && d.intitule?.trim() ? d.intitule.trim().toUpperCase() : TITRES[d.type];

  const droiteX = MARGE + largeur * 0.55;
  const droiteL = largeur * 0.45;

  // Logo, puis l'entreprise à gauche ; le client en dessous, à droite (captures du propriétaire).
  let y0 = doc.y;
  if (d.logo) {
    try {
      doc.image(d.logo, MARGE, y0, { fit: [130, 46] });
      y0 += 58;
    } catch {
      // Logo illisible : le PDF part sans lui.
    }
  }
  doc.font('Helvetica').fontSize(10).fillColor(TEXTE);
  const entrepriseLignes = [
    e.raisonSociale ?? '',
    e.adresseSiege ?? '',
    [e.formeJuridique, e.capitalSocial ? `au capital de ${e.capitalSocial}` : '']
      .filter(Boolean)
      .join(' '),
    [e.siret ? `SIRET ${e.siret}` : '', e.rne ? `RNE ${e.rne}` : ''].filter(Boolean).join(' · '),
    e.tvaIntra ? `TVA intracommunautaire ${e.tvaIntra}` : '',
    [e.telephone, e.email].filter(Boolean).join(' · '),
  ].filter(Boolean);
  doc.y = y0;
  entrepriseLignes.forEach((l, i) =>
    doc
      .font(i === 0 ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(i === 0 ? 11 : 9.5)
      .fillColor(i === 0 ? TEXTE : GRIS)
      .text(net(l), MARGE, doc.y, { width: largeur * 0.5 }),
  );
  const basEntreprise = doc.y;

  const clientLignes = [
    d.client.adresse,
    d.client.complement ?? '',
    [d.client.codePostal, d.client.ville].filter(Boolean).join(' '),
    d.client.pays ?? '',
    d.client.email ?? '',
    d.sirenClient ? `SIREN ${d.sirenClient}` : '',
    d.tvaIntraClient ? `TVA intracommunautaire ${d.tvaIntraClient}` : '',
  ].filter(Boolean);
  doc.y = y0 + 34;
  doc.font('Helvetica-Bold').fontSize(11).fillColor(TEXTE);
  doc.text(net(d.client.nom), droiteX, doc.y, { width: droiteL });
  doc.font('Helvetica').fontSize(10).fillColor(TEXTE);
  for (const l of clientLignes) doc.text(net(l), droiteX, doc.y, { width: droiteL });
  if (d.lieuExecution && d.lieuExecution !== d.client.adresse) {
    doc.moveDown(0.3);
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(GRIS)
      .text(net(`Lieu d’exécution : ${d.lieuExecution}`), droiteX, doc.y, { width: droiteL });
  }
  doc.y = Math.max(doc.y, basEntreprise) + 26;

  // Titre et dates : « DEVIS N° … » à gauche, validité ou échéance à droite.
  const yTitre = doc.y;
  doc
    .font('Helvetica-Bold')
    .fontSize(9)
    .fillColor(ORANGE)
    .text(net(titre), MARGE, yTitre, { width: largeur * 0.55, characterSpacing: 1 });
  doc
    .font('Helvetica-Bold')
    .fontSize(13)
    .fillColor(TEXTE)
    .text(net(`N° ${d.numero}`), MARGE, doc.y + 1, { width: largeur * 0.55 });
  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor(GRIS)
    .text(net(`Date d’émission : ${formatDate(d.date)}`), MARGE, doc.y + 1, {
      width: largeur * 0.55,
    });
  const basTitre = doc.y;
  doc.y = yTitre + 13;
  const droite = [
    d.brouillon ? 'BROUILLON · Document de travail, non validé' : '',
    d.validiteLe ? `Valable jusqu’au ${formatDate(d.validiteLe)}` : '',
    d.datePrestationLe ? `Date de la prestation : ${formatDate(d.datePrestationLe)}` : '',
    d.echeanceLe ? `Échéance : ${formatDate(d.echeanceLe)}` : '',
  ].filter(Boolean);
  doc.font('Helvetica').fontSize(10).fillColor(TEXTE);
  for (const l of droite) doc.text(net(l), droiteX, doc.y, { width: droiteL });
  doc.y = Math.max(doc.y, basTitre) + 14;
  doc.x = MARGE;

  if (d.objet) {
    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor(TEXTE)
      .text(net(d.objet), MARGE, doc.y, { width: largeur });
  }
  if (d.description)
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor(GRIS)
      .text(net(d.description), MARGE, doc.y + 2, { width: largeur });
  doc.moveDown(0.8);

  // Lignes : en-tête coloré arrondi, une ligne de texte s'imprime en intertitre (hors totaux).
  const rapide = d.modeSaisie === 'rapide';
  const colonnes = rapide
    ? [
        { titre: 'Désignation', l: largeur - 160, align: 'left' as const },
        { titre: 'TVA', l: 60, align: 'center' as const },
        { titre: 'Montant HT', l: 100, align: 'right' as const },
      ]
    : [
        { titre: 'Désignation', l: largeur - 316, align: 'left' as const },
        { titre: 'Quantité', l: 56, align: 'right' as const },
        { titre: 'Unité', l: 50, align: 'center' as const },
        { titre: 'Prix unitaire', l: 72, align: 'right' as const },
        { titre: 'TVA', l: 46, align: 'center' as const },
        { titre: 'Montant HT', l: 92, align: 'right' as const },
      ];
  const limite = () => doc.page.height - MARGE - BAS;
  /** Nouvelle page si `hauteur` ne tient plus ; renvoie vrai si une page a été ajoutée. */
  const place = (hauteur: number) => {
    if (doc.y + hauteur <= limite()) return false;
    doc.addPage();
    doc.x = MARGE;
    return true;
  };
  const PAD = 7;
  const hauteurLigne = (cellules: string[], gras: boolean) => {
    doc.font(gras ? 'Helvetica-Bold' : 'Helvetica').fontSize(9.5);
    return (
      Math.max(
        ...cellules.map((c, i) => doc.heightOfString(net(c), { width: colonnes[i]!.l - 2 * PAD })),
      ) +
      2 * PAD
    );
  };
  const entete = () => {
    const titres = colonnes.map((c) => c.titre);
    const h = Math.max(26, hauteurLigne(titres, true));
    const y = doc.y;
    doc.roundedRect(MARGE, y, largeur, h, 7).fill(ORANGE);
    let x = MARGE;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(couleurs.blanc);
    titres.forEach((t, i) => {
      const col = colonnes[i]!;
      const th = doc.heightOfString(t, { width: col.l - 2 * PAD });
      doc.text(net(t), x + PAD, y + (h - th) / 2, { width: col.l - 2 * PAD, align: col.align });
      x += col.l;
    });
    doc.fillColor(TEXTE);
    doc.y = y + h + 2;
  };
  const filet = () => {
    doc
      .moveTo(MARGE + 4, doc.y)
      .lineTo(MARGE + largeur - 4, doc.y)
      .lineWidth(0.4)
      .strokeColor(TRAIT)
      .stroke();
  };
  const ligneTableau = (cellules: string[]) => {
    // Une ligne n'est jamais coupée : elle passe entière à la page suivante, sous l'en-tête répété.
    if (place(hauteurLigne(cellules, false))) entete();
    const y = doc.y;
    let x = MARGE;
    let bas = y;
    cellules.forEach((c, i) => {
      const col = colonnes[i]!;
      const dernier = i === cellules.length - 1;
      doc
        .font(dernier ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(9.5)
        .fillColor(TEXTE)
        .text(net(c), x + PAD, y + PAD, { width: col.l - 2 * PAD, align: col.align });
      bas = Math.max(bas, doc.y);
      x += col.l;
    });
    doc.y = bas + PAD;
    filet();
  };
  place(70);
  entete();
  for (const l of d.lignes) {
    if (!estLigneChiffree(l)) {
      doc.font('Helvetica-Bold').fontSize(10);
      if (place(doc.heightOfString(net(l.designation), { width: largeur - 2 * PAD }) + 2 * PAD))
        entete();
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(TEXTE)
        .text(net(l.designation), MARGE + PAD, doc.y + PAD, { width: largeur - 2 * PAD });
      doc.y += PAD;
      filet();
      continue;
    }
    const designation = `${l.designation}${natureLigne(l) === 'fourniture' ? `\n${LIBELLES_NATURE_LIGNE.fourniture}` : ''}`;
    const totalLigne = eur(Math.round(l.quantite * l.puHtCentimes));
    const tva = `${String(l.tva).replace('.', ',')} %`;
    ligneTableau(
      rapide
        ? [designation, tva, totalLigne]
        : [designation, quantite(l.quantite), l.unite, eur(l.puHtCentimes), tva, totalLigne],
    );
  }

  // Totaux à droite, libellés à l'accent ; « Total TTC » dans une pastille (bloc jamais coupé).
  doc.moveDown(0.8);
  place(
    20 *
      (3 +
        Object.keys(d.totaux.tva).length +
        (d.totaux.remiseCentimes > 0 ? 2 : 0) +
        (d.acomptesDeduits?.length ?? 0)),
  );
  const xTotaux = MARGE + largeur - 250;
  const total = (libelle: string, montant: string, fort = false) => {
    const y = doc.y;
    if (fort) {
      doc.roundedRect(xTotaux + 130, y - 5, 120, 22, 11).fill(ORANGE_FOND);
    }
    doc
      .font(fort ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(fort ? 11 : 10)
      .fillColor(ORANGE)
      .text(net(libelle), xTotaux, y, { width: 130, align: 'left' });
    doc
      .fillColor(fort ? ORANGE : TEXTE)
      .text(net(montant), xTotaux + 130, y, { width: 110, align: 'right' });
    doc.y = y + (fort ? 24 : 18);
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
  doc.moveDown(0.6);

  // Conditions sous un filet (le texte passe seul à la page suivante si besoin).
  place(40);
  doc
    .moveTo(MARGE, doc.y)
    .lineTo(MARGE + largeur, doc.y)
    .lineWidth(0.5)
    .strokeColor(TRAIT)
    .stroke();
  doc.moveDown(0.6);
  doc.font('Helvetica').fontSize(9).fillColor(TEXTE);
  for (const c of d.conditions) {
    doc.text(net(c), MARGE, doc.y, { width: largeur });
    doc.moveDown(0.25);
  }
  if (d.conditionsAcceptation?.trim()) {
    doc.text(net(`Conditions d’acceptation : ${d.conditionsAcceptation.trim()}`), MARGE, doc.y, {
      width: largeur,
    });
    doc.moveDown(0.25);
  }
  if (d.notes) {
    doc.moveDown(0.3);
    doc.text(net(d.notes), MARGE, doc.y, { width: largeur });
  }
  if (d.champLibre?.texte.trim()) {
    doc.moveDown(0.4);
    if (d.champLibre.titre.trim())
      doc
        .font('Helvetica-Bold')
        .text(net(d.champLibre.titre.trim()), MARGE, doc.y, { width: largeur });
    doc.font('Helvetica').text(net(d.champLibre.texte.trim()), MARGE, doc.y, { width: largeur });
  }
  const cachet = (x: number, y: number) => {
    if (!d.tampon) return;
    try {
      doc.image(d.tampon, x, y, { fit: [150, 70] });
    } catch {
      // Cachet illisible : le PDF part sans lui.
    }
  };
  if (d.type === 'devis' && d.champSignature !== false) {
    doc.moveDown(0.8);
    place(84);
    const y = doc.y;
    cachet(MARGE, y);
    doc
      .roundedRect(MARGE + largeur / 2, y, largeur / 2, 76, 8)
      .lineWidth(0.6)
      .dash(3, { space: 3 })
      .strokeColor(neutres[400])
      .stroke()
      .undash();
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(TEXTE)
      .text(net(TEXTE_BON_POUR_ACCORD), MARGE + largeur / 2 + 10, y + 10, {
        width: largeur / 2 - 20,
      });
    doc.y = y + 86;
  } else if (d.tampon) {
    doc.moveDown(0.8);
    place(80);
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
      MARGE,
      doc.y,
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

  // Pied de chaque page : identité et « Page x / n ».
  const plage = doc.bufferedPageRange();
  for (let i = 0; i < plage.count; i++) {
    doc.switchToPage(plage.start + i);
    const y = doc.page.height - MARGE - 12;
    doc.page.margins.bottom = 0;
    doc
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor(GRIS)
      .text(
        net([e.raisonSociale, e.siret ? `SIRET ${e.siret}` : ''].filter(Boolean).join(' · ')),
        MARGE,
        y,
        {
          width: largeur - 80,
          lineBreak: false,
        },
      )
      .text(`Page ${i + 1} / ${plage.count}`, MARGE + largeur - 80, y, {
        width: 80,
        align: 'right',
        lineBreak: false,
      });
  }
  doc.end();
  return fin;
}
