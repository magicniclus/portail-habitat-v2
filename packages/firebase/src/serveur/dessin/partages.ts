import { createHash, randomBytes } from 'node:crypto';
import { sceneSansLocalisation, type Scene } from '@ph/core/dessin';
import { ErreurMetier } from '@ph/core/erreurs';
import { Timestamp } from 'firebase-admin/firestore';
import { chemins, collections, type ProprietairePlan } from '../../chemins';
import {
  exigerAcces,
  lireMeta,
  lireScene,
  type ContexteDessin,
  type ServicesDessin,
} from './plans';

/**
 * Liens de partage en lecture seule (DES-42). Le jeton n'est jamais stocké : le document
 * `partagesPlans/{empreinte}` porte son SHA-256. Le lien n'est donc montré qu'une fois, à sa
 * création ; ensuite on ne le désigne que par cette empreinte (liste, révocation).
 */
const JOUR = 24 * 60 * 60 * 1000;
const INTROUVABLE = 'Ce lien n’est plus valide.';
const empreintePartage = (jeton: string) => createHash('sha256').update(jeton).digest('hex');

export async function partagerPlan(
  s: ServicesDessin,
  ctx: ContexteDessin,
  e: { planId: string; joursValidite: number },
): Promise<{ jeton: string; partageId: string; expireLe: number }> {
  await exigerAcces(s, ctx);
  await lireMeta(s, ctx, e.planId);
  const jeton = randomBytes(24).toString('base64url');
  const partageId = empreintePartage(jeton);
  const expireLe = s.horloge() + e.joursValidite * JOUR;
  await s.db.doc(chemins.partagePlan(partageId)).create({
    proprietaire: ctx.proprietaire,
    planId: e.planId,
    versionId: 'courante',
    expireLe: Timestamp.fromMillis(expireLe),
    revoque: false,
    creeLe: Timestamp.fromMillis(s.horloge()),
  });
  return { jeton, partageId, expireLe };
}

const auProprietaire = (p: ProprietairePlan | undefined, ctx: ContexteDessin) =>
  p?.type === ctx.proprietaire.type && p.id === ctx.proprietaire.id;

export async function revoquerPartage(s: ServicesDessin, ctx: ContexteDessin, partageId: string) {
  await exigerAcces(s, ctx);
  const ref = s.db.doc(chemins.partagePlan(partageId));
  const doc = await ref.get();
  if (!doc.exists || !auProprietaire(doc.get('proprietaire'), ctx))
    throw new ErreurMetier('INTROUVABLE');
  await ref.update({ revoque: true });
}

/** Liens encore valides d'un plan (sans le jeton), du plus récent au plus ancien. */
export async function listerPartages(
  s: ServicesDessin,
  ctx: ContexteDessin,
  planId: string,
): Promise<{ partageId: string; creeLe: number; expireLe: number | null }[]> {
  await exigerAcces(s, ctx);
  await lireMeta(s, ctx, planId);
  const q = await s.db.collection(collections.partagesPlans).where('planId', '==', planId).get();
  const maintenant = s.horloge();
  return q.docs
    .filter((d) => {
      const fin = (d.get('expireLe') as Timestamp | null)?.toMillis() ?? null;
      return (
        auProprietaire(d.get('proprietaire'), ctx) &&
        d.get('revoque') !== true &&
        (fin === null || fin > maintenant)
      );
    })
    .map((d) => ({
      partageId: d.id,
      creeLe: (d.get('creeLe') as Timestamp).toMillis(),
      expireLe: (d.get('expireLe') as Timestamp | null)?.toMillis() ?? null,
    }))
    .sort((a, b) => b.creeLe - a.creeLe);
}

/** Lecture d'un plan partagé, sans compte : titre et scène, sans ce qui situe le bien. */
export async function lirePlanPartage(
  s: ServicesDessin,
  jeton: string,
): Promise<{ titre: string; scene: Scene }> {
  const partage = await s.db.doc(chemins.partagePlan(empreintePartage(jeton))).get();
  const expire = (partage.get('expireLe') as Timestamp | null)?.toMillis();
  if (!partage.exists || partage.get('revoque') === true || (expire && expire < s.horloge()))
    throw new ErreurMetier('INTROUVABLE', INTROUVABLE);
  const p = partage.get('proprietaire') as ProprietairePlan;
  const doc = await s.db.doc(chemins.plan(p, partage.get('planId') as string)).get();
  if (!doc.exists || doc.get('supprimeLe')) throw new ErreurMetier('INTROUVABLE', INTROUVABLE);
  return {
    titre: doc.get('titre') as string,
    scene: sceneSansLocalisation(await lireScene(s, doc.get('storagePath') as string)),
  };
}

/** Liens d'un plan supprimés avec lui (purge de la corbeille, suppression de compte). */
export async function supprimerPartagesDuPlan(
  s: Pick<ServicesDessin, 'db'>,
  proprietaire: ProprietairePlan,
  planId: string,
) {
  const q = await s.db.collection(collections.partagesPlans).where('planId', '==', planId).get();
  const miens = q.docs.filter((d) => {
    const p = d.get('proprietaire') as ProprietairePlan;
    return p.type === proprietaire.type && p.id === proprietaire.id;
  });
  await Promise.all(miens.map((d) => d.ref.delete()));
}
