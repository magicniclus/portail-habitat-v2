import { describe, expect, it } from 'vitest';
import { genererPdf, htmlEnTexte, type DonneesPdf } from './devis';

/** Texte du PDF non compressé : chaînes hexadécimales des opérateurs TJ, en Windows-1252. */
function texteDuPdf(b: Buffer): string {
  const brut = b.toString('latin1');
  const dec = new TextDecoder('windows-1252');
  const morceaux: string[] = [];
  for (const m of brut.matchAll(/\[(.*?)\]\s*TJ/gs))
    morceaux.push(
      [...m[1]!.matchAll(/<([0-9a-fA-F]+)>/g)]
        .map((h) => dec.decode(Buffer.from(h[1]!, 'hex')))
        .join(''),
    );
  return morceaux.join('\n');
}

const base: DonneesPdf = {
  type: 'devis',
  numero: 'D-2026-0001',
  date: new Date('2026-10-14T09:00:00Z'),
  validiteLe: new Date('2026-11-13T12:00:00Z'),
  client: { nom: 'Claire Martin', adresse: '3 rue des Lilas, 33700 Mérignac' },
  objet: 'Rénovation salle de bain',
  description: 'Dépose et pose',
  lignes: [{ designation: 'Pose receveur', quantite: 1, unite: 'u', puHtCentimes: 69000, tva: 20 }],
  totaux: {
    htBrutCentimes: 69000,
    remiseCentimes: 0,
    htCentimes: 69000,
    tva: { '20': 13800 },
    ttcCentimes: 82800,
  },
  remisePct: 0,
  conditions: ['Devis gratuit.'],
  annexes: [],
  entreprise: {
    raisonSociale: 'Bertrand Rénovation',
    adresseSiege: '14 rue des Faures, 33800 Bordeaux',
    siret: '81234567800021',
    franchiseTva: false,
    tvaSurDebits: false,
    delaiPaiementJours: 30,
    assuranceDecennale: { assureur: 'MAAF', contrat: '0045821', zone: 'France' },
  },
};

describe('PDF des devis et factures', () => {
  it('contenu : entreprise, client, totaux, décennale, bon pour accord ; jamais la marge', async () => {
    const t = texteDuPdf(await genererPdf(base, { compresser: false }));
    for (const attendu of [
      'Bertrand Rénovation',
      'DEVIS',
      'D-2026-0001',
      'Claire Martin',
      'Total TTC',
      '828,00',
      'MAAF',
      'Bon pour accord',
    ])
      expect(t).toContain(attendu);
    expect(t).not.toMatch(/marge/i);
  });

  it('DEV-03 et DEV-04 : formulaire de rétractation et attestation TVA annexés', async () => {
    const t = texteDuPdf(
      await genererPdf(
        { ...base, annexes: ['retractation', 'attestation_tva_reduite'] },
        { compresser: false },
      ),
    );
    expect(t).toContain('Formulaire de rétractation');
    expect(t).toContain('Attestation simplifiée de TVA à taux réduit');
    expect(texteDuPdf(await genererPdf(base, { compresser: false }))).not.toContain(
      'Formulaire de rétractation',
    );
  });

  it('DEV-05 : même document → même fichier, octet pour octet', async () => {
    const [a, b] = await Promise.all([genererPdf(base), genererPdf(base)]);
    expect(a.subarray(0, 5).toString()).toBe('%PDF-');
    expect(a.equals(b)).toBe(true);
  });

  it('facture : titre, acompte déduit et reste à payer', async () => {
    const t = texteDuPdf(
      await genererPdf(
        {
          ...base,
          type: 'facture',
          numero: 'F-2026-0002',
          acomptesDeduits: [{ numero: 'F-2026-0001', ttcCentimes: 24840 }],
          resteCentimes: 57960,
        },
        { compresser: false },
      ),
    );
    expect(t).toContain('FACTURE');
    expect(t).toContain('Reste à payer');
    expect(t).toContain('579,60');
    expect(t).not.toContain('Bon pour accord');
  });

  it('description HTML convertie en texte', () => {
    expect(htmlEnTexte('<b>Dépose</b>&nbsp;et <ul><li>un</li><li>deux &amp; trois</li></ul>')).toBe(
      'Dépose et \n• un\n• deux & trois',
    );
  });
});
