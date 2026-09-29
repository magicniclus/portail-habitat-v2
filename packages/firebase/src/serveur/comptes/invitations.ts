import { ErreurMetier } from '@ph/core/erreurs';
import { masquerEmail, siegesDisponibles } from '@ph/core/equipe';
import type {
  entreeAccepterInvitation,
  entreeCompteInvite,
  entreeInvitation,
  entreeInviterMembre,
} from '@ph/core/schemas';
import { invitation } from '@ph/core/schemas';
import type { z } from '@ph/core/zod';
import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';
import { convertisseur } from '../depot';
import { exigerPermission, lireEntreprise } from './acces';
import { synchroniserClaims } from './claims';
import { nouveauMembre } from './membres-outils';
import { empreinteJeton, JOUR_MS, nouveauJeton, type ServicesComptes } from './services';
import { nouvelUtilisateur } from './utilisateurs';

/** Validité d'une invitation et plafond d'envoi (COMPTES §4.2). */
const DUREE_INVITATION_MS = 7 * JOUR_MS;
const INVITATIONS_MAX_PAR_JOUR = 20;

const refInvitations = (db: Firestore) =>
  db.collection(collections.invitations).withConverter(convertisseur(invitation));

/** Invitations encore valables d'une entreprise (elles occupent un siège). */
function invitationsEnCours(db: Firestore, artisanId: string, maintenant: Date) {
  return db
    .collection(collections.invitations)
    .where('artisanId', '==', artisanId)
    .where('statut', '==', 'envoyee')
    .where('expireLe', '>', Timestamp.fromDate(maintenant));
}

function lienInvitation(jeton: string) {
  return `/pro/invitation?t=${jeton}`;
}

const dateFr = (d: Date) =>
  new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Paris',
  }).format(d);

/** Données du modèle `invitation-membre` : jamais l'email du destinataire en clair (masqué). */
function donneesInvitation(
  entreprise: { nomCommercial: string; adresseSiege?: { ville?: string } },
  invitant: string | undefined,
  role: string,
  email: string,
  maintenant: Date,
) {
  return {
    nomCommercial: entreprise.nomCommercial,
    ville: entreprise.adresseSiege?.ville ?? '',
    invitant: invitant ?? 'Un membre de l’équipe',
    role,
    emailMasque: masquerEmail(email),
    expireLe: dateFr(new Date(maintenant.getTime() + DUREE_INVITATION_MS)),
  };
}

export async function inviterMembre(
  s: ServicesComptes,
  uid: string,
  e: z.output<typeof entreeInviterMembre>,
): Promise<{ invitationId: string }> {
  const maintenant = new Date(s.horloge());
  const jeton = (s.jeton ?? nouveauJeton)();
  const existant = await s.auth.getUserByEmail(e.email).catch(() => null);
  const ref = refInvitations(s.db).doc();

  const invitant = (await s.db.doc(chemins.user(uid)).get()).get('nomAffiche') as
    string | undefined;
  const entrepriseLue = await s.db.runTransaction(async (tx) => {
    await exigerPermission(s, tx, e.artisanId, uid, 'membres.gerer', e.role);
    const entreprise = await lireEntreprise(s, tx, e.artisanId);
    if (existant && (await tx.get(s.db.doc(chemins.membre(e.artisanId, existant.uid)))).exists)
      throw new ErreurMetier('CONFLIT', 'Cette personne fait déjà partie de l’équipe.');
    const enCours = await tx.get(invitationsEnCours(s.db, e.artisanId, maintenant));
    if (enCours.docs.some((d) => d.get('email') === e.email))
      throw new ErreurMetier('CONFLIT', 'Une invitation est déjà en cours pour cette adresse.');
    const aujourdhui = await tx.get(
      s.db
        .collection(collections.invitations)
        .where('artisanId', '==', e.artisanId)
        .where('createdAt', '>', Timestamp.fromMillis(maintenant.getTime() - JOUR_MS)),
    );
    if (aujourdhui.size >= INVITATIONS_MAX_PAR_JOUR) throw new ErreurMetier('TROP_DE_REQUETES');
    if (siegesDisponibles({ ...entreprise, invitationsEnCours: enCours.size }) < 1)
      throw new ErreurMetier(
        'PRECONDITION',
        'Tous les sièges de votre formule sont occupés. Ajoutez un siège ou retirez un membre.',
      );
    tx.set(ref, {
      schemaVersion: 1,
      createdAt: maintenant,
      artisanId: e.artisanId,
      email: e.email,
      role: e.role,
      ...(e.permissions?.length ? { permissions: e.permissions } : {}),
      ...(e.metiers?.length ? { metiers: e.metiers } : {}),
      invitePar: uid,
      jetonHash: empreinteJeton(jeton),
      statut: 'envoyee',
      expireLe: new Date(maintenant.getTime() + DUREE_INVITATION_MS),
    });
    return entreprise;
  });

  await s.notifier({
    modele: 'invitation-membre',
    destinataire: { email: e.email, artisanId: e.artisanId },
    refObjet: `invitations/${ref.id}`,
    variante: empreinteJeton(jeton).slice(0, 12),
    donnees: donneesInvitation(entrepriseLue, invitant, e.role, e.email, maintenant),
    secrets: { lien: lienInvitation(jeton) },
  });
  // Relance à J+3, annulée à l'envoi si l'invitation n'est plus en attente (encoreValable).
  await s.notifier({
    modele: 'invitation-relance',
    destinataire: { email: e.email, artisanId: e.artisanId },
    refObjet: `invitations/${ref.id}`,
    variante: empreinteJeton(jeton).slice(0, 12),
    donnees: donneesInvitation(entrepriseLue, invitant, e.role, e.email, maintenant),
    secrets: { lien: lienInvitation(jeton) },
    envoyerLe: new Date(maintenant.getTime() + 3 * JOUR_MS),
  });
  return { invitationId: ref.id };
}

/** Renvoyer : nouveau jeton, l'ancien lien ne fonctionne plus ; validité repartie pour 7 jours. */
export async function renvoyerInvitation(
  s: ServicesComptes,
  uid: string,
  e: z.output<typeof entreeInvitation>,
): Promise<void> {
  const maintenant = new Date(s.horloge());
  const jeton = (s.jeton ?? nouveauJeton)();
  const ref = s.db.collection(collections.invitations).doc(e.invitationId);
  const invitant = (await s.db.doc(chemins.user(uid)).get()).get('nomAffiche') as
    string | undefined;
  const { email, entreprise, role } = await s.db.runTransaction(async (tx) => {
    const inv = (await tx.get(ref)).data();
    if (!inv || inv.artisanId !== e.artisanId || !['envoyee', 'expiree'].includes(inv.statut))
      throw new ErreurMetier('INTROUVABLE');
    await exigerPermission(s, tx, e.artisanId, uid, 'membres.gerer', inv.role);
    const entreprise = await lireEntreprise(s, tx, e.artisanId);
    tx.update(ref, {
      jetonHash: empreinteJeton(jeton),
      statut: 'envoyee',
      expireLe: Timestamp.fromMillis(maintenant.getTime() + DUREE_INVITATION_MS),
      updatedAt: maintenant,
    });
    return { email: inv.email as string, role: inv.role as string, entreprise };
  });
  await s.notifier({
    modele: 'invitation-membre',
    destinataire: { email, artisanId: e.artisanId },
    refObjet: `invitations/${e.invitationId}`,
    variante: empreinteJeton(jeton).slice(0, 12),
    donnees: donneesInvitation(entreprise, invitant, role, email, maintenant),
    secrets: { lien: lienInvitation(jeton) },
  });
}

export async function revoquerInvitation(
  s: ServicesComptes,
  uid: string,
  e: z.output<typeof entreeInvitation>,
): Promise<void> {
  const ref = s.db.collection(collections.invitations).doc(e.invitationId);
  await s.db.runTransaction(async (tx) => {
    const inv = (await tx.get(ref)).data();
    if (!inv || inv.artisanId !== e.artisanId || inv.statut !== 'envoyee')
      throw new ErreurMetier('INTROUVABLE');
    await exigerPermission(s, tx, e.artisanId, uid, 'membres.gerer', inv.role);
    tx.update(ref, { statut: 'revoquee', updatedAt: new Date(s.horloge()) });
  });
}

/**
 * Acceptation (COMPTES §4.2) : même email que l'invitation, sièges revérifiés dans la transaction
 * (un autre membre a pu être ajouté entre-temps), jeton à usage unique.
 */
export async function accepterInvitation(
  s: ServicesComptes,
  uid: string,
  e: z.output<typeof entreeAccepterInvitation>,
): Promise<{ artisanId: string }> {
  const maintenant = new Date(s.horloge());
  const trouvee = await s.db
    .collection(collections.invitations)
    .where('jetonHash', '==', empreinteJeton(e.jeton))
    .limit(1)
    .get();
  const doc = trouvee.docs[0];
  if (!doc) throw new ErreurMetier('INTROUVABLE', 'Ce lien d’invitation n’est plus valable.');
  const compte = await s.auth.getUser(uid);

  const { inv, nomCommercial } = await s.db.runTransaction(async (tx) => {
    const inv = (await tx.get(doc.ref)).data();
    const expiree = !inv || (inv.expireLe as Timestamp).toMillis() <= maintenant.getTime();
    if (!inv || inv.statut !== 'envoyee' || expiree)
      throw new ErreurMetier('INTROUVABLE', 'Ce lien d’invitation n’est plus valable.');
    if (compte.email?.toLowerCase() !== inv.email || !compte.emailVerified)
      throw new ErreurMetier(
        'PERMISSION_REFUSEE',
        `Cette invitation est destinée à ${masquerEmail(inv.email as string)}. Connectez-vous avec cette adresse.`,
      );
    const entreprise = await lireEntreprise(s, tx, inv.artisanId as string);
    const refMembre = s.db.doc(chemins.membre(inv.artisanId as string, uid));
    if ((await tx.get(refMembre)).exists)
      throw new ErreurMetier('CONFLIT', 'Vous faites déjà partie de cette équipe.');
    if (entreprise.nbMembres >= entreprise.siegesMax)
      throw new ErreurMetier(
        'PRECONDITION',
        'L’équipe est complète : demandez à l’entreprise de libérer ou d’ajouter un siège.',
      );
    tx.set(
      refMembre,
      nouveauMembre({
        role: inv.role,
        ajoutePar: inv.invitePar,
        maintenant,
        metiers: inv.metiers,
        permissions: inv.permissions,
        invitationId: doc.id,
      }),
    );
    tx.update(s.db.doc(chemins.artisan(inv.artisanId as string)), {
      nbMembres: FieldValue.increment(1),
      updatedAt: maintenant,
    });
    tx.update(doc.ref, { statut: 'acceptee', acceptePar: uid, updatedAt: maintenant });
    return { inv, nomCommercial: entreprise.nomCommercial };
  });

  await rattacherProfil(s, uid, compte.email!, maintenant);
  await synchroniserClaims(s, uid, inv.artisanId as string);
  await s.notifier({
    modele: 'invitation-acceptee',
    destinataire: { uid: inv.invitePar as string, artisanId: inv.artisanId as string },
    refObjet: `invitations/${doc.id}`,
    donnees: {
      nomCommercial,
      membre: compte.displayName ?? masquerEmail(compte.email!),
      role: inv.role,
      lien: '/pro/equipe',
    },
    titreInApp: 'Un membre a rejoint votre équipe',
  });
  return { artisanId: inv.artisanId as string };
}

/** Crée le profil d'une personne invitée qui n'en avait pas encore. */
async function rattacherProfil(s: ServicesComptes, uid: string, email: string, maintenant: Date) {
  const ref = s.db.doc(chemins.user(uid));
  if ((await ref.get()).exists) return;
  await ref.set(
    nouvelUtilisateur({
      email,
      roles: ['artisan'],
      origine: 'invitation',
      fournisseurs: ['password'],
      emailVerifie: true,
      maintenant,
    }),
  );
}

/** Tâche planifiée `expirerInvitations` (chaque heure). */
export async function expirerInvitations(s: ServicesComptes): Promise<number> {
  const perimees = await s.db
    .collection(collections.invitations)
    .where('statut', '==', 'envoyee')
    .where('expireLe', '<=', Timestamp.fromMillis(s.horloge()))
    .get();
  const lot = s.db.batch();
  perimees.docs.forEach((d) => lot.update(d.ref, { statut: 'expiree' }));
  if (!perimees.empty) await lot.commit();
  for (const d of perimees.docs) {
    const artisanId = d.get('artisanId') as string;
    const nomCommercial = (await s.db.doc(chemins.artisan(artisanId)).get()).get('nomCommercial');
    await s.notifier({
      modele: 'invitation-expiree',
      destinataire: { uid: d.get('invitePar') as string, artisanId },
      refObjet: `invitations/${d.id}`,
      donnees: {
        nomCommercial,
        emailMasque: masquerEmail(d.get('email') as string),
        lien: '/pro/equipe',
      },
    });
  }
  return perimees.size;
}

export type ApercuInvitation =
  | { etat: 'introuvable' }
  | { etat: 'expiree'; artisanId: string; nomCommercial: string }
  | {
      etat: 'valide';
      artisanId: string;
      nomCommercial: string;
      ville: string;
      role: string;
      invitant: string;
      email: string;
      emailMasque: string;
    };

async function invitationDuJeton(db: Firestore, jeton: string) {
  const r = await db
    .collection(collections.invitations)
    .where('jetonHash', '==', empreinteJeton(jeton))
    .limit(1)
    .get();
  return r.docs[0];
}

/**
 * Page `/pro/invitation` (INV-01 à 03) : entreprise, rôle et invitant d'un lien valide ; sinon
 * l'entreprise seule, pour « Demander une nouvelle invitation ». `email` n'est lu que par le serveur.
 */
export async function apercuInvitation(
  db: Firestore,
  jeton: string,
  maintenant: number,
): Promise<ApercuInvitation> {
  const d = await invitationDuJeton(db, jeton);
  if (!d) return { etat: 'introuvable' };
  const inv = d.data();
  const artisan = (await db.doc(chemins.artisan(inv.artisanId as string)).get()).data() ?? {};
  const nomCommercial = (artisan.nomCommercial as string | undefined) ?? '';
  const valide = inv.statut === 'envoyee' && (inv.expireLe as Timestamp).toMillis() > maintenant;
  if (!valide) return { etat: 'expiree', artisanId: inv.artisanId as string, nomCommercial };
  const invitant = (await db.doc(chemins.user(inv.invitePar as string)).get()).get('nomAffiche');
  return {
    etat: 'valide',
    artisanId: inv.artisanId as string,
    nomCommercial,
    ville: (artisan.adresseSiege?.ville as string | undefined) ?? '',
    role: inv.role as string,
    invitant: (invitant as string | undefined) ?? 'Un membre de l’équipe',
    email: inv.email as string,
    emailMasque: masquerEmail(inv.email as string),
  };
}

/**
 * Accès d'une personne invitée sans compte : le lien reçu à cette adresse prouve l'email, le
 * compte est donc créé vérifié. Adresse déjà inscrite : se connecter (aucune modification).
 */
export async function creerCompteInvite(
  s: ServicesComptes,
  e: z.output<typeof entreeCompteInvite>,
): Promise<{ email: string }> {
  const a = await apercuInvitation(s.db, e.jeton, s.horloge());
  if (a.etat !== 'valide')
    throw new ErreurMetier('INTROUVABLE', 'Ce lien d’invitation n’est plus valable.');
  if (await s.auth.getUserByEmail(a.email).catch(() => null))
    throw new ErreurMetier('CONFLIT', 'Un compte existe déjà avec cette adresse : connectez-vous.');
  await s.auth.createUser({
    email: a.email,
    emailVerified: true,
    password: e.motDePasse,
    displayName: e.nom,
  });
  return { email: a.email };
}
