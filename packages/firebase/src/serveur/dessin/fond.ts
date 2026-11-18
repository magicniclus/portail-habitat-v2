import { randomBytes } from 'node:crypto';
import { ErreurMetier } from '@ph/core/erreurs';
import { fichiers } from '../../chemins';
import { lirePlan, type ContexteDessin, type ServicesDessin } from './plans';

/** Plan importé en calque (D91) : 3 Mo au plus, JPEG, PNG ou WebP vérifiés par leur signature. */
export const TAILLE_MAX_FOND = 3 * 1024 * 1024;

const SIGNATURES: Record<'image/jpeg' | 'image/png' | 'image/webp', (b: Buffer) => boolean> = {
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')),
  'image/webp': (b) =>
    b.subarray(0, 4).toString('latin1') === 'RIFF' &&
    b.subarray(8, 12).toString('latin1') === 'WEBP',
};
const EXTENSIONS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as const;

/** Enregistre l'image dans le dossier du plan ; la scène y fait ensuite référence. */
export async function enregistrerFond(
  s: ServicesDessin,
  ctx: ContexteDessin,
  e: { planId: string; type: keyof typeof SIGNATURES; base64: string },
): Promise<{ storagePath: string }> {
  await lirePlan(s, ctx, e.planId); // accès et existence du plan
  const donnees = Buffer.from(e.base64, 'base64');
  if (donnees.length > TAILLE_MAX_FOND)
    throw new ErreurMetier('ENTREE_INVALIDE', 'Image trop lourde (3 Mo au plus).');
  if (!SIGNATURES[e.type](donnees))
    throw new ErreurMetier('ENTREE_INVALIDE', 'Ce fichier n’est pas une image JPEG, PNG ou WebP.');
  const storagePath = `${fichiers.dossierPlan(ctx.proprietaire, e.planId)}fond-${randomBytes(6).toString('hex')}.${EXTENSIONS[e.type]}`;
  await s.bucket.file(storagePath).save(donnees, { contentType: e.type, resumable: false });
  return { storagePath };
}

/**
 * Image du plan (calque importé ou photo de la galerie), renvoyée en data URL : seulement
 * un de ces fichiers, dans le dossier de CE plan.
 */
export async function lireFond(
  s: ServicesDessin,
  ctx: ContexteDessin,
  e: { planId: string; storagePath: string },
): Promise<{ url: string }> {
  await lirePlan(s, ctx, e.planId);
  const dossier = fichiers.dossierPlan(ctx.proprietaire, e.planId);
  const autorise = ['fond-', 'photos/photo-'].some((p) => e.storagePath.startsWith(dossier + p));
  if (!autorise || e.storagePath.includes('..')) throw new ErreurMetier('INTROUVABLE');
  const fichier = s.bucket.file(e.storagePath);
  const [existe] = await fichier.exists();
  if (!existe) throw new ErreurMetier('INTROUVABLE');
  const [[donnees], [meta]] = await Promise.all([fichier.download(), fichier.getMetadata()]);
  return { url: `data:${meta.contentType ?? 'image/jpeg'};base64,${donnees.toString('base64')}` };
}
