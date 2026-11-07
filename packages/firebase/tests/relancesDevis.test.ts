import { ErreurMetier } from '@ph/core/erreurs';
import { entreeEnregistrerDevis } from '@ph/core/schemas';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, bucketFichiers, PROJET_EMULATEUR } from '../src/admin';
import { chemins } from '../src/chemins';
import { empreinteJeton, type Notification } from '../src/serveur/comptes/services';
import {
  changerStatutDevis,
  dechiffrer,
  enregistrerImageFacturation,
  lireParametresFacturation,
  enregistrerDevis,
  enregistrerPaiement,
  enregistrerParametresFacturation,
  envoyerDevis,
  facturerDevis,
  gererModele,
  gererPrestation,
  lireBibliotheque,
  lireDevisDepuisDemande,
  marquerDevisExpires,
  relancerFacture,
  signerDevis,
  traiterDevisEnvoyes,
  traiterFacturesEcheances,
} from '../src/serveur/devis';

// Lot 11b : relances J−3, J+1, J+15 des factures, « impayée », expiration et relance J+7 des devis.
let db: Firestore;
const J = 86_400_000;
const T = Date.UTC(2026, 9, 14, 7);
let horloge = T;
let envois: Notification[] = [];
const s = () => ({
  db,
  horloge: () => horloge,
  jeton: () => `jeton-de-test-${horloge}-0123456789`,
  notifier: async (n: Notification) => {
    envois.push(n);
  },
});
const proprio = { artisanId: 'a1', uid: 'p1' };
const compta = { artisanId: 'a1', uid: 'x1' };

const PARAMS = {
  raisonSociale: 'Bertrand Rénovation',
  adresseSiege: '14 rue des Faures, 33800 Bordeaux',
  siret: '81234567800021',
  franchiseTva: false,
  tvaSurDebits: false,
  assuranceDecennale: { assureur: 'MAAF', contrat: '0045821', zone: 'France' },
  mediateur: { nom: 'CM2C', adresse: 'Paris' },
  delaiPaiementJours: 30,
  acompteDefautPct: 30,
  validiteDevisJours: 30,
  tauxPenalitesAnnuel: 12.15,
  tvaDefaut: 10 as const,
};
const entree = () =>
  entreeEnregistrerDevis.parse({
    client: { nom: 'Claire Martin', email: 'claire@test.local', adresse: '3 rue des Lilas' },
    typeClient: 'particulier',
    horsEtablissement: false,
    objet: 'Salle de bain',
    descriptionHtml: '',
    lignes: [{ designation: 'Pose', quantite: 1, unite: 'u', puHtCentimes: 100000, tva: 10 }],
    remisePct: 0,
    acomptePct: 0,
    validiteLe: '2026-11-13',
    debutTravauxLe: '2026-11-16',
    dureeEstimee: '5 jours',
    fraisDeplacement: 'Inclus',
    devisGratuit: true,
    notes: '',
    signatureElectronique: false,
    tampon: false,
  });

async function erreur(p: Promise<unknown>): Promise<ErreurMetier> {
  try {
    await p;
  } catch (e) {
    if (e instanceof ErreurMetier) return e;
    throw e;
  }
  throw new Error('Aucune erreur levée');
}

async function devisEnvoye() {
  const { devisId } = await enregistrerDevis(s(), proprio, entree());
  await envoyerDevis(s(), proprio, devisId);
  return devisId;
}

async function factureEmise() {
  const devisId = await devisEnvoye();
  await changerStatutDevis(s(), proprio, { devisId, statut: 'accepte' });
  const { factureId } = await facturerDevis(s(), proprio, {
    devisId,
    type: 'facture',
    cleIdempotence: 'cle-relance-1',
  });
  const ref = db.doc(chemins.factureClient('a1', factureId));
  await ref.update({ pdfPath: 'artisans/a1/factures/F.pdf' });
  return ref;
}

beforeAll(() => {
  db = getFirestore(appAdmin());
});

beforeEach(async () => {
  await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJET_EMULATEUR}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  horloge = T;
  envois = [];
  await Promise.all([
    db.doc(chemins.membre('a1', 'p1')).set({ role: 'proprietaire', statut: 'actif' }),
    db.doc(chemins.membre('a1', 'x1')).set({ role: 'comptable', statut: 'actif' }),
  ]);
  await enregistrerParametresFacturation(s(), proprio, PARAMS);
});

describe('factures : relances automatiques', () => {
  it('J−3, J+1 (« impayée »), J+15 avec pénalités ; une seule fois chacune', async () => {
    const ref = await factureEmise();
    const echeance = T + 30 * J;

    horloge = echeance - 4 * J;
    expect(await traiterFacturesEcheances(s())).toEqual({ impayees: 0, relances: 0 });

    horloge = echeance - 3 * J;
    expect(await traiterFacturesEcheances(s())).toEqual({ impayees: 0, relances: 1 });
    expect(await traiterFacturesEcheances(s())).toEqual({ impayees: 0, relances: 0 });
    expect(envois[0]).toMatchObject({
      modele: 'facture-relance',
      destinataire: { email: 'claire@test.local' },
      variante: 'j-3',
      donnees: { entreprise: 'Bertrand Rénovation', echue: false, dernier: false },
    });
    expect(envois[0]!.secrets!.lien).toMatch(/^\/api\/facture-client\/a1\./);

    horloge = echeance + J;
    expect(await traiterFacturesEcheances(s())).toEqual({ impayees: 1, relances: 1 });
    expect((await ref.get()).get('statut')).toBe('impayee');

    horloge = echeance + 15 * J;
    await traiterFacturesEcheances(s());
    expect(envois.at(-1)).toMatchObject({
      variante: 'j+15',
      donnees: { echue: true, dernier: true, penalites: '12,15 %', pro: false },
    });
    expect(((await ref.get()).get('relances') as { type: string }[]).map((r) => r.type)).toEqual([
      'j-3',
      'j+1',
      'j+15',
    ]);
    // Le lien du dernier email est le seul valable.
    expect((await ref.get()).get('jetonHash')).toBeTypeOf('string');
  });

  it('une facture réglée n’est ni relancée ni « impayée »', async () => {
    const ref = await factureEmise();
    await enregistrerPaiement(s(), proprio, {
      factureId: ref.id,
      montantCentimes: (await ref.get()).get('resteCentimes') as number,
      moyen: 'virement',
      le: '2026-10-15',
    });
    horloge = T + 31 * J;
    expect(await traiterFacturesEcheances(s())).toEqual({ impayees: 0, relances: 0 });
    expect(envois).toHaveLength(0);
  });

  it('« Relancer » : une fois par jour, permission vérifiée', async () => {
    const ref = await factureEmise();
    expect((await erreur(relancerFacture(s(), compta, { factureId: ref.id }))).code).toBe(
      'PERMISSION_REFUSEE',
    );
    await relancerFacture(s(), proprio, { factureId: ref.id });
    expect(envois[0]).toMatchObject({ modele: 'facture-relance', donnees: { echue: false } });
    expect((await erreur(relancerFacture(s(), proprio, { factureId: ref.id }))).code).toBe(
      'PRECONDITION',
    );
    horloge = T + J;
    await relancerFacture(s(), proprio, { factureId: ref.id });
    expect(envois).toHaveLength(2);
  });
});

describe('devis envoyés', () => {
  it('relance du client à J+7 une seule fois, puis « expiré » après la validité', async () => {
    const devisId = await devisEnvoye();
    const ref = db.doc(chemins.unDevis('a1', devisId));
    horloge = T + 6 * J;
    expect(await traiterDevisEnvoyes(s())).toEqual({ expires: 0, relances: 0 });
    horloge = T + 7 * J;
    expect(await traiterDevisEnvoyes(s())).toEqual({ expires: 0, relances: 1 });
    expect(await traiterDevisEnvoyes(s())).toEqual({ expires: 0, relances: 0 });
    expect(envois[0]).toMatchObject({
      modele: 'relance-devis',
      destinataire: { email: 'claire@test.local' },
      donnees: { numero: (await ref.get()).get('numero'), envoye: '14 octobre 2026' },
    });
    horloge = Date.UTC(2026, 10, 14);
    expect(await traiterDevisEnvoyes(s())).toEqual({ expires: 1, relances: 0 });
    expect((await ref.get()).get('statut')).toBe('expire');
  });

  it('« Marquer expirés » : seuls les devis envoyés changent', async () => {
    const envoye = await devisEnvoye();
    const { devisId: brouillon } = await enregistrerDevis(s(), proprio, entree());
    expect(await marquerDevisExpires(s(), proprio, { ids: [envoye, brouillon] })).toEqual({
      faits: [envoye],
    });
    expect((await db.doc(chemins.unDevis('a1', brouillon)).get()).get('statut')).toBe('brouillon');
  });
});

describe('devis créé depuis « Mes demandes »', () => {
  const attribution = () => db.doc(chemins.attribution('dem1', 'a1'));
  beforeEach(async () => {
    await db.doc(chemins.demande('dem1')).set({
      prestationId: 'salle-de-bain',
      contact: {
        prenom: 'Claire',
        nom: 'Martin',
        email: 'claire@test.local',
        telephone: '+33612345678',
      },
      adresseChantier: { codePostal: '33700', ville: 'Mérignac' },
      precisions: 'Douche à l’italienne',
    });
    await attribution().set({ artisanId: 'a1', demandeId: 'dem1', statut: 'vue' });
  });

  it('pas de coordonnées ni de devis lié avant l’acceptation', async () => {
    expect(await lireDevisDepuisDemande(db, 'a1', 'dem1', () => 'Salle de bain')).toBeNull();
    expect(
      (await erreur(enregistrerDevis(s(), proprio, { ...entree(), demandeId: 'dem1' }))).code,
    ).toBe('PRECONDITION');
  });

  it('client repris, puis la mise en relation suit le devis : envoyé, accepté', async () => {
    await attribution().update({ statut: 'acceptee' });
    const m = await lireDevisDepuisDemande(db, 'a1', 'dem1', () => 'Salle de bain');
    expect(m).toMatchObject({
      client: { nom: 'Claire Martin', email: 'claire@test.local', adresse: '33700 Mérignac' },
      objet: 'Salle de bain',
      precisions: 'Douche à l’italienne',
    });
    const { devisId } = await enregistrerDevis(s(), proprio, { ...entree(), demandeId: 'dem1' });
    await envoyerDevis(s(), proprio, devisId);
    expect((await attribution().get()).get('statut')).toBe('devis_envoye');
    await changerStatutDevis(s(), proprio, { devisId, statut: 'accepte' });
    expect((await attribution().get()).get('statut')).toBe('devis_accepte');
  });

  it('devis refusé : la mise en relation passe « devis refusé »', async () => {
    await attribution().update({ statut: 'acceptee' });
    const { devisId } = await enregistrerDevis(s(), proprio, { ...entree(), demandeId: 'dem1' });
    await envoyerDevis(s(), proprio, devisId);
    await changerStatutDevis(s(), proprio, { devisId, statut: 'refuse' });
    expect((await attribution().get()).get('statut')).toBe('devis_refuse');
  });
});

describe('modèles de devis et bibliothèque de prestations', () => {
  it('prestation ajoutée puis supprimée ; un comptable ne touche à rien', async () => {
    const { id } = await gererPrestation(s(), proprio, {
      action: 'creer',
      designation: 'Faïence murale, fourniture et pose',
      unite: 'm²',
      puHtCentimes: 7800,
      tva: 10,
      coutHtCentimes: 4100,
    });
    expect((await lireBibliotheque(db, 'a1')).prestations).toEqual([
      expect.objectContaining({ id, unite: 'm²', puHtCentimes: 7800, coutHtCentimes: 4100 }),
    ]);
    expect((await erreur(gererPrestation(s(), compta, { action: 'supprimer', id }))).code).toBe(
      'PERMISSION_REFUSEE',
    );
    await gererPrestation(s(), proprio, { action: 'supprimer', id });
    expect((await lireBibliotheque(db, 'a1')).prestations).toHaveLength(0);
  });

  it('ligne type de texte (« Enregistrer comme ligne type ») : sans prix, relue avec son type', async () => {
    const { id } = await gererPrestation(s(), proprio, {
      action: 'creerTexte',
      designation: 'Préparation du chantier',
    });
    expect((await lireBibliotheque(db, 'a1')).prestations).toEqual([
      expect.objectContaining({ id, type: 'texte', puHtCentimes: 0 }),
    ]);
  });

  it('modèle créé depuis un devis, « Utilisé n fois » à chaque devis qui en part', async () => {
    const { devisId } = await enregistrerDevis(s(), proprio, entree());
    const { id } = await gererModele(s(), proprio, {
      action: 'depuisDevis',
      devisId,
      titre: 'Salle de bain',
    });
    await enregistrerDevis(s(), proprio, { ...entree(), modeleId: id });
    await enregistrerDevis(s(), proprio, { ...entree(), modeleId: id });
    const [m] = (await lireBibliotheque(db, 'a1')).modeles;
    expect(m).toMatchObject({ id, titre: 'Salle de bain', usage: 2, htCentimes: 100000 });
    expect(m!.lignes).toHaveLength(1);
  });
});

describe('signature en ligne du devis par le client', () => {
  const JETON = 'jeton-client-de-test-0123456789';
  async function devisSignable(signatureElectronique = true) {
    const { devisId } = await enregistrerDevis(s(), proprio, {
      ...entree(),
      signatureElectronique,
    });
    await envoyerDevis(s(), proprio, devisId);
    const ref = db.doc(chemins.unDevis('a1', devisId));
    await ref.update({ jetonHash: empreinteJeton(JETON), hashPdf: 'a'.repeat(64) });
    await db.doc(chemins.artisan('a1')).set({ proprietaireUid: 'p1' }, { merge: true });
    return { ref, lien: `a1.${devisId}.${JETON}` };
  }

  it('lien valide : accepté, signature enregistrée, entreprise prévenue ; pas deux fois', async () => {
    const { ref, lien } = await devisSignable();
    await signerDevis(s(), { lien, nom: 'Claire Martin', ip: '203.0.113.7' });
    const d = (await ref.get()).data()!;
    expect(d.statut).toBe('accepte');
    expect(d.signature).toMatchObject({
      nom: 'Claire Martin',
      ip: '203.0.113.7',
      hashPdf: 'a'.repeat(64),
    });
    expect(envois.at(-1)).toMatchObject({
      modele: 'devis-accepte',
      destinataire: { uid: 'p1', artisanId: 'a1' },
      donnees: { client: 'Claire Martin' },
    });
    expect((await erreur(signerDevis(s(), { lien, nom: 'X', ip: '' }))).message).toBe(
      'Ce devis a déjà été accepté.',
    );
  });

  it('mauvais jeton, signature en ligne désactivée ou devis expiré : refusé', async () => {
    const { lien } = await devisSignable();
    expect(
      (
        await erreur(
          signerDevis(s(), { lien: lien.replace(JETON, 'x'.repeat(30)), nom: 'X', ip: '' }),
        )
      ).code,
    ).toBe('INTROUVABLE');
    horloge = Date.UTC(2026, 10, 20);
    expect((await erreur(signerDevis(s(), { lien, nom: 'X', ip: '' }))).message).toMatch(
      /plus valable/,
    );
    horloge = T;
    const papier = await devisSignable(false);
    expect(
      (await erreur(signerDevis(s(), { lien: papier.lien, nom: 'X', ip: '' }))).message,
    ).toMatch(/sur papier/);
  });
});

describe('IBAN des paramètres de facturation', () => {
  const cleIban = Buffer.alloc(32, 7);
  const IBAN = 'FR76 3000 6000 0112 3456 7890 189';
  const ref = () => db.doc(chemins.parametresFacturation('a1'));

  it('chiffré, jamais en clair ni renvoyé ; gardé si absent, retiré si vide', async () => {
    await enregistrerParametresFacturation({ ...s(), cleIban }, proprio, { ...PARAMS, iban: IBAN });
    const d = (await ref().get()).data()!;
    expect(JSON.stringify(d)).not.toContain('30006000011234567890189');
    expect(d.ibanFin).toBe('0189');
    expect(dechiffrer(d.ibanChiffre as string, cleIban)).toBe('FR7630006000011234567890189');
    expect(dechiffrer(d.ibanChiffre as string, Buffer.alloc(32, 8))).toBeNull();
    expect(await lireParametresFacturation(db, 'a1')).not.toHaveProperty('ibanChiffre');

    await enregistrerParametresFacturation({ ...s(), cleIban }, proprio, PARAMS);
    expect((await ref().get()).get('ibanFin')).toBe('0189');
    await enregistrerParametresFacturation({ ...s(), cleIban }, proprio, { ...PARAMS, iban: '' });
    expect((await ref().get()).get('ibanChiffre')).toBeUndefined();
  });

  it('sans clé de chiffrement : IBAN refusé', async () => {
    expect(
      (await erreur(enregistrerParametresFacturation(s(), proprio, { ...PARAMS, iban: IBAN })))
        .code,
    ).toBe('PRECONDITION');
  });
});

describe('cachet de l’entreprise', () => {
  const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64',
  );
  const sb = () => ({ ...s(), bucket: bucketFichiers() });
  const ref = () => db.doc(chemins.parametresFacturation('a1'));

  it('enregistré, gardé quand les paramètres sont réenregistrés, puis retiré', async () => {
    await bucketFichiers()
      .file('artisans/a1/tampon/cachet.png')
      .save(PNG, { contentType: 'image/png', resumable: false });
    await enregistrerImageFacturation(sb(), proprio, {
      action: 'enregistrer',
      quoi: 'tampon',
      nomFichier: 'cachet.png',
    });
    expect((await ref().get()).get('tamponChemin')).toBe('artisans/a1/tampon/cachet.png');
    await enregistrerParametresFacturation(s(), proprio, PARAMS);
    expect((await ref().get()).get('tamponChemin')).toBe('artisans/a1/tampon/cachet.png');
    expect(
      (
        await erreur(
          enregistrerImageFacturation(sb(), compta, { action: 'retirer', quoi: 'tampon' }),
        )
      ).code,
    ).toBe('PERMISSION_REFUSEE');
    await enregistrerImageFacturation(sb(), proprio, { action: 'retirer', quoi: 'tampon' });
    expect((await ref().get()).get('tamponChemin')).toBeUndefined();
  });

  it('fichier absent : refusé', async () => {
    expect(
      (
        await erreur(
          enregistrerImageFacturation(sb(), proprio, {
            action: 'enregistrer',
            quoi: 'tampon',
            nomFichier: 'x.png',
          }),
        )
      ).code,
    ).toBe('INTROUVABLE');
  });
});

describe('logo propre aux devis et factures', () => {
  const ref = () => db.doc(chemins.parametresFacturation('a1'));

  it('enregistré dans le dossier du logo, gardé au réenregistrement, refusé si ce n’est pas une image', async () => {
    const sb = { ...s(), bucket: bucketFichiers() };
    await bucketFichiers()
      .file('artisans/a1/logo/devis-1.png')
      .save(Buffer.from('png'), { contentType: 'image/png', resumable: false });
    await bucketFichiers()
      .file('artisans/a1/logo/devis-2.pdf')
      .save(Buffer.from('pdf'), { contentType: 'application/pdf', resumable: false });
    await enregistrerImageFacturation(sb, proprio, {
      action: 'enregistrer',
      quoi: 'logo',
      nomFichier: 'devis-1.png',
    });
    await enregistrerParametresFacturation(s(), proprio, PARAMS);
    expect((await ref().get()).get('logoChemin')).toBe('artisans/a1/logo/devis-1.png');
    expect(
      (
        await erreur(
          enregistrerImageFacturation(sb, proprio, {
            action: 'enregistrer',
            quoi: 'logo',
            nomFichier: 'devis-2.pdf',
          }),
        )
      ).code,
    ).toBe('ENTREE_INVALIDE');
    await enregistrerImageFacturation(sb, proprio, { action: 'retirer', quoi: 'logo' });
    expect((await ref().get()).get('logoChemin')).toBeUndefined();
  });
});
