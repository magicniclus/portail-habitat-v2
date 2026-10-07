import { masquerEmail } from '@ph/core/equipe';
import { ErreurMetier } from '@ph/core/erreurs';
import { slugifier } from '@ph/core/format';
import { encoderGeohash } from '@ph/core/geo';
import { artisan, portefeuille } from '@ph/core/schemas';

import { FieldValue } from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';
import { publierFiche } from '../annuaire/publication';
import { synchroniserClaims } from '../comptes/claims';
import { rechercherEntreprise } from '../comptes/entreprises';
import { empreinteJeton, JOUR_MS, nouveauJeton, type ServicesComptes } from '../comptes/services';
import { convertisseur } from '../depot';
import { auditerAdmin } from './audit';

/**
 * Back-office › Artisans, actions sur l'entreprise (ADMIN §2.3, COMPTES §3.5 et §4.8) :
 * création non revendiquée, invitation de revendication, transfert de propriété assisté,
 * suppression définitive, recalcul de la fiche publique. Chaque action est auditée.
 */
type Services = ServicesComptes & { fetch?: typeof fetch };
const DUREE_INVITATION_MS = 7 * JOUR_MS;

/** `adminCreerEntreprise` : SIREN obligatoire, aucun membre, hors ligne tant qu'elle n'est pas revendiquée. */
export async function creerEntrepriseAdmin(
  s: Services,
  e: {
    acteurUid: string;
    siren: string;
    metierPrincipal: string;
    metiers: string[];
    rayonKm: number;
    emailDirigeant?: string;
    motif: string;
  },
): Promise<{ artisanId: string }> {
  const trouvee = (await rechercherEntreprise(s, e.siren)).find(
    (x) => x.entreprise.siren === e.siren,
  );
  if (!trouvee) throw new ErreurMetier('INTROUVABLE', 'Aucune entreprise trouvée pour ce SIREN.');
  if (trouvee.artisanId) throw new ErreurMetier('CONFLIT', 'Cette entreprise est déjà présente.');
  if (trouvee.analyse.refusee)
    throw new ErreurMetier('PRECONDITION', 'Cette entreprise est fermée.');
  const ent = trouvee.entreprise;
  const geo = ent.adresse.geo;
  if (!geo)
    throw new ErreurMetier(
      'PRECONDITION',
      'L’adresse du siège n’a pas de coordonnées : impossible de situer la zone.',
    );
  const maintenant = new Date(s.horloge());
  const artisanId = s.db.collection(collections.artisans).doc().id;
  const nomCommercial = ent.nomCommercial ?? ent.raisonSociale;
  const base = slugifier(nomCommercial, ent.adresse.ville);
  await s.db.runTransaction(async (tx) => {
    const refIndex = s.db.collection(collections.sirenIndex).doc(e.siren);
    if ((await tx.get(refIndex)).exists)
      throw new ErreurMetier('CONFLIT', 'Cette entreprise est déjà présente.');
    const pris = await tx.get(
      s.db.collection(collections.artisans).where('slug', '==', base).limit(1),
    );
    tx.set(refIndex, { schemaVersion: 1, artisanId, createdAt: maintenant });
    tx.set(s.db.doc(chemins.artisan(artisanId)).withConverter(convertisseur(artisan)), {
      schemaVersion: 1,
      createdAt: maintenant,
      updatedAt: maintenant,
      raisonSociale: ent.raisonSociale,
      nomCommercial,
      slug: pris.empty ? base : `${base}-${e.siren.slice(-4)}`,
      siren: ent.siren,
      siret: ent.siret,
      ...(ent.codeNaf ? { codeNaf: ent.codeNaf } : {}),
      adresseSiege: {
        ligne1: ent.adresse.ligne1,
        codePostal: ent.adresse.codePostal,
        ville: ent.adresse.ville,
        pays: 'FR',
        geo,
      },
      metiers: e.metiers,
      metierPrincipal: e.metierPrincipal,
      intentions: [],
      tags: [],
      pitch: '',
      description: '',
      labels: [],
      labelsVerifies: {},
      zoneIntervention: {
        centre: geo,
        geohash: encoderGeohash(geo.latitude, geo.longitude),
        rayonKm: e.rayonKm,
        communes: [],
        rayonAccepteLe: maintenant,
      },
      source: 'admin',
      demandeOfferteUtilisee: false,
      plan: 'gratuit',
      optionVisibilite: false,
      verification: { statut: 'a_faire' },
      noteMoyenne: 0,
      nbAvis: 0,
      notesCriteres: {},
      quotaDemandesMois: 0,
      demandesRecuesMois: 0,
      completude: 0,
      enLigne: false,
      avertissements: 0,
      statut: 'actif',
      onboarding: { etape: 1 },
      nbMembres: 0,
      siegesMax: 1,
      origine: 'admin',
      revendiquee: false,
    });
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
    auditerAdmin(
      s.db,
      {
        acteurUid: e.acteurUid,
        action: 'adminCreerEntreprise',
        cible: chemins.artisan(artisanId),
        apres: { siren: e.siren },
        motif: e.motif,
      },
      s.horloge(),
      tx,
    );
  });
  if (e.emailDirigeant)
    await inviterRevendicationAdmin(s, {
      acteurUid: e.acteurUid,
      artisanId,
      email: e.emailDirigeant,
      motif: e.motif,
    });
  return { artisanId };
}

/** Invitation de revendication (rôle propriétaire) envoyée au dirigeant d'une entreprise non revendiquée. */
export async function inviterRevendicationAdmin(
  s: Services,
  e: { acteurUid: string; artisanId: string; email: string; motif: string },
): Promise<void> {
  const email = e.email.trim().toLowerCase();
  const maintenant = new Date(s.horloge());
  const jeton = (s.jeton ?? nouveauJeton)();
  const ref = s.db.collection(collections.invitations).doc();
  const a = await s.db.runTransaction(async (tx) => {
    const a = (await tx.get(s.db.doc(chemins.artisan(e.artisanId)))).data();
    if (!a || a.statut === 'supprime') throw new ErreurMetier('INTROUVABLE');
    if (a.revendiquee)
      throw new ErreurMetier('CONFLIT', 'Cette entreprise a déjà un propriétaire.');
    tx.set(ref, {
      schemaVersion: 1,
      createdAt: maintenant,
      artisanId: e.artisanId,
      email,
      role: 'proprietaire',
      revendication: true,
      invitePar: e.acteurUid,
      jetonHash: empreinteJeton(jeton),
      statut: 'envoyee',
      expireLe: new Date(maintenant.getTime() + DUREE_INVITATION_MS),
    });
    auditerAdmin(
      s.db,
      {
        acteurUid: e.acteurUid,
        action: 'adminInviterRevendication',
        cible: chemins.artisan(e.artisanId),
        apres: { email: masquerEmail(email) },
        motif: e.motif,
      },
      s.horloge(),
      tx,
    );
    return a;
  });
  await s.notifier({
    modele: 'invitation-membre',
    destinataire: { email, artisanId: e.artisanId },
    refObjet: `invitations/${ref.id}`,
    variante: empreinteJeton(jeton).slice(0, 12),
    donnees: {
      nomCommercial: a.nomCommercial as string,
      ville: (a.adresseSiege as { ville?: string } | undefined)?.ville ?? '',
      invitant: 'L’équipe Portail Habitat',
      role: 'proprietaire',
      emailMasque: masquerEmail(email),
      expireLe: new Intl.DateTimeFormat('fr-FR', {
        dateStyle: 'long',
        timeZone: 'Europe/Paris',
      }).format(new Date(maintenant.getTime() + DUREE_INVITATION_MS)),
    },
    secrets: { lien: `/pro/invitation?t=${jeton}` },
  });
}

/**
 * `adminTransfererPropriete` (propriétaire injoignable, Kbis à jour vérifié par le support) :
 * le nouveau propriétaire est un membre actif ; l'ancien, s'il est encore membre, devient gérant.
 */
export async function transfererProprieteAdmin(
  s: Services,
  e: { acteurUid: string; artisanId: string; uid: string; motif: string },
): Promise<void> {
  const ancien = await s.db.runTransaction(async (tx) => {
    const refArtisan = s.db.doc(chemins.artisan(e.artisanId));
    const a = (await tx.get(refArtisan)).data();
    if (!a || a.statut === 'supprime') throw new ErreurMetier('INTROUVABLE');
    const cible = await tx.get(s.db.doc(chemins.membre(e.artisanId, e.uid)));
    if (cible.get('statut') !== 'actif')
      throw new ErreurMetier(
        'PRECONDITION',
        'Le nouveau propriétaire doit être un membre actif de l’entreprise.',
      );
    const ancien = a.proprietaireUid as string | undefined;
    if (ancien === e.uid)
      throw new ErreurMetier('PRECONDITION', 'Cette personne est déjà propriétaire.');
    const refAncien = ancien ? s.db.doc(chemins.membre(e.artisanId, ancien)) : null;
    const ancienMembre = refAncien ? await tx.get(refAncien) : null;
    tx.update(cible.ref, { role: 'proprietaire' });
    if (ancienMembre?.exists) tx.update(ancienMembre.ref, { role: 'gerant' });
    tx.update(refArtisan, {
      proprietaireUid: e.uid,
      revendiquee: true,
      updatedAt: new Date(s.horloge()),
    });
    auditerAdmin(
      s.db,
      {
        acteurUid: e.acteurUid,
        action: 'adminTransfererPropriete',
        cible: chemins.artisan(e.artisanId),
        avant: { proprietaireUid: ancien ?? null },
        apres: { proprietaireUid: e.uid },
        motif: e.motif,
      },
      s.horloge(),
      tx,
    );
    return ancienMembre?.exists ? ancien : undefined;
  });
  await synchroniserClaims(s, e.uid, e.artisanId);
  if (ancien) await synchroniserClaims(s, ancien, e.artisanId);
}

/**
 * Suppression définitive (permission `artisans.supprimer`, double confirmation) : fiche retirée,
 * membres retirés et déconnectés, coordonnées effacées, SIREN libéré ; factures et avis conservés.
 */
export async function supprimerEntrepriseAdmin(
  s: Services,
  e: { acteurUid: string; artisanId: string; confirmation: string; motif: string },
): Promise<void> {
  const maintenant = new Date(s.horloge());
  const membres = await s.db.runTransaction(async (tx) => {
    const refArtisan = s.db.doc(chemins.artisan(e.artisanId));
    const a = (await tx.get(refArtisan)).data();
    if (!a || a.statut === 'supprime') throw new ErreurMetier('INTROUVABLE');
    if (e.confirmation !== a.nomCommercial)
      throw new ErreurMetier('ENTREE_INVALIDE', 'Saisissez exactement le nom de l’entreprise.');
    const docs = await tx.get(s.db.collection(chemins.membres(e.artisanId)));
    tx.update(refArtisan, {
      statut: 'supprime',
      enLigne: false,
      nbMembres: 0,
      telephonePublic: FieldValue.delete(),
      emailContact: FieldValue.delete(),
      siteWeb: FieldValue.delete(),
      deletedAt: maintenant,
      updatedAt: maintenant,
    });
    tx.delete(s.db.doc(chemins.artisanPublic(e.artisanId)));
    tx.delete(s.db.collection(collections.sirenIndex).doc(a.siren as string));
    docs.docs.forEach((d) => tx.delete(d.ref));
    auditerAdmin(
      s.db,
      {
        acteurUid: e.acteurUid,
        action: 'adminSupprimerEntreprise',
        cible: chemins.artisan(e.artisanId),
        avant: { statut: a.statut as string },
        apres: { statut: 'supprime' },
        motif: e.motif,
      },
      s.horloge(),
      tx,
    );
    return docs.docs.map((d) => d.id);
  });
  for (const m of membres) {
    await s.auth.revokeRefreshTokens(m).catch(() => undefined);
    await synchroniserClaims(s, m, e.artisanId);
  }
}

/** Recalcul forcé de `artisansPublic/{id}` (même règle que le déclencheur `projeterArtisan`). */
export async function recalculerFicheAdmin(
  s: Pick<Services, 'db' | 'horloge'>,
  e: { acteurUid: string; artisanId: string },
): Promise<string> {
  const r = await publierFiche(s, e.artisanId);
  await auditerAdmin(
    s.db,
    {
      acteurUid: e.acteurUid,
      action: 'adminRecalculerFiche',
      cible: chemins.artisan(e.artisanId),
      apres: { statut: r.statut },
    },
    s.horloge(),
  );
  return r.statut === 'invalide'
    ? `Fiche privée invalide : ${r.erreur}`
    : r.statut === 'publiee'
      ? 'Fiche publique recalculée.'
      : 'Fiche retirée de l’annuaire (hors ligne).';
}
