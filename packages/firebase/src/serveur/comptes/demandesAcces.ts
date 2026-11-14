import { ErreurMetier } from '@ph/core/erreurs';
import type { entreeDemanderAcces, entreeRepondreDemandeAcces } from '@ph/core/schemas';
import type { z } from '@ph/core/zod';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';
import { nouvelUtilisateur } from './utilisateurs';
import { exigerPermission, lireEntreprise } from './acces';
import { synchroniserClaims } from './claims';
import { nouveauMembre } from './membres-outils';
import { JOUR_MS, type ServicesComptes } from './services';

const DUREE_DEMANDE_ACCES_MS = 14 * JOUR_MS;

/**
 * « Cette entreprise a déjà un compte » → demander à rejoindre (COMPTES §4.4). Le propriétaire et les
 * gérants sont prévenus par uid : le demandeur ne voit jamais leur email.
 */
/**
 * Nom affiché du demandeur ; compte créé depuis le navigateur sans profil : profil créé avec le nom
 * du compte (le propriétaire doit savoir qui demande).
 */
async function nomDuDemandeur(s: ServicesComptes, uid: string, maintenant: Date): Promise<string> {
  const ref = s.db.doc(chemins.user(uid));
  const nom = (await ref.get()).get('nomAffiche') as string | undefined;
  if (nom) return nom;
  const compte = await s.auth.getUser(uid);
  const nomCompte = compte.displayName?.trim().slice(0, 80);
  if (!(await ref.get()).exists && compte.email)
    await ref.set({
      ...nouvelUtilisateur({
        email: compte.email,
        roles: [],
        origine: 'inscription',
        fournisseurs: ['password'],
        emailVerifie: compte.emailVerified,
        maintenant,
      }),
      ...(nomCompte ? { nomAffiche: nomCompte } : {}),
    });
  return nomCompte || 'Une personne';
}

export async function demanderAcces(
  s: ServicesComptes,
  uid: string,
  e: z.output<typeof entreeDemanderAcces>,
): Promise<{ demandeId: string }> {
  const maintenant = new Date(s.horloge());
  const ref = s.db.collection(collections.demandesAcces).doc();
  const demandeur = await nomDuDemandeur(s, uid, maintenant);
  const { nomCommercial } = await s.db.runTransaction(async (tx) => {
    const entreprise = await lireEntreprise(s, tx, e.artisanId);
    if ((await tx.get(s.db.doc(chemins.membre(e.artisanId, uid)))).exists)
      throw new ErreurMetier('CONFLIT', 'Vous faites déjà partie de cette équipe.');
    const ouvertes = await tx.get(
      s.db
        .collection(collections.demandesAcces)
        .where('artisanId', '==', e.artisanId)
        .where('demandeurUid', '==', uid)
        .where('statut', '==', 'ouverte'),
    );
    if (!ouvertes.empty) throw new ErreurMetier('CONFLIT', 'Votre demande est déjà en attente.');
    tx.set(ref, {
      schemaVersion: 1,
      createdAt: maintenant,
      artisanId: e.artisanId,
      demandeurUid: uid,
      ...(e.message ? { message: e.message } : {}),
      statut: 'ouverte',
      expireLe: Timestamp.fromMillis(maintenant.getTime() + DUREE_DEMANDE_ACCES_MS),
    });
    return entreprise;
  });
  const responsables = await s.db
    .collection(chemins.membres(e.artisanId))
    .where('role', 'in', ['proprietaire', 'gerant'])
    .where('statut', '==', 'actif')
    .get();
  await Promise.all(
    responsables.docs.map((d) =>
      s.notifier({
        modele: 'demande-acces',
        destinataire: { uid: d.id, artisanId: e.artisanId },
        refObjet: `demandesAcces/${ref.id}`,
        donnees: {
          nomCommercial,
          demandeur,
          ...(e.message ? { message: e.message } : {}),
          lien: '/pro/equipe',
        },
        titreInApp: 'Demande pour rejoindre votre équipe',
      }),
    ),
  );
  return { demandeId: ref.id };
}

export async function repondreDemandeAcces(
  s: ServicesComptes,
  uid: string,
  e: z.output<typeof entreeRepondreDemandeAcces>,
): Promise<void> {
  const maintenant = new Date(s.horloge());
  const ref = s.db.collection(collections.demandesAcces).doc(e.demandeId);
  const { demandeur, nomCommercial } = await s.db.runTransaction(async (tx) => {
    const d = (await tx.get(ref)).data();
    if (!d || d.artisanId !== e.artisanId || d.statut !== 'ouverte')
      throw new ErreurMetier('INTROUVABLE');
    if ((d.expireLe as Timestamp).toMillis() <= maintenant.getTime())
      throw new ErreurMetier('INTROUVABLE', 'Cette demande a expiré.');
    await exigerPermission(s, tx, e.artisanId, uid, 'membres.gerer', e.role);
    const entreprise = await lireEntreprise(s, tx, e.artisanId);
    if (e.accepter) {
      if (entreprise.nbMembres >= entreprise.siegesMax)
        throw new ErreurMetier('PRECONDITION', 'Tous les sièges de votre formule sont occupés.');
      tx.set(
        s.db.doc(chemins.membre(e.artisanId, d.demandeurUid as string)),
        nouveauMembre({ role: e.role!, ajoutePar: uid, maintenant }),
      );
      tx.update(s.db.doc(chemins.artisan(e.artisanId)), {
        nbMembres: FieldValue.increment(1),
        updatedAt: maintenant,
      });
    }
    tx.update(ref, {
      statut: e.accepter ? 'acceptee' : 'refusee',
      traitePar: uid,
      updatedAt: maintenant,
    });
    return { demandeur: d.demandeurUid as string, nomCommercial: entreprise.nomCommercial };
  });
  if (e.accepter) await synchroniserClaims(s, demandeur, e.artisanId);
  await s.notifier({
    modele: 'demande-acces-reponse',
    destinataire: { uid: demandeur, artisanId: e.artisanId },
    refObjet: `demandesAcces/${e.demandeId}`,
    donnees: {
      nomCommercial,
      acceptee: e.accepter,
      ...(e.role ? { role: e.role } : {}),
      lien: '/pro',
    },
  });
}
