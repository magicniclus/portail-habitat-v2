import { ErreurMetier } from '@ph/core/erreurs';
import { entreeEnregistrerDevis } from '@ph/core/schemas';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { chemins } from '../src/chemins';
import {
  changerStatutDevis,
  creerAvoir,
  enregistrerDevis,
  enregistrerPaiement,
  enregistrerParametresFacturation,
  envoyerDevis,
  facturerDevis,
} from '../src/serveur/devis';

// DATABASE §8 bis-ter, ACCEPTANCE DEV-01, DEV-02, DEV-06, DEV-07 (partie serveur).
let db: Firestore;
const T = Date.UTC(2026, 9, 14, 9);
const s = () => ({ db, horloge: () => T });
const proprio = { artisanId: 'a1', uid: 'p1' };
const collab = { artisanId: 'a1', uid: 'c1' };
const compta = { artisanId: 'a1', uid: 'x1' };

const PARAMS = {
  raisonSociale: 'Bertrand Rénovation',
  formeJuridique: 'SARL',
  capitalSocial: '10 000 €',
  adresseSiege: '14 rue des Faures, 33800 Bordeaux',
  siret: '81234567800021',
  franchiseTva: false,
  tvaSurDebits: false,
  assuranceDecennale: { assureur: 'MAAF', contrat: '0045821', zone: 'France métropolitaine' },
  mediateur: { nom: 'CM2C', adresse: '14 rue Saint-Jean, 75017 Paris' },
  delaiPaiementJours: 30,
  acompteDefautPct: 30,
  validiteDevisJours: 30,
  tvaDefaut: 10 as const,
  tauxPenalitesAnnuel: 12.15,
};

const brut = {
  client: {
    nom: 'Claire Martin',
    email: 'claire@test.local',
    adresse: '3 rue des Lilas, 33700 Mérignac',
  },
  typeClient: 'particulier',
  horsEtablissement: false,
  objet: 'Rénovation salle de bain',
  descriptionHtml: '<b>Dépose</b> <script>alert(1)</script>',
  lignes: [
    {
      designation: 'Pose receveur',
      quantite: 1,
      unite: 'u',
      puHtCentimes: 69000,
      tva: 10,
      coutHtCentimes: 36000,
    },
    { designation: 'Faïence', quantite: 12, unite: 'm²', puHtCentimes: 7800, tva: 10 },
  ],
  remisePct: 0,
  acomptePct: 30,
  validiteLe: '2026-11-13',
  debutTravauxLe: '2026-11-16',
  dureeEstimee: '5 jours ouvrés',
  fraisDeplacement: 'Inclus',
  devisGratuit: true,
  notes: '',
  signatureElectronique: true,
  tampon: false,
};
const entree = (extra: Record<string, unknown> = {}) =>
  entreeEnregistrerDevis.parse({ ...brut, ...extra });

async function erreur(p: Promise<unknown>): Promise<ErreurMetier> {
  try {
    await p;
  } catch (e) {
    if (e instanceof ErreurMetier) return e;
    throw e;
  }
  throw new Error('Aucune erreur levée');
}

beforeAll(() => {
  db = getFirestore(appAdmin());
});

beforeEach(async () => {
  await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJET_EMULATEUR}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  const m = (role: string) => ({ role, statut: 'actif' });
  await Promise.all([
    db.doc(chemins.membre('a1', 'p1')).set(m('proprietaire')),
    db.doc(chemins.membre('a1', 'c1')).set(m('collaborateur')),
    db.doc(chemins.membre('a1', 'x1')).set(m('comptable')),
  ]);
  await enregistrerParametresFacturation(s(), proprio, PARAMS);
});

async function devisAccepte() {
  const { devisId } = await enregistrerDevis(s(), proprio, entree());
  await envoyerDevis(s(), proprio, devisId);
  await changerStatutDevis(s(), proprio, { devisId, statut: 'accepte' });
  return devisId;
}

describe('devis', () => {
  it('numéro D-aaaa-nnnn, totaux et marge recalculés, description assainie', async () => {
    const r1 = await enregistrerDevis(s(), collab, entree());
    const r2 = await enregistrerDevis(s(), collab, entree());
    expect([r1.numero, r2.numero]).toEqual(['D-2026-0001', 'D-2026-0002']);
    const d = (await db.doc(chemins.unDevis('a1', r1.devisId)).get()).data()!;
    expect(d.totaux).toMatchObject({
      htCentimes: 162600,
      tva: { '10': 16260 },
      ttcCentimes: 178860,
    });
    expect(d.margeHtCentimes).toBe(162600 - 36000);
    expect(d.descriptionHtml).toBe('<b>Dépose</b> &lt;script&gt;alert(1)&lt;/script&gt;');
    expect(d.mentionsOk).toBe(true);
  });

  it('un comptable ne crée pas de devis', async () => {
    expect((await erreur(enregistrerDevis(s(), compta, entree()))).code).toBe('PERMISSION_REFUSEE');
  });

  it('DEV-01 : sans décennale, l’envoi est refusé côté serveur avec la liste', async () => {
    const { devisId } = await enregistrerDevis(s(), proprio, entree());
    await enregistrerParametresFacturation(s(), proprio, {
      ...PARAMS,
      assuranceDecennale: undefined,
    });
    const e = await erreur(envoyerDevis(s(), proprio, devisId));
    expect(e.code).toBe('PRECONDITION');
    expect(e.message).toContain('Assurance décennale');
    expect((await db.doc(chemins.unDevis('a1', devisId)).get()).get('statut')).toBe('brouillon');
  });

  it('DEV-02 : client professionnel sans SIREN valide → envoi refusé', async () => {
    const { devisId, mentionsManquantes } = await enregistrerDevis(
      s(),
      proprio,
      entree({ typeClient: 'pro', sirenClient: '1234' }),
    );
    expect(mentionsManquantes).toEqual(['siren_client']);
    expect((await erreur(envoyerDevis(s(), proprio, devisId))).message).toContain(
      'SIREN du client',
    );
  });

  it('envoyé : figé, PDF enregistré ; transitions contrôlées', async () => {
    const { devisId } = await enregistrerDevis(s(), proprio, entree());
    await envoyerDevis(
      {
        ...s(),
        apresEnvoi: async () => ({
          pdfPath: 'artisans/a1/devis/D-2026-0001.pdf',
          hashPdf: 'a'.repeat(64),
        }),
      },
      proprio,
      devisId,
    );
    const d = (await db.doc(chemins.unDevis('a1', devisId)).get()).data()!;
    expect(d).toMatchObject({ statut: 'envoye', pdfPath: 'artisans/a1/devis/D-2026-0001.pdf' });
    expect((await erreur(enregistrerDevis(s(), proprio, entree({ devisId })))).code).toBe(
      'CONFLIT',
    );
    expect((await erreur(envoyerDevis(s(), proprio, devisId))).code).toBe('CONFLIT');
    await changerStatutDevis(s(), proprio, { devisId, statut: 'refuse' });
    expect(
      (await erreur(changerStatutDevis(s(), proprio, { devisId, statut: 'accepte' }))).code,
    ).toBe('CONFLIT');
  });
});

describe('factures', () => {
  it('DEV-07 : facture depuis un devis accepté ; mentions de la réforme ; échéance', async () => {
    const devisId = await devisAccepte();
    const r = await facturerDevis(s(), proprio, {
      devisId,
      type: 'facture',
      cleIdempotence: 'cle-0001',
    });
    expect(r.numero).toBe('F-2026-0001');
    const f = (await db.doc(chemins.factureClient('a1', r.factureId)).get()).data()!;
    expect(f).toMatchObject({
      statut: 'emise',
      type: 'facture',
      devisNumero: 'D-2026-0001',
      lieuExecution: '3 rue des Lilas, 33700 Mérignac',
      resteCentimes: 178860,
      penalites: { indemnite: 4000 },
    });
    expect(f.echeanceLe.toMillis()).toBe(T + 30 * 86_400_000);
    // Double clic : même facture, même numéro.
    expect(
      await facturerDevis(s(), proprio, { devisId, type: 'facture', cleIdempotence: 'cle-0001' }),
    ).toEqual(r);
    expect(
      (
        await erreur(
          facturerDevis(s(), proprio, { devisId, type: 'facture', cleIdempotence: 'cle-0002' }),
        )
      ).code,
    ).toBe('CONFLIT');
  });

  it('un collaborateur ne facture pas ; un devis non accepté non plus', async () => {
    const { devisId } = await enregistrerDevis(s(), proprio, entree());
    expect(
      (
        await erreur(
          facturerDevis(s(), collab, { devisId, type: 'facture', cleIdempotence: 'cle-0001' }),
        )
      ).code,
    ).toBe('PERMISSION_REFUSEE');
    expect(
      (
        await erreur(
          facturerDevis(s(), proprio, { devisId, type: 'facture', cleIdempotence: 'cle-0001' }),
        )
      ).code,
    ).toBe('PRECONDITION');
  });

  it('acompte puis solde : l’acompte est déduit du reste à payer', async () => {
    const { devisId } = await enregistrerDevis(s(), proprio, entree());
    await envoyerDevis(s(), proprio, devisId);
    const a = await facturerDevis(s(), proprio, {
      devisId,
      type: 'acompte',
      cleIdempotence: 'acompte-1',
    });
    const fa = (await db.doc(chemins.factureClient('a1', a.factureId)).get()).data()!;
    expect(fa.totaux.htCentimes).toBe(Math.round(162600 * 0.3));
    await changerStatutDevis(s(), proprio, { devisId, statut: 'accepte' });
    const solde = await facturerDevis(s(), proprio, {
      devisId,
      type: 'facture',
      cleIdempotence: 'solde-1',
    });
    const f = (await db.doc(chemins.factureClient('a1', solde.factureId)).get()).data()!;
    expect(f.acomptesDeduits).toEqual([
      { factureId: a.factureId, numero: 'F-2026-0001', ttcCentimes: fa.totaux.ttcCentimes },
    ]);
    expect(f.resteCentimes).toBe(178860 - fa.totaux.ttcCentimes);
    expect(solde.numero).toBe('F-2026-0002');
  });

  it('paiements partiels puis complet ; trop-perçu refusé', async () => {
    const devisId = await devisAccepte();
    const { factureId } = await facturerDevis(s(), proprio, {
      devisId,
      type: 'facture',
      cleIdempotence: 'cle-0001',
    });
    expect(
      await enregistrerPaiement(s(), compta.uid ? proprio : proprio, {
        factureId,
        montantCentimes: 50000,
        moyen: 'virement',
        le: '2026-10-20',
      }),
    ).toEqual({ resteCentimes: 128860, statut: 'partiellement_payee' });
    expect(
      (
        await erreur(
          enregistrerPaiement(s(), proprio, {
            factureId,
            montantCentimes: 200000,
            moyen: 'cheque',
            le: '2026-10-21',
          }),
        )
      ).code,
    ).toBe('ENTREE_INVALIDE');
    expect(
      await enregistrerPaiement(s(), proprio, {
        factureId,
        montantCentimes: 128860,
        moyen: 'cheque',
        le: '2026-10-21',
      }),
    ).toEqual({ resteCentimes: 0, statut: 'payee' });
  });

  it('avoir : nouveau numéro de la suite, facture d’origine intacte et liée', async () => {
    const devisId = await devisAccepte();
    const f = await facturerDevis(s(), proprio, {
      devisId,
      type: 'facture',
      cleIdempotence: 'cle-0001',
    });
    const av = await creerAvoir(s(), proprio, {
      factureId: f.factureId,
      motif: 'Erreur de quantité',
      cleIdempotence: 'avoir-1',
    });
    expect(av.numero).toBe('F-2026-0002');
    const o = (await db.doc(chemins.factureClient('a1', f.factureId)).get()).data()!;
    expect(o).toMatchObject({ avoirId: av.factureId, numero: 'F-2026-0001', statut: 'emise' });
    expect(
      (
        await erreur(
          creerAvoir(s(), proprio, {
            factureId: f.factureId,
            motif: 'Encore',
            cleIdempotence: 'avoir-2',
          }),
        )
      ).code,
    ).toBe('CONFLIT');
  });

  it('DEV-06 : 100 factures créées en même temps, numéros 1 à 100 sans trou ni doublon', async () => {
    const ids: string[] = [];
    for (let i = 0; i < 100; i++) ids.push(await devisAccepte());
    const r = await Promise.all(
      ids.map((devisId, i) =>
        facturerDevis(s(), proprio, {
          devisId,
          type: 'facture',
          cleIdempotence: `concurrence-${i}`,
        }),
      ),
    );
    const n = r.map((x) => Number(x.numero.slice(-4))).sort((a, b) => a - b);
    expect(n).toEqual(Array.from({ length: 100 }, (_, i) => i + 1));
    expect((await db.doc(chemins.compteurDocuments('a1', 'factures')).get()).get('dernier')).toBe(
      100,
    );
  }, 300_000);
});
