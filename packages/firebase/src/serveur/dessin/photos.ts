import { randomBytes } from 'node:crypto';
import { ErreurMetier } from '@ph/core/erreurs';
import { fichiers } from '../../chemins';
import { TAILLE_MAX_FOND } from './fond';
import { lirePlan, type ContexteDessin, type ServicesDessin } from './plans';

/**
 * Galerie « Mes photos » d'un plan (DES-37) : rendus HD faits dans le navigateur (D85),
 * enregistrés en JPEG vérifié dans le dossier du plan. Supprimés avec le plan (purge du dossier).
 */
export const PHOTOS_MAX = 30;
const dossierPhotos = (ctx: ContexteDessin, planId: string) =>
  `${fichiers.dossierPlan(ctx.proprietaire, planId)}photos/`;
const NOM = /photo-(\d+)-[0-9a-f]{12}\.jpg$/;

export async function listerPhotos(
  s: ServicesDessin,
  ctx: ContexteDessin,
  e: { planId: string },
): Promise<{ photos: { storagePath: string; creeLe: number }[] }> {
  await lirePlan(s, ctx, e.planId);
  const [liste] = await s.bucket.getFiles({ prefix: dossierPhotos(ctx, e.planId) });
  const photos = liste
    .map((f) => ({ storagePath: f.name, creeLe: Number(NOM.exec(f.name)?.[1] ?? 0) }))
    .filter((p) => p.creeLe > 0)
    .sort((a, b) => b.creeLe - a.creeLe || b.storagePath.localeCompare(a.storagePath));
  return { photos };
}

export async function enregistrerPhoto(
  s: ServicesDessin,
  ctx: ContexteDessin,
  e: { planId: string; base64: string },
): Promise<{ storagePath: string }> {
  const { photos } = await listerPhotos(s, ctx, e);
  if (photos.length >= PHOTOS_MAX)
    throw new ErreurMetier(
      'PRECONDITION',
      `${PHOTOS_MAX} photos au plus par plan : supprimez-en une avant d’en ajouter.`,
    );
  const donnees = Buffer.from(e.base64, 'base64');
  if (donnees.length > TAILLE_MAX_FOND)
    throw new ErreurMetier('ENTREE_INVALIDE', 'Photo trop lourde (3 Mo au plus).');
  if (!(donnees[0] === 0xff && donnees[1] === 0xd8 && donnees[2] === 0xff))
    throw new ErreurMetier('ENTREE_INVALIDE', 'La photo doit être une image JPEG.');
  const storagePath = `${dossierPhotos(ctx, e.planId)}photo-${s.horloge()}-${randomBytes(6).toString('hex')}.jpg`;
  await s.bucket.file(storagePath).save(donnees, { contentType: 'image/jpeg', resumable: false });
  return { storagePath };
}

export async function supprimerPhoto(
  s: ServicesDessin,
  ctx: ContexteDessin,
  e: { planId: string; storagePath: string },
): Promise<{ ok: true }> {
  await lirePlan(s, ctx, e.planId);
  if (
    !e.storagePath.startsWith(dossierPhotos(ctx, e.planId)) ||
    !NOM.test(e.storagePath) ||
    e.storagePath.includes('..')
  )
    throw new ErreurMetier('INTROUVABLE');
  await s.bucket.file(e.storagePath).delete({ ignoreNotFound: true });
  return { ok: true };
}
