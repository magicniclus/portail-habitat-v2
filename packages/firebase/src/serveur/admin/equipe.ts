import { permissionsEffectives } from '@ph/core/admin';
import { ErreurMetier } from '@ph/core/erreurs';
import type { Auth } from 'firebase-admin/auth';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';
import { synchroniserClaims } from '../comptes/claims';
import type { Notifier } from '../comptes/services';
import { auditerAdmin } from './audit';

interface ProfilEquipe {
  email: string;
  nom: string;
  role: string;
  permissionsPlus?: string[];
  permissionsMoins?: string[];
}

/** Compte, `users/{uid}`, `admins/{uid}` et claims `staff` d'un membre de l'équipe interne. */
async function enregistrerMembreEquipe(
  s: { db: Firestore; auth: Auth; horloge: () => number },
  e: ProfilEquipe,
): Promise<{ uid: string; cree: boolean; email: string }> {
  const email = e.email.trim().toLowerCase();
  let uid: string;
  let cree = false;
  try {
    uid = (await s.auth.getUserByEmail(email)).uid;
  } catch {
    uid = (await s.auth.createUser({ email, emailVerified: true, displayName: e.nom })).uid;
    cree = true;
  }
  const maintenant = Timestamp.fromMillis(s.horloge());
  const refUser = s.db.doc(chemins.user(uid));
  if (!(await refUser.get()).exists)
    await refUser.set({
      schemaVersion: 1,
      createdAt: maintenant,
      updatedAt: maintenant,
      roles: [],
      email,
      emailVerifie: true,
      nomAffiche: e.nom,
      entreprises: [],
      fournisseurs: ['password'],
      origine: 'admin',
      statut: 'actif',
    });
  const profil = {
    role: e.role,
    permissionsPlus: e.permissionsPlus ?? [],
    permissionsMoins: e.permissionsMoins ?? [],
  };
  await s.db.doc(chemins.admin(uid)).set({
    schemaVersion: 1,
    createdAt: maintenant,
    nom: e.nom,
    email,
    ...profil,
    permissionsEffectives: permissionsEffectives(profil),
    mfaObligatoire: true,
    actif: true,
  });
  await synchroniserClaims(
    { db: s.db, auth: s.auth, horloge: s.horloge, notifier: async () => undefined },
    uid,
  );
  return { uid, cree, email };
}

/**
 * Premier super-administrateur (script `pnpm admin:creer`) : compte créé s'il n'existe pas, sans
 * mot de passe connu (lien de définition renvoyé), `admins/{uid}` et claims `staff` à jour.
 * La double authentification est exigée dès la première connexion (ADMIN §1).
 */
export async function creerSuperAdmin(
  s: { db: Firestore; auth: Auth; horloge: () => number },
  e: { email: string; nom: string },
): Promise<{ uid: string; lienMotDePasse: string; cree: boolean }> {
  const r = await enregistrerMembreEquipe(s, { ...e, role: 'superadmin' });
  return {
    uid: r.uid,
    lienMotDePasse: await s.auth.generatePasswordResetLink(r.email),
    cree: r.cree,
  };
}

type ServicesEquipe = { db: Firestore; auth: Auth; horloge: () => number; notifier: Notifier };

export interface MembreEquipeAdmin {
  uid: string;
  nom: string;
  email: string;
  role: string;
  actif: boolean;
  dernierAcces: number | null;
}

export async function listerEquipeAdmin(db: Firestore): Promise<MembreEquipeAdmin[]> {
  const r = await db.collection(collections.admins).orderBy('nom').get();
  return r.docs.map((d) => ({
    uid: d.id,
    nom: d.get('nom') as string,
    email: d.get('email') as string,
    role: d.get('role') as string,
    actif: d.get('actif') === true,
    dernierAcces: (d.get('dernierAcces') as Timestamp | undefined)?.toMillis() ?? null,
  }));
}

/**
 * `adminGererEquipe` (invitation) : compte créé, rôle et permissions, lien pour choisir son mot
 * de passe envoyé par email ; double authentification exigée à la première connexion.
 */
export async function inviterMembreEquipeAdmin(
  s: ServicesEquipe,
  e: ProfilEquipe & { acteurUid: string },
): Promise<string> {
  try {
    const existant = await s.auth.getUserByEmail(e.email.trim().toLowerCase());
    if ((await s.db.doc(chemins.admin(existant.uid)).get()).exists)
      throw new ErreurMetier('CONFLIT', 'Cette personne fait déjà partie de l’équipe.');
  } catch (err) {
    if (err instanceof ErreurMetier) throw err;
  }
  const r = await enregistrerMembreEquipe(s, e);
  await auditerAdmin(
    s.db,
    {
      acteurUid: e.acteurUid,
      action: 'adminInviterEquipe',
      cible: chemins.admin(r.uid),
      apres: { role: e.role },
    },
    s.horloge(),
  );
  await s.notifier({
    modele: 'invitation-equipe-admin',
    destinataire: { uid: r.uid, email: r.email },
    refObjet: chemins.admin(r.uid),
    donnees: {
      message: `Vous rejoignez l’équipe Portail Habitat. Choisissez votre mot de passe, puis activez la double authentification.`,
      lien: await s.auth.generatePasswordResetLink(r.email),
    },
  });
  return r.uid;
}

/**
 * Rôle, permissions ou désactivation d'un membre : jamais soi-même, et jamais le dernier
 * superadmin actif. Un membre désactivé perd ses sessions immédiatement.
 */
export async function modifierMembreEquipeAdmin(
  s: ServicesEquipe,
  e: { acteurUid: string; uid: string; role: string; actif: boolean; motif: string },
): Promise<void> {
  if (e.uid === e.acteurUid)
    throw new ErreurMetier('PRECONDITION', 'Vous ne pouvez pas modifier votre propre accès.');
  const ref = s.db.doc(chemins.admin(e.uid));
  const t0 = Timestamp.fromMillis(s.horloge());
  await s.db.runTransaction(async (t) => {
    const [d, supers] = await Promise.all([
      t.get(ref),
      t.get(
        s.db
          .collection(collections.admins)
          .where('role', '==', 'superadmin')
          .where('actif', '==', true),
      ),
    ]);
    if (!d.exists) throw new ErreurMetier('INTROUVABLE');
    const dernier = supers.size === 1 && supers.docs[0]!.id === e.uid;
    if (dernier && (e.role !== 'superadmin' || !e.actif))
      throw new ErreurMetier('PRECONDITION', 'Il doit rester au moins un superadmin actif.');
    const profil = {
      role: e.role,
      permissionsPlus: (d.get('permissionsPlus') as string[] | undefined) ?? [],
      permissionsMoins: (d.get('permissionsMoins') as string[] | undefined) ?? [],
    };
    t.update(ref, {
      ...profil,
      actif: e.actif,
      permissionsEffectives: permissionsEffectives(profil),
      updatedAt: t0,
    });
    auditerAdmin(
      s.db,
      {
        acteurUid: e.acteurUid,
        action: 'adminModifierEquipe',
        cible: ref.path,
        avant: { role: d.get('role'), actif: d.get('actif') },
        apres: { role: e.role, actif: e.actif },
        motif: e.motif,
      },
      s.horloge(),
      t,
    );
  });
  await synchroniserClaims(
    { db: s.db, auth: s.auth, horloge: s.horloge, notifier: s.notifier },
    e.uid,
  );
  if (!e.actif) await s.auth.revokeRefreshTokens(e.uid);
}
