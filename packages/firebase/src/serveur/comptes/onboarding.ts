import { ErreurMetier } from '@ph/core/erreurs';
import { slugifier } from '@ph/core/format';
import { encoderGeohash } from '@ph/core/geo';
import type { entreeFinaliserOnboarding } from '@ph/core/schemas';
import {
  artisan,
  consentement,
  portefeuille,
  tacheModeration,
  utilisateur,
} from '@ph/core/schemas';
import type { z } from '@ph/core/zod';
import { FieldValue } from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';
import { convertisseur } from '../depot';
import { synchroniserClaims } from './claims';
import { nouveauMembre } from './membres-outils';
import type { ServicesComptes } from './services';
import { nouvelUtilisateur } from './utilisateurs';

type Entree = z.output<typeof entreeFinaliserOnboarding>;

/**
 * `finaliserOnboarding` (COMPTES §3.3), en une transaction : garde-fou `sirenIndex` contre les doubles clics
 * et les inscriptions concurrentes, entreprise, propriétaire, portefeuille, profil, consentement CGV,
 * tâche de modération. Puis claims, suppression du brouillon et email de bienvenue.
 */
export async function finaliserOnboarding(
  s: ServicesComptes,
  uid: string,
  e: Entree,
): Promise<{ artisanId: string; slug: string }> {
  const compte = await s.auth.getUser(uid);
  if (!compte.email)
    throw new ErreurMetier('PRECONDITION', 'Votre compte n’a pas d’adresse email.');
  const maintenant = new Date(s.horloge());
  const artisanId = s.db.collection(collections.artisans).doc().id;
  const refArtisan = s.db.doc(chemins.artisan(artisanId)).withConverter(convertisseur(artisan));
  const refIndex = s.db.collection(collections.sirenIndex).doc(e.entreprise.siren);
  const refUser = s.db.doc(chemins.user(uid));
  const base = slugifier(e.entreprise.nomCommercial, e.entreprise.adresseSiege.ville);

  const slug = await s.db.runTransaction(async (tx) => {
    if ((await tx.get(refIndex)).exists)
      throw new ErreurMetier('CONFLIT', 'Cette entreprise a déjà un compte.');
    const pris = await tx.get(
      s.db.collection(collections.artisans).where('slug', '==', base).limit(1),
    );
    const slug = pris.empty ? base : `${base}-${e.entreprise.siren.slice(-4)}`;
    const user = await tx.get(refUser);

    tx.set(refIndex, { schemaVersion: 1, artisanId, createdAt: maintenant });
    tx.set(refArtisan, {
      schemaVersion: 1,
      createdAt: maintenant,
      updatedAt: maintenant,
      ...e.entreprise,
      slug,
      metiers: e.metiers,
      metierPrincipal: e.metierPrincipal,
      intentions: e.intentions,
      tags: [],
      pitch: '',
      description: '',
      labels: [],
      labelsVerifies: {},
      zoneIntervention: {
        centre: e.zone.centre,
        geohash: encoderGeohash(e.zone.centre.latitude, e.zone.centre.longitude),
        rayonKm: e.zone.rayonKm,
        communes: [],
        rayonAccepteLe: maintenant,
      },
      source: 'direct',
      demandeOfferteUtilisee: false,
      ...(e.budgetMin !== undefined ? { budgetMin: e.budgetMin } : {}),
      plan: 'gratuit',
      optionVisibilite: false,
      verification: { statut: 'en_cours' },
      noteMoyenne: 0,
      nbAvis: 0,
      notesCriteres: {},
      quotaDemandesMois: 0,
      demandesRecuesMois: 0,
      completude: 0,
      enLigne: false,
      avertissements: 0,
      statut: 'actif',
      onboarding: { etape: 3, termineLe: maintenant },
      nbMembres: 1,
      siegesMax: 1,
      proprietaireUid: uid,
      origine: 'onboarding',
      revendiquee: true,
    });
    tx.set(
      s.db.doc(chemins.membre(artisanId, uid)),
      nouveauMembre({ role: 'proprietaire', ajoutePar: uid, maintenant }),
    );
    tx.set(
      s.db.doc(chemins.portefeuille(artisanId)),
      portefeuille.parse({
        schemaVersion: 1,
        soldeCredits: 0,
        creditsInclusMois: 0,
        creditsInclusRestants: 0,
        updatedAt: maintenant,
      }),
    );
    if (user.exists) {
      tx.update(refUser, {
        roles: FieldValue.arrayUnion('artisan'),
        entreprises: FieldValue.arrayUnion(artisanId),
        entrepriseActive: artisanId,
        updatedAt: maintenant,
      });
    } else {
      const profil = nouvelUtilisateur({
        email: compte.email!,
        roles: ['artisan'],
        origine: 'onboarding_pro',
        fournisseurs: compte.providerData.some((p) => p.providerId === 'google.com')
          ? ['google']
          : ['password'],
        emailVerifie: compte.emailVerified,
        maintenant,
      });
      tx.set(
        refUser,
        utilisateur.parse({ ...profil, entreprises: [artisanId], entrepriseActive: artisanId }),
      );
    }
    tx.set(
      s.db.collection(chemins.consentements(uid)).doc(),
      consentement.parse({
        schemaVersion: 1,
        type: 'cgv',
        valeur: true,
        version: e.cgvVersion,
        source: 'onboarding_pro',
        createdAt: maintenant,
      }),
    );
    tx.set(
      s.db.collection(collections.filesModeration).doc(),
      tacheModeration.parse({
        schemaVersion: 1,
        createdAt: maintenant,
        type: 'artisan_nouveau',
        refs: { artisanId },
        priorite: 3,
        statut: 'a_traiter',
        permissionRequise: 'artisans.verifier',
      }),
    );
    return slug;
  });

  await synchroniserClaims(s, uid, artisanId);
  if (e.brouillonId)
    await s.db.collection(collections.brouillonsOnboarding).doc(e.brouillonId).delete();
  await s.notifier({
    modele: 'bienvenue-artisan',
    destinataire: { uid, email: compte.email, artisanId },
    donnees: { nomCommercial: e.entreprise.nomCommercial },
    cleIdempotence: `bienvenue-artisan:${artisanId}`,
  });
  return { artisanId, slug };
}
