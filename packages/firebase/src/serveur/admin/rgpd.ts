import { echeanceRgpd } from '@ph/core/admin';
import { masquerEmail } from '@ph/core/equipe';
import { ErreurMetier } from '@ph/core/erreurs';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';
import type { ServicesComptes } from '../comptes/services';
import { exporterMesDonnees, supprimerCompteParticulier } from '../espace/actions';
import { auditerAdmin } from './audit';

/** Back-office › RGPD (ADMIN §2.13, maquette « Admin RGPD »). */

export type TypeRgpd = 'acces' | 'rectification' | 'effacement' | 'opposition' | 'portabilite';

export interface DemandeRgpdAdmin {
  id: string;
  type: TypeRgpd;
  emailMasque: string;
  recueLe: number;
  echeance: number;
  statut: 'a_traiter' | 'traite';
  aUnCompte: boolean;
  preuve: string | null;
}

const ms = (t: unknown) => (t as Timestamp | undefined)?.toMillis() ?? 0;

export async function listerRgpdAdmin(db: Firestore): Promise<DemandeRgpdAdmin[]> {
  const col = db.collection(collections.rgpdDemandes);
  const [ouvertes, traitees] = await Promise.all([
    col.where('statut', '==', 'a_traiter').orderBy('echeance').limit(50).get(),
    col.where('statut', '==', 'traite').orderBy('updatedAt', 'desc').limit(20).get(),
  ]);
  return [...ouvertes.docs, ...traitees.docs].map((d) => ({
    id: d.id,
    type: d.get('type') as TypeRgpd,
    emailMasque: masquerEmail(d.get('email') as string),
    recueLe: ms(d.get('recueLe')),
    echeance: ms(d.get('echeance')),
    statut: d.get('statut') as DemandeRgpdAdmin['statut'],
    aUnCompte: Boolean(d.get('demandeurUid')),
    preuve: (d.get('preuveStoragePath') as string | undefined) ?? null,
  }));
}

/** Demande reçue (email, courrier) enregistrée par l'équipe ; l'échéance légale est d'un mois. */
export async function enregistrerDemandeRgpdAdmin(
  s: Pick<ServicesComptes, 'db' | 'auth' | 'horloge'>,
  e: { acteurUid: string; type: TypeRgpd; email: string; recueLe: number },
): Promise<string> {
  const email = e.email.trim().toLowerCase();
  const uid = await s.auth.getUserByEmail(email).then(
    (u) => u.uid,
    () => undefined,
  );
  const ref = s.db.collection(collections.rgpdDemandes).doc();
  const t0 = Timestamp.fromMillis(s.horloge());
  await ref.create({
    schemaVersion: 1,
    createdAt: t0,
    updatedAt: t0,
    type: e.type,
    ...(uid ? { demandeurUid: uid } : {}),
    email,
    recueLe: Timestamp.fromMillis(e.recueLe),
    echeance: Timestamp.fromMillis(echeanceRgpd(e.recueLe)),
    statut: 'a_traiter',
  });
  await auditerAdmin(
    s.db,
    {
      acteurUid: e.acteurUid,
      action: 'adminEnregistrerRgpd',
      cible: ref.path,
      apres: { type: e.type },
    },
    s.horloge(),
  );
  return ref.id;
}

/**
 * `adminTraiterRgpd` : export des données (accès, portabilité), anonymisation du compte
 * particulier (effacement), ou constat (rectification, opposition) ; preuve de traitement
 * archivée dans Storage, demande close, audit.
 */
export async function traiterRgpdAdmin(
  s: ServicesComptes & { ecrire: (chemin: string, contenu: string) => Promise<void> },
  e: { acteurUid: string; id: string; motif: string },
): Promise<{ export: string | null }> {
  const ref = s.db.collection(collections.rgpdDemandes).doc(e.id);
  const d = await ref.get();
  if (!d.exists) throw new ErreurMetier('INTROUVABLE');
  if (d.get('statut') !== 'a_traiter') throw new ErreurMetier('CONFLIT', 'Demande déjà traitée.');
  const type = d.get('type') as TypeRgpd;
  const uid = d.get('demandeurUid') as string | undefined;
  const actions: string[] = [];
  let exportChemin: string | null = null;
  if (type === 'acces' || type === 'portabilite') {
    if (!uid)
      throw new ErreurMetier('PRECONDITION', 'Aucun compte pour cet email : rien à exporter.');
    exportChemin = `rgpd/${e.id}/export.json`;
    await s.ecrire(exportChemin, JSON.stringify(await exporterMesDonnees(s.db, uid), null, 2));
    actions.push('export généré');
  }
  if (type === 'effacement' && uid) {
    const entreprises =
      ((await s.db.doc(chemins.user(uid)).get()).get('entreprises') as string[] | undefined) ?? [];
    if (entreprises.length)
      throw new ErreurMetier(
        'PRECONDITION',
        'Compte artisan : la suppression se fait depuis la fiche de l’entreprise.',
      );
    await supprimerCompteParticulier(s, uid);
    actions.push('compte particulier anonymisé, demandes en cours annulées');
  }
  if (!actions.length) actions.push('traitement constaté');
  const t0 = Timestamp.fromMillis(s.horloge());
  const preuve = `rgpd/${e.id}/preuve.json`;
  await s.ecrire(
    preuve,
    JSON.stringify(
      {
        demande: e.id,
        type,
        recueLe: d.get('recueLe').toDate(),
        traiteLe: t0.toDate(),
        traitePar: e.acteurUid,
        actions,
        motif: e.motif,
      },
      null,
      2,
    ),
  );
  await ref.update({
    statut: 'traite',
    traitePar: e.acteurUid,
    preuveStoragePath: preuve,
    updatedAt: t0,
  });
  await auditerAdmin(
    s.db,
    {
      acteurUid: e.acteurUid,
      action: 'adminTraiterRgpd',
      cible: ref.path,
      avant: { statut: 'a_traiter' },
      apres: { statut: 'traite', actions },
      motif: e.motif,
    },
    s.horloge(),
  );
  return { export: exportChemin };
}
