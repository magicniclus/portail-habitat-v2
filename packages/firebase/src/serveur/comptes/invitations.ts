import { ErreurMetier } from '@ph/core/erreurs';
import { masquerEmail, siegesDisponibles } from '@ph/core/equipe';
import type {
  entreeAccepterInvitation,
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

export async function inviterMembre(
  s: ServicesComptes,
  uid: string,
  e: z.output<typeof entreeInviterMembre>,
): Promise<{ invitationId: string }> {
  const maintenant = new Date(s.horloge());
  const jeton = (s.jeton ?? nouveauJeton)();
  const existant = await s.auth.getUserByEmail(e.email).catch(() => null);
  const ref = refInvitations(s.db).doc();

  const nomCommercial = await s.db.runTransaction(async (tx) => {
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
    return entreprise.nomCommercial;
  });

  await s.notifier({
    modele: 'invitation-equipe',
    destinataire: { email: e.email, artisanId: e.artisanId },
    donnees: { nomCommercial, role: e.role, lien: lienInvitation(jeton) },
    cleIdempotence: `invitation:${ref.id}:${empreinteJeton(jeton).slice(0, 12)}`,
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
  const { email, nomCommercial, role } = await s.db.runTransaction(async (tx) => {
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
    return {
      email: inv.email as string,
      role: inv.role as string,
      nomCommercial: entreprise.nomCommercial,
    };
  });
  await s.notifier({
    modele: 'invitation-equipe',
    destinataire: { email, artisanId: e.artisanId },
    donnees: { nomCommercial, role, lien: lienInvitation(jeton) },
    cleIdempotence: `invitation:${e.invitationId}:${empreinteJeton(jeton).slice(0, 12)}`,
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

  const inv = await s.db.runTransaction(async (tx) => {
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
    return inv;
  });

  await rattacherProfil(s, uid, compte.email!, maintenant);
  await synchroniserClaims(s, uid, inv.artisanId as string);
  await s.notifier({
    modele: 'invitation-acceptee',
    destinataire: { uid: inv.invitePar as string, artisanId: inv.artisanId as string },
    donnees: { role: inv.role },
    cleIdempotence: `invitation-acceptee:${doc.id}`,
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
  return perimees.size;
}
