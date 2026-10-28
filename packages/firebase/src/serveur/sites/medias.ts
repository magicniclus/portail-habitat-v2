import { ErreurMetier } from '@ph/core/erreurs';
import type { entreeMediaSite } from '@ph/core/schemas';
import type { z } from '@ph/core/zod';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { urlPubliqueFichier, type bucketFichiers } from '../../admin';
import { chemins, fichiers } from '../../chemins';
import { exigerSite, type ContexteSite, type ServicesSites } from './edition';

/** Taille et types acceptés : mêmes limites que storage.rules (images 8 Mo, PDF 10 Mo). */
const LIMITES = {
  image: { mo: 8, type: /^image\/(jpeg|png|webp|avif)$/, message: 'Image JPEG, PNG ou WebP' },
  fichier: { mo: 10, type: /^application\/pdf$/, message: 'Fichier PDF' },
} as const;
/** Images importées lues pour l'éditeur (les plus récentes d'abord). */
const MAX_LUES = 200;

/**
 * Image (ou PDF à télécharger) importée dans la médiathèque du site : le fichier déjà déposé dans
 * Storage est vérifié (type, taille), puis enregistré dans `sites/{id}/medias`. Renvoie sa clé
 * `up:{id}`.
 */
export async function enregistrerMediaSite(
  s: ServicesSites & { bucket: ReturnType<typeof bucketFichiers> },
  ctx: ContexteSite,
  e: z.output<typeof entreeMediaSite>,
): Promise<{ cle: string; url: string }> {
  const chemin = fichiers.mediaSite(ctx.artisanId, e.nomFichier);
  const fichier = s.bucket.file(chemin);
  const [existe] = await fichier.exists();
  if (!existe) throw new ErreurMetier('INTROUVABLE', 'Fichier introuvable : renvoyez-le.');
  const [meta] = await fichier.getMetadata();
  const usage = e.usage ?? 'image';
  const l = LIMITES[usage];
  if (!l.type.test(meta.contentType ?? '') || Number(meta.size) > l.mo * 1024 * 1024)
    throw new ErreurMetier('ENTREE_INVALIDE', `${l.message} de ${l.mo} Mo au plus.`);
  const ref = s.db.collection(chemins.mediasSite(ctx.artisanId)).doc();
  await s.db.runTransaction(async (t) => {
    await exigerSite(s, t, ctx);
    t.set(ref, {
      schemaVersion: 1,
      nom: e.nom ?? e.nomFichier,
      storagePath: chemin,
      mime: meta.contentType,
      tailleOctets: Number(meta.size),
      usage,
      createdAt: Timestamp.fromMillis(s.horloge()),
    });
  });
  return { cle: `up:${ref.id}`, url: urlPubliqueFichier(chemin) };
}

/** Médias importés du site (images et fichiers) : clé `up:{id}` → URL publique. */
export async function lireMediasSite(
  db: Firestore,
  artisanId: string,
): Promise<{ cle: string; nom: string; url: string; usage: 'image' | 'fichier' }[]> {
  const r = await db
    .collection(chemins.mediasSite(artisanId))
    .orderBy('createdAt', 'desc')
    .limit(MAX_LUES)
    .get();
  return r.docs.map((d) => ({
    cle: `up:${d.id}`,
    nom: d.get('nom') as string,
    url: urlPubliqueFichier(d.get('storagePath') as string),
    usage: d.get('usage') === 'fichier' ? 'fichier' : 'image',
  }));
}

/** Clés `up:` des fichiers à télécharger du site (vérification des liens à la publication). */
export async function fichiersCitables(db: Firestore, artisanId: string): Promise<Set<string>> {
  const r = await db
    .collection(chemins.mediasSite(artisanId))
    .where('usage', '==', 'fichier')
    .select()
    .get();
  return new Set(r.docs.map((d) => `up:${d.id}`));
}
