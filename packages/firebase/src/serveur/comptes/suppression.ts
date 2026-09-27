import { ErreurMetier } from '@ph/core/erreurs';
import { peutQuitter, type Membre } from '@ph/core/equipe';
import type { entreeFermerEntreprise } from '@ph/core/schemas';
import type { z } from '@ph/core/zod';
import { FieldValue } from 'firebase-admin/firestore';
import { chemins } from '../../chemins';
import { exigerPermission } from './acces';
import { synchroniserClaims } from './claims';
import type { ServicesComptes } from './services';

async function equipe(s: ServicesComptes, artisanId: string) {
  const docs = await s.db.collection(chemins.membres(artisanId)).get();
  return docs.docs.map((d) => ({ uid: d.id, ...(d.data() as Membre) }));
}

/**
 * Suppression du compte personnel (COMPTES §4.9) : bloquée pour le dernier propriétaire d'une
 * entreprise active ; sinon retrait de toutes les équipes, profil anonymisé, compte Auth supprimé.
 */
export async function supprimerMonCompte(s: ServicesComptes, uid: string): Promise<void> {
  const maintenant = new Date(s.horloge());
  const refUser = s.db.doc(chemins.user(uid));
  const entreprises = ((await refUser.get()).get('entreprises') as string[] | undefined) ?? [];
  for (const artisanId of entreprises) {
    const statut = (await s.db.doc(chemins.artisan(artisanId)).get()).get('statut');
    if (statut !== 'supprime' && !peutQuitter(await equipe(s, artisanId), uid))
      throw new ErreurMetier(
        'PRECONDITION',
        'Vous êtes le dernier propriétaire d’une entreprise : transférez la propriété ou fermez l’entreprise.',
      );
  }
  for (const artisanId of entreprises) {
    const ref = s.db.doc(chemins.membre(artisanId, uid));
    await s.db.runTransaction(async (tx) => {
      if (!(await tx.get(ref)).exists) return;
      tx.delete(ref);
      tx.update(s.db.doc(chemins.artisan(artisanId)), { nbMembres: FieldValue.increment(-1) });
    });
  }
  await refUser.set(
    {
      schemaVersion: 1,
      statut: 'supprime',
      email: `supprime-${uid}@anonyme.invalid`,
      emailVerifie: false,
      roles: [],
      entreprises: [],
      entrepriseActive: FieldValue.delete(),
      prenom: FieldValue.delete(),
      nom: FieldValue.delete(),
      nomAffiche: FieldValue.delete(),
      telephone: FieldValue.delete(),
      adresse: FieldValue.delete(),
      deletedAt: maintenant,
      updatedAt: maintenant,
    },
    { merge: true },
  );
  await s.auth.deleteUser(uid);
}

/**
 * Fermeture de l'entreprise (propriétaire, mot de passe et double authentification via l'enveloppe) :
 * fiche retirée, membres retirés et notifiés, factures et avis conservés. L'abonnement Stripe est
 * annulé en fin de période par le lot 11 (événement `entreprise_fermee`).
 */
export async function fermerEntreprise(
  s: ServicesComptes,
  uid: string,
  e: z.output<typeof entreeFermerEntreprise>,
): Promise<void> {
  const maintenant = new Date(s.horloge());
  const membres = await s.db.runTransaction(async (tx) => {
    await exigerPermission(s, tx, e.artisanId, uid, 'entreprise.fermer');
    const refArtisan = s.db.doc(chemins.artisan(e.artisanId));
    const a = (await tx.get(refArtisan)).data();
    if (!a || a.statut === 'supprime') throw new ErreurMetier('INTROUVABLE');
    if (e.confirmation !== a.nomCommercial)
      throw new ErreurMetier('ENTREE_INVALIDE', 'Saisissez exactement le nom de l’entreprise.');
    const docs = await tx.get(s.db.collection(chemins.membres(e.artisanId)));
    tx.update(refArtisan, {
      statut: 'supprime',
      enLigne: false,
      nbMembres: 1,
      deletedAt: maintenant,
      updatedAt: maintenant,
    });
    tx.delete(s.db.doc(chemins.artisanPublic(e.artisanId)));
    docs.docs.forEach((d) => tx.delete(d.ref));
    return docs.docs.map((d) => d.id);
  });
  for (const m of membres) {
    await s.auth.revokeRefreshTokens(m).catch(() => undefined);
    await synchroniserClaims(s, m, e.artisanId);
    await s.notifier({
      modele: 'entreprise-fermee',
      destinataire: { uid: m, artisanId: e.artisanId },
      donnees: {},
      cleIdempotence: `entreprise-fermee:${e.artisanId}:${m}`,
    });
  }
}
