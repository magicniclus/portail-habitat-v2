import { ErreurMetier } from '@ph/core/erreurs';
import type { entreeMediaSite } from '@ph/core/schemas';
import type { z } from '@ph/core/zod';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { urlPubliqueFichier, type bucketFichiers } from '../../admin';
import { chemins, fichiers } from '../../chemins';
import { exigerSite, type ContexteSite, type ServicesSites } from './edition';

/** Taille et types des images importées : mêmes limites que storage.rules (8 Mo). */
const MAX_MO = 8;
const IMAGES = /^image\/(jpeg|png|webp|avif)$/;
/** Images importées lues pour l'éditeur (les plus récentes d'abord). */
const MAX_LUES = 200;

/**
 * Image importée dans la médiathèque du site : le fichier déjà déposé dans Storage est vérifié
 * (image, 8 Mo), puis enregistré dans `sites/{id}/medias`. Renvoie sa clé `up:{id}`.
 */
export async function enregistrerMediaSite(
  s: ServicesSites & { bucket: ReturnType<typeof bucketFichiers> },
  ctx: ContexteSite,
  e: z.output<typeof entreeMediaSite>,
): Promise<{ cle: string; url: string }> {
  const chemin = fichiers.mediaSite(ctx.artisanId, e.nomFichier);
  const fichier = s.bucket.file(chemin);
  const [existe] = await fichier.exists();
  if (!existe) throw new ErreurMetier('INTROUVABLE', 'Image introuvable : renvoyez-la.');
  const [meta] = await fichier.getMetadata();
  if (!IMAGES.test(meta.contentType ?? '') || Number(meta.size) > MAX_MO * 1024 * 1024)
    throw new ErreurMetier('ENTREE_INVALIDE', `Image JPEG, PNG ou WebP de ${MAX_MO} Mo au plus.`);
  const ref = s.db.collection(chemins.mediasSite(ctx.artisanId)).doc();
  await s.db.runTransaction(async (t) => {
    await exigerSite(s, t, ctx);
    t.set(ref, {
      schemaVersion: 1,
      nom: e.nomFichier,
      storagePath: chemin,
      mime: meta.contentType,
      tailleOctets: Number(meta.size),
      usage: 'image',
      createdAt: Timestamp.fromMillis(s.horloge()),
    });
  });
  return { cle: `up:${ref.id}`, url: urlPubliqueFichier(chemin) };
}

/** Images importées du site : clé `up:{id}` → URL publique. */
export async function lireMediasSite(
  db: Firestore,
  artisanId: string,
): Promise<{ cle: string; nom: string; url: string }[]> {
  const r = await db
    .collection(chemins.mediasSite(artisanId))
    .orderBy('createdAt', 'desc')
    .limit(MAX_LUES)
    .get();
  return r.docs.map((d) => ({
    cle: `up:${d.id}`,
    nom: d.get('nom') as string,
    url: urlPubliqueFichier(d.get('storagePath') as string),
  }));
}
