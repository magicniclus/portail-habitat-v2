import { ErreurMetier } from '@ph/core/erreurs';
import { creditsArticlesMois, mentionsBlog } from '@ph/core/blog';
import type { ParametresFacturation } from '@ph/core/devis';
import { droitsDe, type Formule } from '@ph/core/paiements';
import type { Firestore, Transaction } from 'firebase-admin/firestore';
import { chemins } from '../../chemins';
import { exigerSite, type ContexteSite, type ServicesSites } from '../sites/edition';

export type ServicesBlog = Pick<ServicesSites, 'db' | 'horloge'>;

/** Droits écrits par le webhook Stripe ; repli sur la formule (jamais lus du client). */
export function sitePro(d: { formule?: Formule; sitePro?: boolean } | undefined): boolean {
  return d?.sitePro ?? droitsDe(d?.formule ?? 'gratuit').sitePro;
}

/**
 * Écriture dans le blog (BLOG §1, BLOG-01) : membre avec `site.gerer`, site créé et Site Pro
 * (Site Pro, Fiche + Site, Tout inclus). Relu dans la transaction.
 */
export async function exigerBlog(s: ServicesBlog, t: Transaction, ctx: ContexteSite) {
  await exigerSite({ ...s, domaineBase: '' }, t, ctx);
  const [site, artisan] = await Promise.all([
    t.get(s.db.doc(chemins.site(ctx.artisanId))),
    t.get(s.db.doc(chemins.artisan(ctx.artisanId))),
  ]);
  if (!site.exists) throw new ErreurMetier('PRECONDITION', 'Créez d’abord votre site.');
  if (!sitePro(artisan.get('droits')))
    throw new ErreurMetier('PERMISSION_REFUSEE', 'Le blog est inclus dans Site Pro.');
}

/** Mentions légales lues en direct dans Devis & factures › Paramètres (BLOG-05). */
export async function lireMentionsBlog(db: Firestore, artisanId: string) {
  const p = await db.doc(chemins.parametresFacturation(artisanId)).get();
  return mentionsBlog((p.data() as Partial<ParametresFacturation> | undefined) ?? null);
}

export const moisParis = (ms: number) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(ms).slice(0, 7);

/** Rédactions complètes par l'IA ce mois-ci (D66 : 5 ou 15), compteur à côté de celui du site. */
export async function lireCreditsBlog(s: ServicesBlog, artisanId: string) {
  const [artisan, c] = await Promise.all([
    s.db.doc(chemins.artisan(artisanId)).get(),
    s.db.doc(chemins.compteurIaSite(artisanId, moisParis(s.horloge()))).get(),
  ]);
  const d = artisan.get('droits') as { formule?: Formule; sitePro?: boolean } | undefined;
  const formule = d?.formule ?? 'gratuit';
  return {
    utilises: (c.get('blogArticles') as number | undefined) ?? 0,
    max: creditsArticlesMois({ formule, sitePro: sitePro(d) }),
    toutInclus: formule === 'tout_inclus',
  };
}
