import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { permissionsEffectives } from '@ph/core/admin';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { chemins, collections } from '../src/chemins';
import {
  afficherDonneePersonnelle,
  ajouterNoteAdmin,
  assignerTacheAdmin,
  crediterArtisanAdmin,
  creerSuperAdmin,
  deciderDocumentAdmin,
  idTacheDocument,
  jetonImpersonation,
  lireArtisanAdmin,
  lireTableauDeBordAdmin,
  listerFileAdmin,
  listerArtisansAdmin,
  sanctionnerArtisanAdmin,
  traiterTacheAdmin,
  verifierArtisanAdmin,
  verifierSessionAdmin,
} from '../src/serveur/admin';

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
