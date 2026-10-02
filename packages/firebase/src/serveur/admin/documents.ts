import { ErreurMetier } from '@ph/core/erreurs';
import { LIBELLES_TYPE_DOCUMENT } from '@ph/core/espace-pro';
import { formatDate } from '@ph/core/format';
import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';
import type { Envoi } from '../notifications/notifier';
import { auditerAdmin } from './audit';

/**
 * `adminValiderDocument` (ADMIN §2.3, onglet Documents) : décision sur un document déposé.
 * Validé : label vérifié sur la fiche (décennale, RGE, Qualibat) avec sa date de fin ; refusé :
 * motif envoyé à l'artisan. La tâche de la file est close dans la même transaction.
 */

/** Documents qui ouvrent un label vérifié (`labelsVerifies.<cle>`). */
const LABELS: Record<string, string> = { decennale: 'decennale', rge: 'rge', qualibat: 'qualibat' };

export const idTacheDocument = (artisanId: string, documentId: string) =>
  `document-${artisanId}-${documentId}`;

export async function deciderDocumentAdmin(
  s: { db: Firestore; horloge: () => number; notifier: (e: Envoi) => Promise<unknown> },
  e: {
    acteurUid: string;
    artisanId: string;
    documentId: string;
    decision: 'valide' | 'refuse';
    /** Fin de validité lue sur le document (validation). */
    valideAu?: number;
    motif: string;
  },
): Promise<void> {
  const refDoc = s.db.doc(`${chemins.documents(e.artisanId)}/${e.documentId}`);
  const refArtisan = s.db.doc(chemins.artisan(e.artisanId));
  const refTache = s.db
    .collection(collections.filesModeration)
    .doc(idTacheDocument(e.artisanId, e.documentId));
  const t0 = Timestamp.fromMillis(s.horloge());
  const infos = await s.db.runTransaction(async (t) => {
    const [d, a, tache] = await Promise.all([t.get(refDoc), t.get(refArtisan), t.get(refTache)]);
    if (!d.exists || !a.exists) throw new ErreurMetier('INTROUVABLE');
    if (d.get('statut') !== 'en_attente')
      throw new ErreurMetier('CONFLIT', 'Ce document a déjà été traité.');
    const type = d.get('type') as string;
    const fin = e.valideAu !== undefined ? Timestamp.fromMillis(e.valideAu) : undefined;
    t.update(refDoc, {
      statut: e.decision,
      verifiePar: e.acteurUid,
      verifieLe: t0,
      ...(e.decision === 'valide' && fin ? { valideAu: fin } : {}),
      ...(e.decision === 'refuse' ? { motifRefus: e.motif } : {}),
    });
    const label = LABELS[type];
    if (e.decision === 'valide' && label)
      t.update(refArtisan, {
        [`labelsVerifies.${label}`]: {
          verifieLe: t0,
          docId: e.documentId,
          ...(fin ? { expireLe: fin } : {}),
        },
        ...(type === 'rge'
          ? {
              'rge.verifie': true,
              'rge.domaines': (a.get('rge.domaines') as string[] | undefined) ?? [],
              ...(fin ? { 'rge.expireLe': fin } : { 'rge.expireLe': FieldValue.delete() }),
            }
          : {}),
        updatedAt: t0,
      });
    if (tache.exists)
      t.update(refTache, {
        statut: 'traitee',
        resolution: e.decision === 'valide' ? 'Document validé' : `Refusé : ${e.motif}`,
        traiteePar: e.acteurUid,
        traiteeLe: t0,
      });
    auditerAdmin(
      s.db,
      {
        acteurUid: e.acteurUid,
        action: 'adminValiderDocument',
        cible: refDoc.path,
        avant: { statut: 'en_attente' },
        apres: { statut: e.decision },
        motif: e.motif,
      },
      s.horloge(),
      t,
    );
    return {
      type,
      deposeLe: (d.get('createdAt') as Timestamp).toMillis(),
      proprietaire: a.get('proprietaireUid') as string | undefined,
    };
  });
  if (infos.proprietaire)
    await s.notifier({
      modele: e.decision === 'valide' ? 'document-valide' : 'document-refuse',
      destinataire: { uid: infos.proprietaire, artisanId: e.artisanId },
      refObjet: refDoc.path,
      donnees: {
        document: LIBELLES_TYPE_DOCUMENT[infos.type] ?? infos.type,
        deposeLe: formatDate(infos.deposeLe),
        ...(e.decision === 'refuse' ? { motif: e.motif } : {}),
        lien: '/pro/fiche',
      },
    });
}

/** Note interne sur une fiche (ADMIN §4), jamais visible de l'artisan. */
export async function ajouterNoteAdmin(
  s: { db: Firestore; horloge: () => number },
  e: { acteurUid: string; cible: string; texte: string },
): Promise<void> {
  const t0 = Timestamp.fromMillis(s.horloge());
  await s.db.collection(collections.notesInternes).add({
    schemaVersion: 1,
    createdAt: t0,
    cible: e.cible,
    texte: e.texte,
    parUid: e.acteurUid,
    epingle: false,
  });
}
