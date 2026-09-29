import { createHash } from 'node:crypto';
import { ErreurMetier } from '@ph/core/erreurs';
import {
  derniersStatutsDocuments,
  doitPasserEnLigne,
  type StatutDocument,
} from '@ph/core/espace-pro';
import { peut, type Membre } from '@ph/core/equipe';
import type { entreeDocument } from '@ph/core/schemas';
import type { z } from '@ph/core/zod';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import type { bucketFichiers } from '../../admin';
import { chemins, fichiers } from '../../chemins';

type Bucket = ReturnType<typeof bucketFichiers>;

const MIMES = ['application/pdf', 'image/jpeg', 'image/png'] as const;
const TAILLE_MAX = 10 * 1024 * 1024;

export interface DocumentPro {
  id: string;
  type: string;
  nomFichier: string;
  statut: StatutDocument;
  deposeLe: number;
  motifRefus?: string;
}

/** Documents de l'entreprise, les plus récents d'abord (sans lien de téléchargement). */
export async function lireDocumentsPro(db: Firestore, artisanId: string): Promise<DocumentPro[]> {
  const r = await db.collection(chemins.documents(artisanId)).get();
  return r.docs
    .map((d) => ({
      id: d.id,
      type: d.get('type') as string,
      nomFichier: d.get('nomFichier') as string,
      statut: d.get('statut') as StatutDocument,
      deposeLe: (d.get('createdAt') as Timestamp).toMillis(),
      ...(d.get('motifRefus') ? { motifRefus: d.get('motifRefus') as string } : {}),
    }))
    .sort((a, b) => b.deposeLe - a.deposeLe);
}

/**
 * Enregistre un document déjà déposé dans Storage : le serveur relit le fichier (type, taille,
 * empreinte SHA-256), crée `documents/{docId}` en attente de vérification, puis met la fiche en
 * ligne si COMPTES §3 le permet (SIREN vérifié ou Kbis, et décennale envoyés).
 */
export async function enregistrerDocument(
  s: { db: Firestore; bucket: Bucket; horloge: () => number },
  ctx: { artisanId: string; uid: string },
  e: z.output<typeof entreeDocument>,
): Promise<{ enLigne: boolean }> {
  const fichier = s.bucket.file(fichiers.document(ctx.artisanId, e.docId, e.nomFichier));
  const [existe] = await fichier.exists();
  if (!existe) throw new ErreurMetier('INTROUVABLE', 'Fichier introuvable : renvoyez-le.');
  const [meta] = await fichier.getMetadata();
  const mime = meta.contentType as (typeof MIMES)[number];
  const taille = Number(meta.size);
  if (!MIMES.includes(mime) || !(taille > 0 && taille <= TAILLE_MAX))
    throw new ErreurMetier('ENTREE_INVALIDE', 'PDF, JPEG ou PNG de 10 Mo au plus.');
  const [contenu] = await fichier.download();
  const sha256 = createHash('sha256').update(contenu).digest('hex');

  const refArtisan = s.db.doc(chemins.artisan(ctx.artisanId));
  const refDoc = s.db.doc(`${chemins.documents(ctx.artisanId)}/${e.docId}`);
  return s.db.runTransaction(async (t) => {
    const [m, a, docs] = await Promise.all([
      t.get(s.db.doc(chemins.membre(ctx.artisanId, ctx.uid))),
      t.get(refArtisan),
      t.get(s.db.collection(chemins.documents(ctx.artisanId))),
    ]);
    if (!peut(m.data() as Membre | undefined, 'documents.televerser'))
      throw new ErreurMetier('PERMISSION_REFUSEE');
    if (!a.exists) throw new ErreurMetier('INTROUVABLE');
    if (docs.docs.some((d) => d.id === e.docId))
      throw new ErreurMetier('CONFLIT', 'Ce document est déjà enregistré.');
    const maintenant = s.horloge();
    t.create(refDoc, {
      schemaVersion: 1,
      type: e.type,
      storagePath: fichier.name,
      nomFichier: e.nomFichier,
      mime,
      tailleOctets: taille,
      sha256,
      statut: 'en_attente',
      createdAt: Timestamp.fromMillis(maintenant),
    });
    const documents = derniersStatutsDocuments([
      ...docs.docs.map((d) => ({
        type: d.get('type') as string,
        statut: d.get('statut') as StatutDocument,
        le: (d.get('createdAt') as Timestamp).toMillis(),
      })),
      { type: e.type, statut: 'en_attente', le: maintenant },
    ]);
    const enLigne = doitPasserEnLigne({
      enLigne: a.get('enLigne') === true,
      statut: a.get('statut') as string,
      // SIREN vérifié à l'inscription (API Recherche d'entreprises) ou par un modérateur.
      sirenVerifie: a.get('origine') === 'onboarding' || a.get('verification.statut') === 'verifie',
      documents,
    });
    if (enLigne)
      t.update(refArtisan, { enLigne: true, updatedAt: Timestamp.fromMillis(maintenant) });
    return { enLigne: enLigne || a.get('enLigne') === true };
  });
}
