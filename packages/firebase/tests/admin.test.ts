import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { baremeDepuisSaisie, permissionsEffectives, saisieDepuisBareme } from '@ph/core/admin';
import { BAREME_DEFAUT } from '@ph/core/leads';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { chemins, collections } from '../src/chemins';
import {
  activerPrestationAdmin,
  activerSourceAdmin,
  changerFlagAdmin,
  afficherDonneePersonnelle,
  arreterAnnonceAdmin,
  ajouterArtisanDemandeAdmin,
  ajouterNoteAdmin,
  assignerTacheAdmin,
  crediterArtisanAdmin,
  deciderContestationAdmin,
  deciderLitigeAdmin,
  ecrireLitigeAdmin,
  creerSuperAdmin,
  deciderDocumentAdmin,
  fixerPrixAppelOffresAdmin,
  idTacheDocument,
  jetonImpersonation,
  lireAnnoncesActives,
  journalImportsAdmin,
  lireBaremesAdmin,
  lireAppelOffresAdmin,
  lireArtisanAdmin,
  lireDemandeAdmin,
  lireFinancesAdmin,
  lireFlagsAdmin,
  lirePrixPrestationAdmin,
  lireLitigeAdmin,
  lireTableauDeBordAdmin,
  listerAppelsOffresAdmin,
  listerDemandesAdmin,
  listerFileAdmin,
  listerLitigesAdmin,
  listerPrestationsAdmin,
  modifierPrixPrestationAdmin,
  listerSourcesAdmin,
  modererAvisAdmin,
  listerArtisansAdmin,
  listerAvisAdmin,
  listerContestationsAdmin,
  parametresAppelOffresAdmin,
  piecesDuMois,
  promoAppelOffresAdmin,
  publierAnnonceAdmin,
  publierBaremeAdmin,
  rejeterDemandeAdmin,
  relancerMatchingAdmin,
  sanctionnerArtisanAdmin,
  simulerBaremeAdmin,
  supprimerAvisAdmin,
  traiterTacheAdmin,
  verifierArtisanAdmin,
  verifierSessionAdmin,
} from '../src/serveur/admin';
import { contesterAppelOffres } from '../src/serveur/matching';

let db: Firestore;
let auth: Auth;

beforeAll(() => {
  db = getFirestore(appAdmin());
  auth = getAuth(appAdmin());
});

beforeEach(async () => {
  await Promise.all([
    fetch(
      `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJET_EMULATEUR}/databases/(default)/documents`,
      { method: 'DELETE' },
    ),
    fetch(
      `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/emulator/v1/projects/${PROJET_EMULATEUR}/accounts`,
      { method: 'DELETE' },
    ),
  ]);
});

describe('creerSuperAdmin (script admin:creer)', () => {
  it('crée le compte, le profil admin et le claim staff ; relançable', async () => {
    const s = { db, auth, horloge: () => Date.UTC(2026, 9, 2) };
    const r = await creerSuperAdmin(s, { email: 'Fondateur@Exemple.fr', nom: 'Nicolas C.' });
    expect(r.cree).toBe(true);
    expect(r.lienMotDePasse).toContain('oobCode');
    const a = (await db.doc(chemins.admin(r.uid)).get()).data()!;
    expect(a).toMatchObject({
      role: 'superadmin',
      actif: true,
      mfaObligatoire: true,
      email: 'fondateur@exemple.fr',
    });
    expect(a.permissionsEffectives).toContain('equipe.gerer');
    const claims = (await auth.getUser(r.uid)).customClaims as {
      staff: { r: string; s: string[] };
    };
    expect(claims.staff.r).toBe('superadmin');
    expect(claims.staff.s).toContain('fin');
    expect(
      (await creerSuperAdmin(s, { email: 'fondateur@exemple.fr', nom: 'Nicolas C.' })).cree,
    ).toBe(false);
  });
});

describe('verifierSessionAdmin (ADMIN §1)', () => {
  const T = Date.UTC(2026, 9, 2, 9);
  it('8 h au plus, 30 min d’inactivité, membre actif seulement ; activité notée', async () => {
    await db.doc(chemins.admin('a1')).set({
      nom: 'Anne',
      email: 'a@x.fr',
      role: 'lecture',
      actif: true,
      permissionsEffectives: ['artisans.lire'],
    });
    const v = (authentifieLe: number, maintenant: number, uid = 'a1') =>
      verifierSessionAdmin(db, { uid, authentifieLe, maintenant });
    expect(await v(T, T + 60_000)).toMatchObject({
      etat: 'ok',
      profil: { role: 'lecture', pii: false, permissions: ['artisans.lire'] },
    });
    expect(await v(T, T + 20 * 60_000)).toMatchObject({ etat: 'ok' });
    expect(await v(T, T + 55 * 60_000)).toEqual({ etat: 'inactivite' });
    expect(await v(T, T + 9 * 3_600_000)).toEqual({ etat: 'expiree' });
    expect(await v(T, T, 'inconnu')).toEqual({ etat: 'pas_admin' });
    await db.doc(chemins.admin('a1')).update({ actif: false });
    expect(await v(T, T + 60_000)).toEqual({ etat: 'pas_admin' });
  });
});

describe('données personnelles et impersonation (ADM-02, ADM-04)', () => {
  const s = () => ({ db, auth, horloge: () => Date.UTC(2026, 9, 2) });
  it('« Afficher » : liste fermée de champs, refus au rôle lecture, consultation journalisée', async () => {
    await db.doc(chemins.demande('d1')).set({ contact: { email: 'helene@test.local' } });
    expect(
      await afficherDonneePersonnelle(s(), {
        acteurUid: 'a1',
        pii: true,
        cible: 'demandes/d1',
        champ: 'contact.email',
      }),
    ).toBe('helene@test.local');
    const audit = await db.collection(collections.auditLog).get();
    expect(audit.docs.map((d) => [d.get('action'), d.get('cible')])).toEqual([
      ['pii.afficher', 'demandes/d1'],
    ]);
    await expect(
      afficherDonneePersonnelle(s(), {
        acteurUid: 'a1',
        pii: false,
        cible: 'demandes/d1',
        champ: 'contact.email',
      }),
    ).rejects.toMatchObject({ code: 'PERMISSION_REFUSEE' });
    await expect(
      afficherDonneePersonnelle(s(), {
        acteurUid: 'a1',
        pii: true,
        cible: 'demandes/d1',
        champ: 'estimation',
      }),
    ).rejects.toMatchObject({ code: 'ENTREE_INVALIDE' });
  });

  it('« Voir en tant que » : superadmin seulement, jamais un membre de l’équipe, journalisé', async () => {
    await db.doc(chemins.admin('sup')).set({ role: 'superadmin', actif: true });
    await db.doc(chemins.admin('mod')).set({ role: 'moderateur', actif: true });
    const jeton = await jetonImpersonation(s(), {
      acteurUid: 'sup',
      cibleUid: 'artisan1',
      motif: 'support',
    });
    expect(jeton.split('.')).toHaveLength(3);
    await expect(
      jetonImpersonation(s(), { acteurUid: 'mod', cibleUid: 'artisan1', motif: 'support' }),
    ).rejects.toMatchObject({ code: 'PERMISSION_REFUSEE' });
    await expect(
      jetonImpersonation(s(), { acteurUid: 'sup', cibleUid: 'mod', motif: 'support' }),
    ).rejects.toMatchObject({ code: 'PERMISSION_REFUSEE' });
    const audit = await db
      .collection(collections.auditLog)
      .where('action', '==', 'impersonation')
      .get();
    expect(audit.size).toBe(1);
  });
});

describe('artisans dans l’admin (ADMIN §2.3)', () => {
  const s = () => ({ db, horloge: () => Date.UTC(2026, 9, 2, 10) });
  beforeEach(async () => {
    await db.doc(chemins.artisan('a1')).set({
      nomCommercial: 'Bertrand Rénovation',
      siren: '812345678',
      metierPrincipal: 'plombier',
      adresseSiege: { ville: 'Bordeaux' },
      emailContact: 'contact@bertrand.fr',
      telephonePublic: '+33612345678',
      plan: 'premium',
      statut: 'actif',
      enLigne: true,
      verification: { statut: 'en_cours' },
    });
  });

  it('liste filtrée et fiche avec coordonnées masquées', async () => {
    expect((await listerArtisansAdmin(db, { filtre: 'a_verifier' })).map((l) => l.id)).toEqual([
      'a1',
    ]);
    expect(await listerArtisansAdmin(db, { filtre: 'suspendus' })).toEqual([]);
    expect(await listerArtisansAdmin(db, { filtre: 'tous', q: 'bordeaux' })).toHaveLength(1);
    const f = (await lireArtisanAdmin(db, 'a1'))!;
    expect(f).toMatchObject({ statut: 'a_verifier', emailMasque: 'c•••@b•••.fr' });
    expect(JSON.stringify(f)).not.toContain('contact@bertrand.fr');
  });

  it('suspendre puis lever : sanction, statut, audit avec avant/après et motif', async () => {
    await sanctionnerArtisanAdmin(s(), {
      acteurUid: 'adm',
      artisanId: 'a1',
      action: 'suspendre',
      motif: 'SIREN radié',
    });
    expect((await db.doc(chemins.artisan('a1')).get()).get('statut')).toBe('suspendu');
    await expect(
      sanctionnerArtisanAdmin(s(), {
        acteurUid: 'adm',
        artisanId: 'a1',
        action: 'suspendre',
        motif: 'encore',
      }),
    ).rejects.toMatchObject({ code: 'CONFLIT' });
    await sanctionnerArtisanAdmin(s(), {
      acteurUid: 'adm',
      artisanId: 'a1',
      action: 'lever',
      motif: 'Kbis à jour',
    });
    const f = (await lireArtisanAdmin(db, 'a1'))!;
    expect(f.sanctions).toEqual([expect.objectContaining({ type: 'suspension', levee: true })]);
    const audit = await db
      .collection(collections.auditLog)
      .where('action', '==', 'adminSanctionner')
      .get();
    expect(audit.docs.map((d) => [d.get('avant'), d.get('apres'), d.get('motif')])).toEqual(
      expect.arrayContaining([
        [{ statut: 'actif' }, { statut: 'suspendu' }, 'SIREN radié'],
        [{ statut: 'suspendu' }, { statut: 'actif' }, 'Kbis à jour'],
      ]),
    );
  });

  it('créditer : plafond de 5 sans permission illimitée ; vérifier', async () => {
    await expect(
      crediterArtisanAdmin(s(), {
        acteurUid: 'adm',
        illimite: false,
        artisanId: 'a1',
        credits: 6,
        motif: 'geste',
      }),
    ).rejects.toMatchObject({ code: 'PERMISSION_REFUSEE' });
    expect(
      await crediterArtisanAdmin(s(), {
        acteurUid: 'adm',
        illimite: false,
        artisanId: 'a1',
        credits: 3,
        motif: 'geste',
      }),
    ).toEqual({ soldeCredits: 3 });
    await verifierArtisanAdmin(s(), {
      acteurUid: 'adm',
      artisanId: 'a1',
      motif: 'Kbis et décennale vus',
    });
    expect((await db.doc(chemins.artisan('a1')).get()).get('verification.statut')).toBe('verifie');
  });
});

describe('file de travail et tableau de bord (ADMIN §2.1 et 2.2)', () => {
  const T = Date.UTC(2026, 9, 2, 12);
  const s = () => ({ db, horloge: () => T });
  const tache = (id: string, type: string, priorite: number, ilYaH: number, refs = {}) =>
    db
      .collection(collections.filesModeration)
      .doc(id)
      .set({
        type,
        priorite,
        statut: 'a_traiter',
        refs,
        permissionRequise: 'x',
        createdAt: Timestamp.fromMillis(T - ilYaH * 3_600_000),
      });

  it('file : types autorisés seulement, tri priorité puis ancienneté, SLA ; prendre et clore', async () => {
    await db.doc(chemins.artisan('a1')).set({ nomCommercial: 'Isolation Gironde' });
    await tache('t1', 'avis', 3, 30);
    await tache('t2', 'fraude_suspectee', 5, 1);
    await tache('t3', 'remboursement_carte_lead', 4, 2);
    await tache('t4', 'artisan_nouveau', 1, 1, { artisanId: 'a1' });
    const moderateur = permissionsEffectives({ role: 'moderateur' });
    const file = await listerFileAdmin(db, { permissions: moderateur, maintenant: T });
    expect(file.map((x) => [x.id, x.sla])).toEqual([
      ['t1', 'depasse'],
      ['t4', 'ok'],
    ]);
    expect(file[1]!.titre).toBe('Isolation Gironde');
    const admin = permissionsEffectives({ role: 'admin' });
    expect(
      (await listerFileAdmin(db, { permissions: admin, maintenant: T })).map((x) => x.id),
    ).toEqual(['t2', 't3', 't1', 't4']);
    await assignerTacheAdmin(s(), {
      acteurUid: 'm1',
      permissions: moderateur,
      id: 't1',
      prendre: true,
    });
    expect((await db.collection(collections.filesModeration).doc('t1').get()).data()).toMatchObject(
      {
        assigneA: 'm1',
        statut: 'en_cours',
      },
    );
    await expect(
      assignerTacheAdmin(s(), {
        acteurUid: 'm1',
        permissions: moderateur,
        id: 't3',
        prendre: true,
      }),
    ).rejects.toMatchObject({ code: 'PERMISSION_REFUSEE' });
    await traiterTacheAdmin(s(), {
      acteurUid: 'm1',
      permissions: moderateur,
      id: 't1',
      issue: 'traitee',
      resolution: 'Avis publié',
    });
    expect(
      (await listerFileAdmin(db, { permissions: moderateur, maintenant: T })).map((x) => x.id),
    ).toEqual(['t4']);
  });

  it('tableau de bord : compteurs par agrégation, chiffre d’affaires si finances', async () => {
    await db
      .collection(collections.demandes)
      .doc('d1')
      .set({ createdAt: Timestamp.fromMillis(T - 3_600_000) });
    await db
      .collection(collections.demandes)
      .doc('d2')
      .set({ createdAt: Timestamp.fromMillis(T - 3 * 86_400_000) });
    await db
      .collection(collections.factures)
      .doc('f1')
      .set({
        statut: 'paid',
        montantHtCentimes: 95_880,
        createdAt: Timestamp.fromMillis(T - 86_400_000),
      });
    const t = await lireTableauDeBordAdmin(db, { maintenant: T, finances: true });
    expect(t).toMatchObject({
      demandes30j: 2,
      demandesAujourdhui: 1,
      chiffreAffairesHt30j: 95_880,
    });
    expect(t.demandesParJour).toHaveLength(14);
    expect(t.demandesParJour.at(-1)!.n).toBe(1);
    expect(
      (await lireTableauDeBordAdmin(db, { maintenant: T, finances: false })).chiffreAffairesHt30j,
    ).toBeNull();
  });
});

describe('documents et notes (ADMIN §2.3)', () => {
  const T = Date.UTC(2026, 9, 2, 12);
  it('valider une décennale : label vérifié avec sa fin, tâche close, artisan prévenu ; refuser : motif', async () => {
    const envois: unknown[] = [];
    const s = { db, horloge: () => T, notifier: async (e: unknown) => void envois.push(e) };
    await db.doc(chemins.artisan('a1')).set({ nomCommercial: 'X', proprietaireUid: 'p1' });
    for (const [id, type] of [
      ['d1', 'decennale'],
      ['d2', 'kbis'],
    ])
      await db.doc(`${chemins.documents('a1')}/${id}`).set({
        type,
        statut: 'en_attente',
        createdAt: Timestamp.fromMillis(T - 3_600_000),
      });
    await db.collection(collections.filesModeration).doc(idTacheDocument('a1', 'd1')).set({
      type: 'document',
      statut: 'a_traiter',
    });
    const fin = Date.UTC(2027, 5, 30);
    await deciderDocumentAdmin(s, {
      acteurUid: 'm1',
      artisanId: 'a1',
      documentId: 'd1',
      decision: 'valide',
      valideAu: fin,
      motif: 'Attestation lisible',
    });
    const a = (await db.doc(chemins.artisan('a1')).get()).data()!;
    expect(a.labelsVerifies.decennale.expireLe.toMillis()).toBe(fin);
    expect(
      (await db.collection(collections.filesModeration).doc(idTacheDocument('a1', 'd1')).get()).get(
        'statut',
      ),
    ).toBe('traitee');
    await deciderDocumentAdmin(s, {
      acteurUid: 'm1',
      artisanId: 'a1',
      documentId: 'd2',
      decision: 'refuse',
      motif: 'Kbis de plus de 3 mois',
    });
    expect((await db.doc(`${chemins.documents('a1')}/d2`).get()).get('motifRefus')).toBe(
      'Kbis de plus de 3 mois',
    );
    expect(envois.map((x) => (x as { modele: string }).modele)).toEqual([
      'document-valide',
      'document-refuse',
    ]);
    await expect(
      deciderDocumentAdmin(s, {
        acteurUid: 'm1',
        artisanId: 'a1',
        documentId: 'd2',
        decision: 'valide',
        motif: 'erreur',
      }),
    ).rejects.toMatchObject({ code: 'CONFLIT' });
    await ajouterNoteAdmin(s, {
      acteurUid: 'm1',
      cible: 'artisans/a1',
      texte: 'Kbis relancé par email.',
    });
    const f = (await lireArtisanAdmin(db, 'a1'))!;
    expect(f.notes.map((n) => n.texte)).toEqual(['Kbis relancé par email.']);
    expect(f.documents.map((d) => [d.type, d.statut])).toEqual(
      expect.arrayContaining([
        ['decennale', 'valide'],
        ['kbis', 'refuse'],
      ]),
    );
  });
});

describe('demandes dans l’admin (ADMIN §2.4)', () => {
  const T = Date.UTC(2026, 9, 2, 12);
  const envois: unknown[] = [];
  const s = () => ({ db, horloge: () => T, notifier: async (e: unknown) => void envois.push(e) });
  const demande = (id: string, statut: string) =>
    db.doc(chemins.demande(id)).set({
      reference: `PH-${id.toUpperCase().padEnd(6, 'X')}`,
      statut,
      source: 'simulateur',
      prestationId: 'peinture',
      adresseChantier: { ville: 'Floirac' },
      estimation: { minCentimes: 100_000, maxCentimes: 200_000 },
      contact: {
        prenom: 'Hélène',
        nom: 'Marty',
        email: 'helene@test.local',
        telephone: '+33612345678',
      },
      createdAt: Timestamp.fromMillis(T),
      nbAttributions: 0,
    });

  it('liste filtrée, fiche masquée avec la trace ; spam ; ajout manuel d’un artisan', async () => {
    await demande('d1', 'attribuee');
    await demande('d2', 'nouvelle');
    await db
      .collection(collections.matching)
      .doc('d1')
      .set({
        resultat: 'attribuee',
        candidats: [
          { artisanId: 'a1', score: 82, distance: 4, retenu: true },
          { artisanId: 'a2', score: 0, exclu: 'non_verifie', retenu: false },
        ],
      });
    await db
      .doc(chemins.artisan('a1'))
      .set({ nomCommercial: 'Bertrand', statut: 'actif', proprietaireUid: 'p1' });
    await db.doc(chemins.artisan('a2')).set({ nomCommercial: 'Nguyen', statut: 'actif' });
    expect((await listerDemandesAdmin(db, { filtre: 'attente' })).map((d) => d.id)).toEqual(['d2']);
    expect(
      (await listerDemandesAdmin(db, { filtre: 'toutes', reference: 'ph-d1xxxx' })).map(
        (d) => d.id,
      ),
    ).toEqual(['d1']);
    const f = (await lireDemandeAdmin(db, 'd1'))!;
    expect(f).toMatchObject({ particulier: 'Hélène M.', emailMasque: 'h•••@t•••.local' });
    expect(JSON.stringify(f)).not.toContain('helene@test.local');
    expect(f.candidats.map((c) => [c.nom, c.retenu, c.exclu])).toEqual([
      ['Bertrand', true, null],
      ['Nguyen', false, 'non_verifie'],
    ]);
    await rejeterDemandeAdmin(s(), {
      acteurUid: 'adm',
      demandeId: 'd2',
      statut: 'spam',
      motif: 'Numéro factice',
    });
    expect((await db.doc(chemins.demande('d2')).get()).get('statut')).toBe('spam');
    await ajouterArtisanDemandeAdmin(s(), {
      acteurUid: 'adm',
      demandeId: 'd1',
      artisanId: 'a2',
      motif: 'Demande du client',
    });
    expect((await db.doc(chemins.attribution('d1', 'a2')).get()).get('statut')).toBe('proposee');
    await expect(
      ajouterArtisanDemandeAdmin(s(), {
        acteurUid: 'adm',
        demandeId: 'd1',
        artisanId: 'a2',
        motif: 'encore',
      }),
    ).rejects.toMatchObject({ code: 'CONFLIT' });
    await expect(
      relancerMatchingAdmin(s(), { acteurUid: 'adm', demandeId: 'd1', motif: 'test' }),
    ).rejects.toMatchObject({ code: 'PRECONDITION' });
  });
});

describe('appels d’offres et prix dans l’admin (ADMIN §2.5)', () => {
  const T = Date.UTC(2026, 9, 2, 12);
  const s = () => ({ db, horloge: () => T });
  const H = 3_600_000;
  const appel = (id: string, statut: string, nbDeblocages = 0) =>
    db.doc(chemins.appelOffres(id)).set({
      titre: 'Peinture à Floirac',
      demandeId: id,
      statut,
      qualiteLead: 70,
      nbDeblocages,
      nbDeblocagesMax: 3,
      acces: 'premium_prioritaire',
      ouvertLe: Timestamp.fromMillis(T - H),
      ouvertJusquau: Timestamp.fromMillis(T + 72 * H),
      tarification: {
        mode: 'auto',
        prixBaseCentimes: 1500,
        prixPremiumCentimes: 1100,
        prixCredits: 2,
        detailCalcul: {
          base: 1500,
          coefBudget: 1,
          coefUrgence: 1,
          coefQualite: 1,
          coefConcurrence: 1,
          coefNiveau: 1,
          coefEligibilite: 1,
        },
        prixPlancherCentimes: 500,
        prixPlafondCentimes: 9900,
        historique: [],
      },
    });
  const tarif = async (id: string) =>
    (await db.doc(chemins.appelOffres(id)).get()).get('tarification') as Record<string, unknown>;
  const base = { acteurUid: 'adm', appelOffresId: 'ao1', motif: 'Relance commerciale' };

  it('prix manuel borné, gratuit puis retour au calcul ; historique et audit', async () => {
    await appel('ao1', 'ouvert');
    await appel('ao2', 'clos');
    expect((await listerAppelsOffresAdmin(db, 'ouverts')).map((a) => a.id)).toEqual(['ao1']);
    const manuel = { prixBaseCentimes: 2500, prixPremiumCentimes: 1800, prixCredits: 3 };
    await fixerPrixAppelOffresAdmin(s(), {
      ...base,
      mode: 'manuel',
      prix: manuel,
      illimite: false,
    });
    expect(await tarif('ao1')).toMatchObject({ mode: 'manuel', ...manuel, fixePar: 'adm' });
    await expect(
      fixerPrixAppelOffresAdmin(s(), {
        ...base,
        mode: 'manuel',
        prix: { ...manuel, prixBaseCentimes: 4500 },
        illimite: false,
      }),
    ).rejects.toMatchObject({ code: 'PERMISSION_REFUSEE' });
    await fixerPrixAppelOffresAdmin(s(), {
      ...base,
      mode: 'manuel',
      prix: { ...manuel, prixBaseCentimes: 4500 },
      illimite: true,
    });
    await fixerPrixAppelOffresAdmin(s(), { ...base, mode: 'gratuit', illimite: false });
    expect(await tarif('ao1')).toMatchObject({ mode: 'gratuit', prixBaseCentimes: 0 });
    await fixerPrixAppelOffresAdmin(s(), { ...base, mode: 'auto', illimite: false });
    expect(await tarif('ao1')).toMatchObject({
      mode: 'auto',
      prixBaseCentimes: 1500,
      prixPremiumCentimes: 1100,
      prixCredits: 2,
    });
    const f = (await lireAppelOffresAdmin(db, 'ao1'))!;
    expect(f.historique.map((h) => h.prixHtCentimes).sort()).toEqual([0, 1500, 2500, 4500]);
    expect((await tarif('ao1')).historique).toHaveLength(4);
    const audit = await db
      .collection(collections.auditLog)
      .where('action', '==', 'adminFixerPrixLead')
      .get();
    expect(audit.size).toBe(4);
    await expect(
      fixerPrixAppelOffresAdmin(s(), {
        ...base,
        appelOffresId: 'ao2',
        mode: 'gratuit',
        illimite: true,
      }),
    ).rejects.toMatchObject({ code: 'CONFLIT' });
  });

  it('promo bornée par la clôture ; déblocages max jamais sous ceux faits', async () => {
    await appel('ao1', 'ouvert', 2);
    await expect(
      promoAppelOffresAdmin(s(), { ...base, pourcentage: 50, jusquau: T + 100 * H }),
    ).rejects.toMatchObject({ code: 'ENTREE_INVALIDE' });
    await promoAppelOffresAdmin(s(), { ...base, pourcentage: 50, jusquau: T + 24 * H });
    expect((await lireAppelOffresAdmin(db, 'ao1'))!).toMatchObject({
      promo: 50,
      promoJusquau: T + 24 * H,
    });
    await promoAppelOffresAdmin(s(), base);
    expect((await tarif('ao1')).promo).toBeUndefined();
    await expect(
      parametresAppelOffresAdmin(s(), { ...base, nbDeblocagesMax: 1, acces: 'tous' }),
    ).rejects.toMatchObject({ code: 'CONFLIT' });
    await parametresAppelOffresAdmin(s(), { ...base, nbDeblocagesMax: 2, acces: 'tous' });
    expect((await lireAppelOffresAdmin(db, 'ao1'))!).toMatchObject({
      statut: 'complet',
      acces: 'tous',
      nbDeblocagesMax: 2,
    });
  });
});

describe('barèmes (ADMIN §2.5, ADM-05)', () => {
  const T = Date.UTC(2026, 9, 2, 12);
  const s = () => ({ db, horloge: () => T });
  it('simulation sur les derniers leads, publication versionnée, nouveau prix au matching', async () => {
    for (const [i, metier] of ['plomberie', 'deco'].entries()) {
      await db.doc(chemins.demande(`d${i}`)).set({ qualification: { niveau: 'A' } });
      await db.doc(chemins.appelOffres(`ao${i}`)).set({
        titre: `Lead ${i}`,
        demandeId: `d${i}`,
        metier,
        trancheBudget: 'M',
        urgence: 'normale',
        qualiteLead: 60,
        artisansInvites: ['a1', 'a2', 'a3', 'a4'],
        ouvertLe: Timestamp.fromMillis(T - i * 1000),
      });
    }
    const saisie = saisieDepuisBareme(BAREME_DEFAUT);
    const nouveau = baremeDepuisSaisie(
      { ...saisie, prixBaseParMetier: { ...saisie.prixBaseParMetier, plomberie: 20 } },
      BAREME_DEFAUT,
    );
    const sim = await simulerBaremeAdmin(db, nouveau, T);
    expect(sim.lignes.map((l) => [l.id, l.avant, l.apres])).toEqual([
      ['ao0', 1500, 2000],
      ['ao1', 1200, 1200],
    ]);
    expect(
      await publierBaremeAdmin(s(), {
        acteurUid: 'adm',
        bareme: nouveau,
        motif: 'Hausse plomberie',
      }),
    ).toBe('gironde-2026-v1');
    const v2 = baremeDepuisSaisie({ ...saisie, plafond: 80 }, BAREME_DEFAUT);
    await publierBaremeAdmin(s(), { acteurUid: 'adm', bareme: v2, motif: 'Plafond abaissé' });
    const l = await lireBaremesAdmin(db);
    expect(l.actif).toMatchObject({ id: 'gironde-2026-v2', version: 2 });
    expect(l.actif.bareme.plafond).toBe(8000);
    expect(l.versions.map((v) => [v.id, v.actif])).toEqual([
      ['gironde-2026-v2', true],
      ['gironde-2026-v1', false],
    ]);
    const audit = await db
      .collection(collections.auditLog)
      .where('action', '==', 'adminMajBareme')
      .get();
    expect(audit.docs.map((a) => a.get('motif')).sort()).toEqual([
      'Hausse plomberie',
      'Plafond abaissé',
    ]);
  });
});

describe('contestations (ADMIN §2.5, DATABASE §5)', () => {
  const T = Date.UTC(2026, 9, 2, 12);
  const J = 86_400_000;
  const envois: { modele: string }[] = [];
  const remboursements: string[] = [];
  const s = (maintenant = T) => ({
    db,
    horloge: () => maintenant,
    notifier: async (e: unknown) => void envois.push(e as { modele: string }),
    rembourserCarte: async (pi: string, cle: string) => {
      remboursements.push(`${pi}:${cle}`);
      return 're_1';
    },
  });
  /** Achat `ach{n}` de l'appel d'offres `ao{n}` par l'artisan a1 (zone : Bordeaux, 20 km). */
  const achat = async (n: number, moyen: 'credits' | 'carte', debloqueLe = T - J) => {
    await db.doc(chemins.appelOffres(`ao${n}`)).set({
      titre: `Toiture ${n}`,
      demandeId: 'dem1',
      geo: { latitude: 44.86, longitude: -0.55 },
    });
    await db.doc(`${collections.achatsLeads}/ach${n}`).set({
      artisanId: 'a1',
      moyen,
      credits: moyen === 'credits' ? 2 : 0,
      prixHtCentimes: moyen === 'carte' ? 1900 : 0,
      statut: 'paye',
      ...(moyen === 'carte' ? { stripePaymentIntentId: `pi_${n}` } : {}),
    });
    await db.doc(chemins.deblocage(`ao${n}`, 'a1')).set({
      achatId: `ach${n}`,
      statut: 'actif',
      debloqueLe: Timestamp.fromMillis(debloqueLe),
    });
  };
  const contester = (n: number, motif: 'faux_numero' | 'hors_zone', maintenant = T) =>
    contesterAppelOffres(s(maintenant), {
      artisanId: 'a1',
      uid: 'p1',
      appelOffresId: `ao${n}`,
      motif,
      details: 'Numéro non attribué, trois appels.',
    });

  beforeEach(async () => {
    envois.length = 0;
    remboursements.length = 0;
    await db.doc(chemins.artisan('a1')).set({
      nomCommercial: 'Toitures Rive Droite',
      proprietaireUid: 'p1',
      zoneIntervention: { centre: { latitude: 44.84, longitude: -0.58 }, rayonKm: 20 },
    });
    await db.doc(chemins.membre('a1', 'p1')).set({ role: 'proprietaire', statut: 'actif' });
    await db.doc(chemins.demande('dem1')).set({ contestationsAcceptees: 3 });
    await db.doc(chemins.portefeuille('a1')).set({ soldeCredits: 1 });
  });

  it('contester : une fois, 7 jours, hors zone refusé dans le rayon ; tâche créée', async () => {
    await achat(1, 'credits');
    await achat(2, 'credits');
    await achat(3, 'credits', T - 8 * J);
    expect(await contester(1, 'faux_numero')).toEqual({ etat: 'ouverte' });
    await expect(contester(1, 'faux_numero')).rejects.toMatchObject({ code: 'CONFLIT' });
    expect(await contester(2, 'hors_zone')).toMatchObject({ etat: 'refusee' });
    await expect(contester(3, 'faux_numero')).rejects.toMatchObject({ code: 'PRECONDITION' });
    expect(
      (await db.doc(`${collections.filesModeration}/contestation-ach1`).get()).get('type'),
    ).toBe('remboursement_lead');
    const l = await listerContestationsAdmin(db);
    expect(l.map((c) => [c.id, c.artisan, c.motif, c.parArtisan])).toEqual([
      ['ach1', 'Toitures Rive Droite', 'Numéro invalide', 2],
    ]);
  });

  it('crédits rendus, lead douteux ; carte remboursée ; refus motivé', async () => {
    await achat(1, 'credits');
    await achat(2, 'carte');
    await achat(3, 'credits');
    for (const n of [1, 2, 3]) await contester(n, 'faux_numero');
    const base = { acteurUid: 'adm', motif: 'Numéro vérifié invalide', peutCarte: false };
    await deciderContestationAdmin(s(), { ...base, id: 'ach1', decision: 'credits' });
    expect((await db.doc(chemins.portefeuille('a1')).get()).get('soldeCredits')).toBe(3);
    expect((await db.doc(`${collections.achatsLeads}/ach1`).get()).get('statut')).toBe(
      'rembourse_credits',
    );
    expect((await db.doc(chemins.deblocage('ao1', 'a1')).get()).get('statut')).toBe('rembourse');
    expect((await db.doc(chemins.demande('dem1')).get()).get('douteux')).toBe(true);
    expect(
      (await db.doc(`${collections.filesModeration}/contestation-ach1`).get()).get('statut'),
    ).toBe('traitee');
    await expect(
      deciderContestationAdmin(s(), { ...base, id: 'ach2', decision: 'carte' }),
    ).rejects.toMatchObject({ code: 'PERMISSION_REFUSEE' });
    await deciderContestationAdmin(s(), {
      ...base,
      peutCarte: true,
      id: 'ach2',
      decision: 'carte',
    });
    expect(remboursements).toEqual(['pi_2:contestation-ach2']);
    expect((await db.doc(`${collections.achatsLeads}/ach2`).get()).get('statut')).toBe('rembourse');
    await deciderContestationAdmin(s(), { ...base, id: 'ach3', decision: 'refuser' });
    expect((await db.doc(`${collections.remboursementsLeads}/ach3`).get()).data()).toMatchObject({
      statut: 'refuse',
      motifDecision: 'Numéro vérifié invalide',
    });
    await expect(
      deciderContestationAdmin(s(), { ...base, id: 'ach3', decision: 'credits' }),
    ).rejects.toMatchObject({ code: 'CONFLIT' });
    expect(envois.filter((e) => e.modele === 'remboursement-lead')).toHaveLength(3);
  });
});

describe('sources partenaires (IMPORT_LEADS, IMP-02)', () => {
  const T = Date.UTC(2026, 9, 2, 12);
  it('sources avec les imports de la semaine, journal sans donnée personnelle, coupure auditée', async () => {
    await db
      .collection(collections.sourcesDemandes)
      .doc('src1')
      .set({
        nom: 'Simulateur aides',
        actif: true,
        quotaJour: 200,
        coutUnitaireCentimes: 700,
        departementsCouverts: ['33'],
      });
    const imp = (id: string, statut: string, il: number, extra = {}) =>
      db
        .collection(collections.importsDemandes)
        .doc(id)
        .set({
          sourceId: 'src1',
          idExterne: `ext-${id}`,
          statut,
          recueLe: Timestamp.fromMillis(T - il),
          ...extra,
        });
    await imp('i1', 'creee', 1000, { demandeId: 'd1' });
    await imp('i2', 'rejetee', 2000, {
      motifRejet: 'consentement_absent',
      details: 'consentement.texteAffiche',
    });
    await imp('i3', 'creee', 10 * 86_400_000);
    const [src] = await listerSourcesAdmin(db, T);
    expect(src).toMatchObject({
      nom: 'Simulateur aides',
      semaine: { creee: 1, doublon: 0, rejetee: 1 },
    });
    const j = await journalImportsAdmin(db, 'src1');
    expect(j.map((x) => [x.id, x.statut, x.motifRejet])).toEqual([
      ['i1', 'creee', null],
      ['i2', 'rejetee', 'consentement_absent'],
      ['i3', 'creee', null],
    ]);
    await activerSourceAdmin(
      { db, horloge: () => T },
      { acteurUid: 'adm', sourceId: 'src1', actif: false, motif: 'Pic de doublons' },
    );
    expect((await db.collection(collections.sourcesDemandes).doc('src1').get()).get('actif')).toBe(
      false,
    );
  });
});

describe('avis dans l’admin (ADMIN §2.6)', () => {
  const T = Date.UTC(2026, 9, 2, 12);
  const envois: { modele: string }[] = [];
  const s = () => ({
    db,
    horloge: () => T,
    notifier: async (e: unknown) => void envois.push(e as { modele: string }),
  });
  const avis = async (
    id: string,
    p: { note: number; texte: string; ip: string; uid?: string; statut?: string },
  ) => {
    await db.doc(chemins.avis(id)).set({
      artisanId: 'a1',
      nomAffiche: 'Paul G.',
      note: p.note,
      texte: p.texte,
      preuve: { type: 'aucune' },
      statut: p.statut ?? 'en_attente',
      createdAt: Timestamp.fromMillis(T),
    });
    await db.doc(`${chemins.avis(id)}/prive/auteur`).set({
      auteurEmail: `${id}@test.local`,
      ipHash: p.ip,
      ...(p.uid ? { auteurUid: p.uid } : {}),
    });
  };
  it('risque, publication avec la note de l’entreprise, refus, preuve, suspension, suppression', async () => {
    envois.length = 0;
    await db
      .doc(chemins.artisan('a1'))
      .set({ nomCommercial: 'Bertrand', proprietaireUid: 'p1', noteMoyenne: 4, nbAvis: 1 });
    await db.doc(chemins.user('u1')).set({ createdAt: Timestamp.fromMillis(T - 3_600_000) });
    await db.doc(chemins.membre('a1', 'u2')).set({ role: 'collaborateur', statut: 'actif' });
    await avis('av1', {
      note: 1,
      texte: 'Arnaque, ne venez pas, acompte jamais rendu.',
      ip: 'ip1',
      uid: 'u1',
    });
    await avis('av2', { note: 5, texte: 'Arnaque ne venez pas acompte jamais rendu', ip: 'ip1' });
    await avis('av3', { note: 5, texte: 'Parfait, très professionnel.', ip: 'ip3', uid: 'u2' });
    await db
      .collection(collections.filesModeration)
      .doc('avis-av3')
      .set({ type: 'avis', statut: 'a_traiter' });
    const l = await listerAvisAdmin(db, 'attente');
    const r = new Map(l.map((a) => [a.id, a.risque!]));
    expect(r.get('av1')!.raisons).toEqual(
      expect.arrayContaining(['Compte créé il y a moins de 48 h', 'Texte proche d’un autre avis']),
    );
    expect(r.get('av1')!.niveau).toBe('eleve');
    expect(r.get('av3')!.raisons).toContain('Auteur lié à l’entreprise');
    expect((await listerAvisAdmin(db, 'risque')).map((a) => a.id)).toContain('av1');
    const base = { acteurUid: 'adm', motif: 'Devis vérifié' };
    await modererAvisAdmin(s(), { ...base, avisId: 'av3', action: 'publier' });
    expect((await db.doc(chemins.artisan('a1')).get()).data()).toMatchObject({
      noteMoyenne: 4.5,
      nbAvis: 2,
    });
    expect((await db.doc(`${collections.filesModeration}/avis-av3`).get()).get('statut')).toBe(
      'traitee',
    );
    await modererAvisAdmin(s(), {
      acteurUid: 'adm',
      avisId: 'av1',
      action: 'refuser',
      motif: 'Insultes envers l’artisan',
      motifRefus: 'Propos injurieux ou diffamatoires',
    });
    await modererAvisAdmin(s(), { ...base, avisId: 'av2', action: 'preuve' });
    expect((await db.doc(chemins.avis('av2')).get()).get('statut')).toBe('en_attente');
    await expect(
      modererAvisAdmin(s(), { ...base, avisId: 'av1', action: 'publier' }),
    ).rejects.toMatchObject({ code: 'CONFLIT' });
    await modererAvisAdmin(s(), { ...base, avisId: 'av3', action: 'suspendre' });
    expect((await db.doc(chemins.artisan('a1')).get()).data()).toMatchObject({
      noteMoyenne: 4,
      nbAvis: 1,
    });
    expect(envois.map((e) => e.modele)).toEqual([
      'avis-publie',
      'nouvel-avis',
      'avis-refuse',
      'avis-preuve-demandee',
    ]);
    await supprimerAvisAdmin(
      { db, horloge: () => T },
      { acteurUid: 'adm', avisId: 'av1', motif: 'Demande de l’auteur' },
    );
    expect((await db.doc(chemins.avis('av1')).get()).exists).toBe(false);
    expect((await db.doc(`${chemins.avis('av1')}/prive/auteur`).get()).exists).toBe(false);
  });
});

describe('litiges et médiation (ADMIN §2.7)', () => {
  const T = Date.UTC(2026, 9, 2, 12);
  const envois: { modele: string }[] = [];
  const s = () => ({
    db,
    horloge: () => T,
    notifier: async (e: unknown) => void envois.push(e as { modele: string }),
  });
  it('message du médiateur aux deux parties, décision avec avertissement, audit', async () => {
    await db.doc(chemins.user('u1')).set({ nomAffiche: 'Camille Martin' });
    await db
      .doc(chemins.artisan('a1'))
      .set({ nomCommercial: 'Atelier Garnier', proprietaireUid: 'p1' });
    await db
      .collection(collections.litiges)
      .doc('l1')
      .set({
        particulierUid: 'u1',
        artisanId: 'a1',
        description: 'Chantier non terminé, il reste la faïence et le meuble.',
        statut: 'ouvert',
        echanges: [
          {
            le: Timestamp.fromMillis(T - 1000),
            par: 'particulier',
            texte: 'Travaux arrêtés depuis 3 semaines.',
          },
        ],
        createdAt: Timestamp.fromMillis(T - 1000),
      });
    const l = await listerLitigesAdmin(db, 'ouverts');
    expect(l.map((x) => [x.particulier, x.artisan])).toEqual([['Camille M.', 'Atelier Garnier']]);
    await ecrireLitigeAdmin(s(), {
      acteurUid: 'adm',
      id: 'l1',
      texte: 'Merci d’indiquer une date de reprise sous 5 jours.',
    });
    expect(envois.map((e) => e.modele)).toEqual(['litige-message', 'litige-message']);
    await deciderLitigeAdmin(s(), {
      acteurUid: 'adm',
      id: 'l1',
      issue: 'resolu',
      sanction: 'avertissement',
      motif: 'Reprise faite le 30/09',
    });
    const f = (await lireLitigeAdmin(db, 'l1'))!;
    expect(f.statut).toBe('resolu');
    expect(f.echanges.map((x) => x.auteur)).toEqual(['particulier', 'mediateur', 'decision']);
    const sanctions = await db
      .collection(collections.sanctions)
      .where('artisanId', '==', 'a1')
      .get();
    expect(sanctions.docs.map((x) => x.get('type'))).toEqual(['avertissement']);
    await expect(
      ecrireLitigeAdmin(s(), { acteurUid: 'adm', id: 'l1', texte: 'encore' }),
    ).rejects.toMatchObject({ code: 'CONFLIT' });
    expect((await listerLitigesAdmin(db, 'termines')).map((x) => x.id)).toEqual(['l1']);
  });
});

describe('finances (ADMIN §2.8)', () => {
  const T = Date.UTC(2026, 8, 20, 12);
  it('MRR, abonnés, appels d’offres du mois ; pièces du mois pour la comptabilité', async () => {
    await db.doc(chemins.artisan('a1')).set({ nomCommercial: 'Bertrand' });
    await db.collection(collections.abonnements).doc('sub1').set({
      artisanId: 'a1',
      produit: 'premium',
      periode: 'mensuel',
      statut: 'active',
      sieges: 0,
    });
    await db.collection(collections.abonnements).doc('sub2').set({
      artisanId: 'a1',
      produit: 'visibilite',
      periode: 'annuel',
      statut: 'canceled',
      sieges: 0,
    });
    await db
      .collection(collections.factures)
      .doc('in1')
      .set({
        artisanId: 'a1',
        numero: 'F-2026-0001',
        montantHtCentimes: 9990,
        tvaCentimes: 1998,
        montantTtcCentimes: 11988,
        statut: 'paid',
        payeeLe: Timestamp.fromMillis(T),
        createdAt: Timestamp.fromMillis(T),
      });
    await db
      .collection(collections.factures)
      .doc('in0')
      .set({
        artisanId: 'a1',
        numero: 'F-2026-0000',
        montantHtCentimes: 9990,
        tvaCentimes: 1998,
        montantTtcCentimes: 11988,
        statut: 'paid',
        payeeLe: Timestamp.fromMillis(Date.UTC(2026, 7, 31, 12)),
        createdAt: Timestamp.fromMillis(T),
      });
    await db
      .collection(collections.achatsLeads)
      .doc('al1')
      .set({
        artisanId: 'a1',
        moyen: 'carte',
        prixHtCentimes: 1900,
        tvaCentimes: 380,
        createdAt: Timestamp.fromMillis(T),
      });
    await db
      .collection(collections.achatsLeads)
      .doc('al2')
      .set({
        artisanId: 'a1',
        moyen: 'credits',
        prixHtCentimes: 0,
        tvaCentimes: 0,
        createdAt: Timestamp.fromMillis(T),
      });
    await db
      .collection(chemins.mouvements('a1'))
      .doc('ev1')
      .set({ type: 'achat_pack', credits: 10, refId: 'cs_1', createdAt: Timestamp.fromMillis(T) });
    const f = await lireFinancesAdmin(db, T);
    expect(f).toMatchObject({
      mrr: 9990,
      abonnes: { premium: 1, visibilite: 0 },
      appelsOffres30j: { ht: 1900, deblocages: 2 },
    });
    expect(f.factures[0]).toMatchObject({
      client: 'Bertrand',
      numero: expect.stringMatching(/^F-2026-000/),
    });
    const pieces = await piecesDuMois(db, { mois: '2026-09', acteurUid: 'fin', maintenant: T });
    expect(pieces.map((p) => [p.piece, p.ht, p.ttc]).sort()).toEqual([
      ['AL-al1', 1900, 2280],
      ['F-2026-0001', 9990, 11988],
      ['PK-cs_1', 9000, 10800],
    ]);
    const audit = await db
      .collection(collections.auditLog)
      .where('action', '==', 'adminExportFinances')
      .get();
    expect(audit.docs[0]!.get('cible')).toBe('finances/2026-09');
  });
});

describe('référentiels et réglages (ADMIN §2.9)', () => {
  const T = Date.UTC(2026, 9, 4, 12);
  const s = () => ({ db, horloge: () => T });
  it('prix d’une prestation : nombres modifiés, nouvelle version, ancienne archivée ; retrait ; flags', async () => {
    await db
      .doc(chemins.prestationItem('peinture'))
      .set({ nom: 'Peinture', famille: 'deco', actif: true, ordre: 1, version: '2026-09-01.1' });
    await db.doc(chemins.prestationPrix('peinture')).set({
      parametres: { tarif: { min: 2500, max: 3800 }, tva: 'reduite' },
      version: '2026-09-01.1',
    });
    expect((await listerPrestationsAdmin(db)).map((p) => p.nom)).toEqual(['Peinture']);
    const base = { acteurUid: 'adm', id: 'peinture', motif: 'Hausse des matériaux' };
    expect(await modifierPrixPrestationAdmin(s(), { ...base, modifs: { 'tarif.min': 2700 } })).toBe(
      '2026-10-04.1',
    );
    expect((await lirePrixPrestationAdmin(db, 'peinture'))!.feuilles).toEqual([
      { chemin: 'tarif.min', valeur: 2700 },
      { chemin: 'tarif.max', valeur: 3800 },
    ]);
    expect(
      (await db.doc(`${chemins.prestationPrix('peinture')}/versions/2026-09-01.1`).get()).get(
        'parametres.tarif.min',
      ),
    ).toBe(2500);
    expect((await db.doc(chemins.prestationItem('peinture')).get()).get('version')).toBe(
      '2026-10-04.1',
    );
    await expect(
      modifierPrixPrestationAdmin(s(), { ...base, modifs: { tva: 1 } }),
    ).rejects.toMatchObject({ code: 'ENTREE_INVALIDE' });
    await activerPrestationAdmin(s(), { ...base, actif: false });
    expect((await listerPrestationsAdmin(db))[0]!.actif).toBe(false);
    await changerFlagAdmin(s(), {
      acteurUid: 'adm',
      nom: 'maintenance',
      valeur: true,
      motif: 'Migration',
    });
    expect((await lireFlagsAdmin(db)).find((f) => f.nom === 'maintenance')!.valeur).toBe(true);
  });
});

describe('annonces (ADMIN §2.11)', () => {
  const T = Date.UTC(2026, 9, 4, 12);
  const s = () => ({ db, horloge: () => T });
  it('publier puis arrêter une annonce ; dates contrôlées', async () => {
    const id = await publierAnnonceAdmin(s(), {
      acteurUid: 'adm',
      titre: 'Nouveau',
      texte: 'Les appels d’offres arrivent.',
      cible: 'pros',
      ton: 'info',
      debut: T,
    });
    expect((await lireAnnoncesActives(db)).map((a) => a.id)).toEqual([id]);
    await expect(
      publierAnnonceAdmin(s(), {
        acteurUid: 'adm',
        titre: 'X',
        texte: 'Y',
        cible: 'tous',
        ton: 'info',
        debut: T,
        fin: T - 1,
      }),
    ).rejects.toMatchObject({ code: 'ENTREE_INVALIDE' });
    await arreterAnnonceAdmin(s(), { acteurUid: 'adm', id, motif: 'Message obsolète' });
    expect(await lireAnnoncesActives(db)).toEqual([]);
  });
});
