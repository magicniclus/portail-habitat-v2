import { ErreurMetier } from '@ph/core/erreurs';
import { peut, peutQuitter, repartirSieges, type Membre, type RoleMembre } from '@ph/core/equipe';
import type { entreeMembre, entreeModifierMembre } from '@ph/core/schemas';
import type { z } from '@ph/core/zod';
import { FieldValue, type Timestamp } from 'firebase-admin/firestore';
import { chemins, GROUPE_ATTRIBUTIONS } from '../../chemins';
import { exigerPermission } from './acces';
import { synchroniserClaims } from './claims';
import type { ServicesComptes } from './services';

async function lireMembre(
  s: ServicesComptes,
  tx: FirebaseFirestore.Transaction,
  aid: string,
  uid: string,
) {
  const m = (await tx.get(s.db.doc(chemins.membre(aid, uid)))).data() as Membre | undefined;
  if (!m) throw new ErreurMetier('INTROUVABLE', 'Ce membre ne fait pas partie de l’équipe.');
  return m;
}

/** Rôle, métiers routés, droits ajoutés, plafond de crédits (COMPTES §4.1 et §4.7). */
export async function modifierMembre(
  s: ServicesComptes,
  uid: string,
  e: z.output<typeof entreeModifierMembre>,
): Promise<void> {
  await s.db.runTransaction(async (tx) => {
    const cible = await lireMembre(s, tx, e.artisanId, e.uid);
    const moi = await exigerPermission(s, tx, e.artisanId, uid, 'membres.gerer', cible.role);
    if (e.role && !peut(moi, 'membres.gerer', { roleCible: e.role }))
      throw new ErreurMetier('PERMISSION_REFUSEE');
    if (cible.role === 'proprietaire')
      throw new ErreurMetier(
        'PRECONDITION',
        'Le rôle du propriétaire change par un transfert de propriété.',
      );
    tx.update(s.db.doc(chemins.membre(e.artisanId, e.uid)), {
      ...(e.role ? { role: e.role } : {}),
      ...(e.metiers ? { metiers: e.metiers } : {}),
      ...(e.permissions ? { permissions: e.permissions } : {}),
      ...(e.plafondCreditsMois === null
        ? { plafondCreditsMois: FieldValue.delete() }
        : e.plafondCreditsMois !== undefined
          ? { plafondCreditsMois: e.plafondCreditsMois }
          : {}),
    });
  });
  if (e.role) await synchroniserClaims(s, e.uid, e.artisanId);
}

/**
 * Sortie de l'équipe (retrait ou départ) : document `membres` supprimé, demandes assignées remises à
 * « non assignées », jetons révoqués (ses écritures suivantes échouent), claims recalculés.
 */
async function sortir(s: ServicesComptes, artisanId: string, uid: string, maintenant: Date) {
  const assignees = await s.db
    .collectionGroup(GROUPE_ATTRIBUTIONS)
    .where('artisanId', '==', artisanId)
    .where('assigneA', '==', uid)
    .get();
  const lot = s.db.batch();
  assignees.docs.forEach((d) =>
    lot.update(d.ref, { assigneA: FieldValue.delete(), updatedAt: maintenant }),
  );
  if (!assignees.empty) await lot.commit();
  await s.auth.revokeRefreshTokens(uid).catch(() => undefined);
  await synchroniserClaims(s, uid, artisanId);
}

export async function retirerMembre(
  s: ServicesComptes,
  uid: string,
  e: z.output<typeof entreeMembre>,
): Promise<void> {
  if (e.uid === uid) throw new ErreurMetier('PRECONDITION', 'Utilisez « Quitter l’entreprise ».');
  const maintenant = new Date(s.horloge());
  await s.db.runTransaction(async (tx) => {
    const cible = await lireMembre(s, tx, e.artisanId, e.uid);
    await exigerPermission(s, tx, e.artisanId, uid, 'membres.gerer', cible.role);
    if (cible.role === 'proprietaire') throw new ErreurMetier('PERMISSION_REFUSEE');
    tx.delete(s.db.doc(chemins.membre(e.artisanId, e.uid)));
    tx.update(s.db.doc(chemins.artisan(e.artisanId)), {
      nbMembres: FieldValue.increment(-1),
      updatedAt: maintenant,
    });
  });
  await sortir(s, e.artisanId, e.uid, maintenant);
  await s.notifier({
    modele: 'membre-retire',
    destinataire: { uid: e.uid, artisanId: e.artisanId },
    donnees: {},
    cleIdempotence: `membre-retire:${e.artisanId}:${e.uid}:${maintenant.getTime()}`,
  });
}

/** Toujours possible, sauf pour le dernier propriétaire (COMPTES §4.8). */
export async function quitterEntreprise(
  s: ServicesComptes,
  uid: string,
  artisanId: string,
): Promise<void> {
  const maintenant = new Date(s.horloge());
  await s.db.runTransaction(async (tx) => {
    await lireMembre(s, tx, artisanId, uid);
    const equipe = await tx.get(s.db.collection(chemins.membres(artisanId)));
    const membres = equipe.docs.map((d) => ({ uid: d.id, ...(d.data() as Membre) }));
    if (!peutQuitter(membres, uid))
      throw new ErreurMetier(
        'PRECONDITION',
        'Vous êtes le dernier propriétaire : transférez la propriété ou fermez l’entreprise.',
      );
    tx.delete(s.db.doc(chemins.membre(artisanId, uid)));
    tx.update(s.db.doc(chemins.artisan(artisanId)), {
      nbMembres: FieldValue.increment(-1),
      updatedAt: maintenant,
    });
  });
  await sortir(s, artisanId, uid, maintenant);
}

/**
 * Transfert de propriété (COMPTES §4.8) : le destinataire est un membre actif avec la double
 * authentification ; l'ancien propriétaire devient gérant. Mot de passe ressaisi : option de l'enveloppe.
 */
export async function transfererPropriete(
  s: ServicesComptes,
  uid: string,
  e: z.output<typeof entreeMembre>,
): Promise<void> {
  if (e.uid === uid) throw new ErreurMetier('PRECONDITION', 'Choisissez un autre membre.');
  const maintenant = new Date(s.horloge());
  await s.db.runTransaction(async (tx) => {
    const moi = await exigerPermission(s, tx, e.artisanId, uid, 'propriete.transferer');
    if (moi.role !== 'proprietaire') throw new ErreurMetier('PERMISSION_REFUSEE');
    const cible = await lireMembre(s, tx, e.artisanId, e.uid);
    if (cible.statut !== 'actif')
      throw new ErreurMetier('PRECONDITION', 'Le nouveau propriétaire doit être un membre actif.');
    // Vérifié après la permission : un non-propriétaire n'apprend rien sur les autres membres.
    const destinataire = await s.auth.getUser(e.uid).catch(() => null);
    if (!destinataire?.multiFactor?.enrolledFactors.length)
      throw new ErreurMetier(
        'PRECONDITION',
        'Le nouveau propriétaire doit d’abord activer la double authentification.',
      );
    tx.update(s.db.doc(chemins.membre(e.artisanId, e.uid)), { role: 'proprietaire' });
    tx.update(s.db.doc(chemins.membre(e.artisanId, uid)), { role: 'gerant' });
    tx.update(s.db.doc(chemins.artisan(e.artisanId)), {
      proprietaireUid: e.uid,
      updatedAt: maintenant,
    });
  });
  await Promise.all([
    synchroniserClaims(s, uid, e.artisanId),
    synchroniserClaims(s, e.uid, e.artisanId),
  ]);
}

/**
 * Nouveau nombre de sièges (webhook Stripe, lot 11) : rien n'est supprimé ; les membres au-delà
 * passent en `suspendu`, le propriétaire garde toujours l'accès, la réactivation rend l'accès (§4.3).
 */
export async function appliquerSieges(
  s: ServicesComptes,
  artisanId: string,
  siegesMax: number,
  prioritaires: readonly string[] = [],
): Promise<{ actifs: string[]; suspendus: string[] }> {
  const equipe = await s.db.collection(chemins.membres(artisanId)).get();
  const membres = equipe.docs.map((d) => ({
    uid: d.id,
    role: d.get('role') as RoleMembre,
    statut: d.get('statut') as Membre['statut'],
    ajouteLe: (d.get('ajouteLe') as Timestamp).toMillis(),
  }));
  const r = repartirSieges(membres, siegesMax, prioritaires);
  const lot = s.db.batch();
  const change = membres.filter((m) => (m.statut === 'actif') !== r.actifs.includes(m.uid));
  for (const m of change)
    lot.update(s.db.doc(chemins.membre(artisanId, m.uid)), {
      statut: r.actifs.includes(m.uid) ? 'actif' : 'suspendu',
    });
  if (change.length) await lot.commit();
  await Promise.all(change.map((m) => synchroniserClaims(s, m.uid, artisanId)));
  return r;
}
