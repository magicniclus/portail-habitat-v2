import { ErreurMetier } from '@ph/core/erreurs';
import {
  entreeBrouillonFacture,
  entreeCreerFacture,
  entreeEnregistrerDevis,
} from '@ph/core/schemas';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { chemins } from '../src/chemins';
import {
  changerRegimeTva,
  changerStatutDevis,
  dupliquerFacture,
  enregistrerBrouillonFacture,
  envoyerFactureEmail,
  supprimerFacture,
  dupliquerDevis,
  envoyerDevisAuClient,
  relancerDevis,
  supprimerDevis,
  creerAvoir,
  enregistrerDevis,
  enregistrerPaiement,
  enregistrerParametresFacturation,
  envoyerDevis,
  creerFacture,
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

async function devisAccepte(extra: Record<string, unknown> = {}) {
  const { devisId } = await enregistrerDevis(s(), proprio, entree(extra));
  await envoyerDevis(s(), proprio, devisId);
  await changerStatutDevis(s(), proprio, { devisId, statut: 'accepte' });
  return devisId;
}

describe('devis', () => {
  it('éditeur A4 : options et lignes de texte enregistrées, hors totaux', async () => {
    const { devisId } = await enregistrerDevis(
      s(),
      proprio,
      entree({
        lignes: [
          {
            type: 'texte',
            designation: 'Salle de bain',
            quantite: 0,
            unite: '',
            puHtCentimes: 0,
            tva: 20,
          },
          ...brut.lignes.map((l) => ({ ...l, nature: 'fourniture' })),
        ],
        modeSaisie: 'complet',
        intitule: 'Proposition commerciale',
        adresseChantier: '4 allée des Pins, 33600 Pessac',
        tvaIntraClient: 'FR12552100554',
        conditionsAcceptation: 'Devis valable après signature.',
        champSignature: true,
        champLibre: { titre: 'Garantie', texte: 'Pièces garanties 2 ans.' },
        client: { ...brut.client, codePostal: '33000', ville: 'Bordeaux', pays: 'France' },
      }),
    );
    const d = (await db.doc(chemins.unDevis('a1', devisId)).get()).data()!;
    expect(d.lignes[0]).toMatchObject({ type: 'texte', designation: 'Salle de bain' });
    expect(d.lignes[1].nature).toBe('fourniture');
    expect(d.totaux.tva['20']).toBeUndefined();
    expect(d).toMatchObject({
      intitule: 'Proposition commerciale',
      adresseChantier: '4 allée des Pins, 33600 Pessac',
      champSignature: true,
      champLibre: { titre: 'Garantie', texte: 'Pièces garanties 2 ans.' },
      client: { ville: 'Bordeaux', pays: 'France' },
      mentionsOk: true,
    });
  });

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

describe('actions sur un devis (liste)', () => {
  it('dupliquer un devis envoyé : nouveau brouillon, nouveau numéro, contenu repris, jamais le statut', async () => {
    const { devisId } = await enregistrerDevis(s(), proprio, entree());
    await envoyerDevis(s(), proprio, devisId);
    const { devisId: copie } = await dupliquerDevis(s(), proprio, { devisId });
    const lire = async (id: string) => (await db.doc(chemins.unDevis('a1', id)).get()).data()!;
    const [a, b] = [await lire(devisId), await lire(copie)];
    expect(b.statut).toBe('brouillon');
    expect(b.numero).not.toBe(a.numero);
    expect(b.objet).toBe(a.objet);
    expect(b.lignes).toEqual(a.lignes);
    expect(b.totaux).toEqual(a.totaux);
    expect(b).not.toHaveProperty('envoiLe');
    expect(b).not.toHaveProperty('pdfPath');
  });

  it('supprimer : brouillon seulement ; un devis envoyé s’archive', async () => {
    const { devisId } = await enregistrerDevis(s(), proprio, entree());
    const { devisId: envoye } = await enregistrerDevis(s(), proprio, entree());
    await envoyerDevis(s(), proprio, envoye);
    await supprimerDevis(s(), proprio, { devisId });
    expect((await db.doc(chemins.unDevis('a1', devisId)).get()).exists).toBe(false);
    expect((await erreur(supprimerDevis(s(), proprio, { devisId: envoye }))).code).toBe('CONFLIT');
    expect((await erreur(supprimerDevis(s(), compta, { devisId: envoye }))).code).toBe(
      'PERMISSION_REFUSEE',
    );
  });

  it('relancer à la main : devis envoyé avec email, une fois par jour au plus', async () => {
    const envois: unknown[] = [];
    const sr = () => ({ ...s(), notifier: async (n: unknown) => void envois.push(n) });
    const { devisId } = await enregistrerDevis(s(), proprio, entree());
    expect((await erreur(relancerDevis(sr(), proprio, { devisId }))).code).toBe('PRECONDITION');
    await envoyerDevis(s(), proprio, devisId);
    await relancerDevis(sr(), proprio, { devisId });
    expect(envois).toHaveLength(1);
    expect(envois[0]).toMatchObject({
      modele: 'relance-devis',
      destinataire: { email: 'claire@test.local' },
    });
    expect((await erreur(relancerDevis(sr(), proprio, { devisId }))).code).toBe('PRECONDITION');
  });
});

describe('« Valider » puis « Envoyer au client »', () => {
  it('valider : mentions vérifiées, devis figé, PDF, aucun email ; envoyer ensuite au client', async () => {
    const pdfs: string[] = [];
    const emails: string[] = [];
    const sv = () => ({
      ...s(),
      apresEnvoi: async (_a: string, id: string) => {
        pdfs.push(id);
        return { pdfPath: `p/${id}.pdf`, hashPdf: 'h' };
      },
      envoyerEmail: async (_a: string, id: string) => {
        emails.push(id);
        return { jetonHash: 'j' };
      },
    });
    const { devisId } = await enregistrerDevis(
      s(),
      proprio,
      entree({ client: { ...brut.client, email: undefined } }),
    );
    await envoyerDevis(sv(), proprio, devisId, 'valider');
    let d = (await db.doc(chemins.unDevis('a1', devisId)).get()).data()!;
    expect(d).toMatchObject({ statut: 'envoye', pdfPath: `p/${devisId}.pdf` });
    expect(d.valideLe).toBeDefined();
    expect(d).not.toHaveProperty('envoiLe');
    expect(emails).toEqual([]);
    expect((await erreur(envoyerDevisAuClient(sv(), proprio, { devisId }))).code).toBe(
      'PRECONDITION',
    );
    await db.doc(chemins.unDevis('a1', devisId)).update({ 'client.email': 'claire@test.local' });
    await envoyerDevisAuClient(sv(), proprio, { devisId });
    d = (await db.doc(chemins.unDevis('a1', devisId)).get()).data()!;
    expect(emails).toEqual([devisId]);
    expect(d.envoiLe).toBeDefined();
    expect(d.jetonHash).toBe('j');
    expect(pdfs).toEqual([devisId]);
  });

  it('un brouillon ne s’envoie pas par le menu : il se valide d’abord', async () => {
    const { devisId } = await enregistrerDevis(s(), proprio, entree());
    const sv = { ...s(), envoyerEmail: async () => ({ jetonHash: 'j' }) };
    expect((await erreur(envoyerDevisAuClient(sv, proprio, { devisId }))).code).toBe(
      'PRECONDITION',
    );
  });
});

describe('adresse de livraison en cases', () => {
  it('enregistrée en cases et imprimée en une ligne calculée par le serveur', async () => {
    const livraison = {
      attention: 'M. Durand',
      adresse: '5 rue Neuve',
      codePostal: '33000',
      ville: 'Bordeaux',
    };
    const { devisId } = await enregistrerDevis(
      s(),
      proprio,
      entree({ livraison, adresseChantier: 'ignorée' }),
    );
    const d = (await db.doc(chemins.unDevis('a1', devisId)).get()).data()!;
    expect(d.livraison).toEqual(livraison);
    expect(d.adresseChantier).toBe('À l’attention de M. Durand, 5 rue Neuve, 33000 Bordeaux');
  });
});

describe('régime de TVA choisi sur la feuille', () => {
  it('« Je ne suis pas soumis à la TVA » : enregistré dans les paramètres, le reste intact', async () => {
    await changerRegimeTva(s(), proprio, { franchiseTva: true });
    const p = (await db.doc(chemins.parametresFacturation('a1')).get()).data()!;
    expect(p.franchiseTva).toBe(true);
    expect(p.raisonSociale).toBe(PARAMS.raisonSociale);
    const { devisId } = await enregistrerDevis(s(), proprio, entree());
    const d = (await db.doc(chemins.unDevis('a1', devisId)).get()).data()!;
    expect(d.totaux.ttcCentimes).toBe(d.totaux.htCentimes);
  });
  it('paramètres jamais saisis : refusé (rien d’écrit) ; collaborateur : refusé', async () => {
    await db.doc(chemins.parametresFacturation('a1')).delete();
    expect((await erreur(changerRegimeTva(s(), proprio, { franchiseTva: true }))).code).toBe(
      'PRECONDITION',
    );
    expect((await db.doc(chemins.parametresFacturation('a1')).get()).exists).toBe(false);
    expect((await erreur(changerRegimeTva(s(), collab, { franchiseTva: true }))).code).toBe(
      'PERMISSION_REFUSEE',
    );
  });
});

describe('factures', () => {
  const libre = (extra: Record<string, unknown> = {}) =>
    entreeCreerFacture.parse({
      client: brut.client,
      typeClient: 'particulier',
      objet: 'Dépannage chauffe-eau',
      lignes: [
        {
          type: 'texte',
          designation: 'Intervention',
          quantite: 0,
          unite: '',
          puHtCentimes: 0,
          tva: 20,
        },
        {
          designation: 'Remplacement groupe de sécurité',
          quantite: 1,
          unite: 'u',
          puHtCentimes: 12000,
          tva: 10,
        },
      ],
      remisePct: 0,
      datePrestationLe: '2026-09-28',
      cleIdempotence: 'libre-0001',
      ...extra,
    });

  it('« Nouvelle facture » sans devis : émise, numérotée, totaux recalculés ; double clic = même facture', async () => {
    const r = await creerFacture(s(), proprio, libre());
    expect(r.numero).toBe('F-2026-0001');
    const f = (await db.doc(chemins.factureClient('a1', r.factureId)).get()).data()!;
    expect(f).toMatchObject({
      statut: 'emise',
      type: 'facture',
      objet: 'Dépannage chauffe-eau',
      totaux: { htCentimes: 12000, ttcCentimes: 13200 },
      resteCentimes: 13200,
      lieuExecution: '3 rue des Lilas, 33700 Mérignac',
    });
    expect(f).not.toHaveProperty('devisId');
    expect(await creerFacture(s(), proprio, libre())).toEqual(r);
    expect(
      (await erreur(creerFacture(s(), collab, libre({ cleIdempotence: 'libre-0002' })))).code,
    ).toBe('PERMISSION_REFUSEE');
  });

  it('brouillon de facture : sans numéro, modifiable, puis émis avec le premier numéro libre', async () => {
    const { cleIdempotence: _c, ...saisie } = libre();
    const { factureId } = await enregistrerBrouillonFacture(
      s(),
      proprio,
      entreeBrouillonFacture.parse({ ...saisie, datePrestationLe: undefined }),
    );
    let f = (await db.doc(chemins.factureClient('a1', factureId)).get()).data()!;
    expect(f).toMatchObject({ statut: 'brouillon', type: 'facture', resteCentimes: 13200 });
    expect(f).not.toHaveProperty('numero');
    await enregistrerBrouillonFacture(
      s(),
      proprio,
      entreeBrouillonFacture.parse({ ...saisie, factureId, objet: 'Dépannage modifié' }),
    );
    const r = await creerFacture(s(), proprio, libre({ factureId, objet: 'Dépannage modifié' }));
    expect(r).toEqual({ factureId, numero: 'F-2026-0001' });
    f = (await db.doc(chemins.factureClient('a1', factureId)).get()).data()!;
    expect(f).toMatchObject({ statut: 'emise', numero: 'F-2026-0001', objet: 'Dépannage modifié' });
    expect(
      (
        await erreur(
          enregistrerBrouillonFacture(
            s(),
            proprio,
            entreeBrouillonFacture.parse({ ...saisie, factureId }),
          ),
        )
      ).code,
    ).toBe('CONFLIT');
  });

  it('supprimer : brouillon seulement ; une facture émise ne se supprime jamais', async () => {
    const { cleIdempotence: _c, ...saisie } = libre();
    const { factureId } = await enregistrerBrouillonFacture(
      s(),
      proprio,
      entreeBrouillonFacture.parse(saisie),
    );
    await supprimerFacture(s(), proprio, { factureId });
    expect((await db.doc(chemins.factureClient('a1', factureId)).get()).exists).toBe(false);
    const emise = await creerFacture(s(), proprio, libre());
    expect(
      (await erreur(supprimerFacture(s(), proprio, { factureId: emise.factureId }))).code,
    ).toBe('CONFLIT');
  });

  it('dupliquer une facture émise : brouillon sans numéro, mêmes lignes ; un avoir ne se duplique pas', async () => {
    const emise = await creerFacture(s(), proprio, libre());
    const { factureId } = await dupliquerFacture(s(), proprio, { factureId: emise.factureId });
    const [a, b] = [
      (await db.doc(chemins.factureClient('a1', emise.factureId)).get()).data()!,
      (await db.doc(chemins.factureClient('a1', factureId)).get()).data()!,
    ];
    expect(b).toMatchObject({ statut: 'brouillon', objet: a.objet, lignes: a.lignes });
    expect(b).not.toHaveProperty('numero');
    const avoir = await creerAvoir(s(), proprio, {
      factureId: emise.factureId,
      motif: 'Erreur de prix',
      cleIdempotence: 'avoir-dup-1',
    });
    expect(
      (await erreur(dupliquerFacture(s(), proprio, { factureId: avoir.factureId }))).code,
    ).toBe('PRECONDITION');
  });

  it('envoyer par email : PDF prêt et email du client ; jamais un brouillon', async () => {
    const envois: { modele: string; secrets?: { lien?: string } }[] = [];
    const sr = () => ({
      ...s(),
      jeton: () => 'jeton-fixe-0123456789abcdef',
      notifier: async (n: (typeof envois)[number]) => void envois.push(n),
    });
    const emise = await creerFacture(s(), proprio, libre());
    expect((await erreur(envoyerFactureEmail(sr(), proprio, emise))).code).toBe('PRECONDITION');
    await db.doc(chemins.factureClient('a1', emise.factureId)).update({ pdfPath: 'x.pdf' });
    await envoyerFactureEmail(sr(), proprio, emise);
    expect(envois[0]).toMatchObject({ modele: 'facture-envoi' });
    expect(envois[0]!.secrets!.lien).toMatch(/^\/api\/facture-client\/a1\./);
    const f = (await db.doc(chemins.factureClient('a1', emise.factureId)).get()).data()!;
    expect(f.envoyeeLe).toBeDefined();
    const { cleIdempotence: _c, ...saisie } = libre();
    const b = await enregistrerBrouillonFacture(s(), proprio, entreeBrouillonFacture.parse(saisie));
    expect((await erreur(envoyerFactureEmail(sr(), proprio, b))).code).toBe('PRECONDITION');
  });

  it('« Nouvelle facture » : mention manquante (aucune ligne chiffrée) → refus, aucun numéro consommé', async () => {
    const seulementTexte = libre({ lignes: [libre().lignes[0]], cleIdempotence: 'libre-0003' });
    expect((await erreur(creerFacture(s(), proprio, seulementTexte))).code).toBe('PRECONDITION');
    expect((await creerFacture(s(), proprio, libre({ cleIdempotence: 'libre-0004' }))).numero).toBe(
      'F-2026-0001',
    );
  });

  it('acompte : les lignes de texte ne créent pas de ligne d’acompte', async () => {
    const devisId = await devisAccepte({
      lignes: [
        { type: 'texte', designation: 'Titre', quantite: 0, unite: '', puHtCentimes: 0, tva: 20 },
        ...brut.lignes,
      ],
    });
    const r = await facturerDevis(s(), proprio, {
      devisId,
      type: 'acompte',
      cleIdempotence: 'acompte-txt',
    });
    const f = (await db.doc(chemins.factureClient('a1', r.factureId)).get()).data()!;
    expect(f.lignes.every((l: { puHtCentimes: number }) => l.puHtCentimes > 0)).toBe(true);
  });

  it('éditeur A4 : la facture reprend l’adresse du chantier et la présentation du devis', async () => {
    const devisId = await devisAccepte({
      adresseChantier: '4 allée des Pins, 33600 Pessac',
      modeSaisie: 'rapide',
      champLibre: { titre: 'Garantie', texte: '2 ans' },
    });
    const r = await facturerDevis(s(), proprio, {
      devisId,
      type: 'facture',
      cleIdempotence: 'cle-a4-01',
    });
    const f = (await db.doc(chemins.factureClient('a1', r.factureId)).get()).data()!;
    expect(f).toMatchObject({
      lieuExecution: '4 allée des Pins, 33600 Pessac',
      modeSaisie: 'rapide',
      champLibre: { titre: 'Garantie', texte: '2 ans' },
    });
    expect(f).not.toHaveProperty('tvaIntraClient');
  });

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
    // Un devis accepté par le service, recopié 99 fois : seule la facturation est concurrente ici.
    const modele = await devisAccepte();
    const donnees = (await db.doc(chemins.unDevis('a1', modele)).get()).data()!;
    const lot = db.batch();
    const ids = [modele];
    for (let i = 1; i < 100; i++) {
      const id = `concurrent-${i}`;
      lot.set(db.doc(chemins.unDevis('a1', id)), { ...donnees, numero: `D-2026-${1000 + i}` });
      ids.push(id);
    }
    await lot.commit();
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
    // Émulateur : les 100 transactions se disputent un seul compteur (verrous pessimistes,
    // ~150 s sur un poste, davantage sur les machines de CI).
  }, 900_000);
});
