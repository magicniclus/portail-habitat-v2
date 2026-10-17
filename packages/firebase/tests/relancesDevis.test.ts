import { ErreurMetier } from '@ph/core/erreurs';
import { entreeEnregistrerDevis } from '@ph/core/schemas';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { chemins } from '../src/chemins';
import type { Notification } from '../src/serveur/comptes/services';
import {
  changerStatutDevis,
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
      donnees: { numero: 'D-2026-0001', envoye: '14 octobre 2026' },
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
