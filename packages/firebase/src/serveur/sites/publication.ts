import { ErreurMetier } from '@ph/core/erreurs';
import {
  textesACompleter,
  verifierLiensSite,
  type LienInvalide,
  type Navigation,
  type PageSite,
} from '@ph/core/sites';
import { Timestamp } from 'firebase-admin/firestore';
import { chemins } from '../../chemins';
import { exigerSite, type ContexteSite, type ServicesSites } from './edition';
import { fichiersCitables } from './medias';

/** Versions publiées gardées (DATABASE §15 bis). */
const VERSIONS_GARDEES = 20;

export class PublicationRefusee extends ErreurMetier {
  constructor(readonly liens: LienInvalide[]) {
    super(
      'PRECONDITION',
      `Publication impossible : ${liens.length} lien(s) ou bouton(s) à corriger (${liens
        .slice(0, 3)
        .map((l) => `${l.page}, ${l.ou} : ${l.erreur}`)
        .join(' ; ')}).`,
    );
  }
}

/**
 * Publication (SITE-08, SITE-09) : liens et boutons vérifiés sur les pages publiées et la
 * navigation enregistrée ; instantané `versions/{n}` puis bascule de `versionPubliee` (le rendu
 * public lit cette version : visible dès la requête suivante). Les 20 dernières versions restent.
 */
export async function publierSite(
  s: ServicesSites,
  ctx: ContexteSite,
): Promise<{ version: number }> {
  const refSite = s.db.doc(chemins.site(ctx.artisanId));
  // Fichiers à télécharger du site (lecture hors transaction : ils ne changent pas ici).
  const fichiers = await fichiersCitables(s.db, ctx.artisanId);
  const r = await s.db.runTransaction(async (t) => {
    await exigerSite(s, t, ctx);
    const [site, pages, nav] = await Promise.all([
      t.get(refSite),
      t.get(s.db.collection(chemins.pagesSite(ctx.artisanId))),
      t.get(s.db.doc(chemins.navigationSite(ctx.artisanId))),
    ]);
    if (!site.exists) throw new ErreurMetier('INTROUVABLE');
    const toutes = Object.fromEntries(
      pages.docs.map((d) => {
        const { schemaVersion: _v, updatedAt: _u, ...p } = d.data();
        return [d.id, p as PageSite];
      }),
    );
    const { schemaVersion: _sv, enregistreeLe: _e, ...navigation } = nav.data() ?? {};
    const erreurs = [
      ...verifierLiensSite(toutes, navigation as Navigation, fichiers),
      // Faits que l'IA n'a pas pu vérifier : à remplir avant la mise en ligne (SITE-IA-05).
      ...textesACompleter(
        Object.fromEntries(Object.entries(toutes).filter(([, p]) => p.statut === 'publiee')),
      ).map((t) => ({
        pageId: t.pageId,
        page: t.page,
        ou: 'Texte',
        erreur: 'texte « [à compléter] » à remplir',
      })),
    ];
    if (erreurs.length) throw new PublicationRefusee(erreurs);
    const publiees = Object.fromEntries(
      Object.entries(toutes).filter(([, p]) => p.statut === 'publiee'),
    );
    if (!publiees.accueil)
      throw new ErreurMetier('PRECONDITION', 'Publiez au moins la page d’accueil.');
    const n = ((site.get('derniereVersion') as number | undefined) ?? 0) + 1;
    const maintenant = Timestamp.fromMillis(s.horloge());
    t.create(s.db.doc(chemins.versionSite(ctx.artisanId, n)), {
      schemaVersion: 1,
      n,
      theme: site.get('theme'),
      navigation,
      pages: publiees,
      publiePar: ctx.uid,
      publieLe: maintenant,
      liensVerifies: true,
    });
    t.update(refSite, {
      versionPubliee: n,
      derniereVersion: n,
      publieLe: maintenant,
      updatedAt: maintenant,
    });
    return n;
  });
  const anciennes = await s.db
    .collection(chemins.versionsSite(ctx.artisanId))
    .where('n', '<=', r - VERSIONS_GARDEES)
    .get();
  await Promise.all(anciennes.docs.map((d) => d.ref.delete()));
  return { version: r };
}

/** Retour à une version précédente (SITE-08) : seul le pointeur change, effet immédiat. */
export async function retablirVersion(
  s: ServicesSites,
  ctx: ContexteSite,
  n: number,
): Promise<void> {
  await s.db.runTransaction(async (t) => {
    await exigerSite(s, t, ctx);
    const v = await t.get(s.db.doc(chemins.versionSite(ctx.artisanId, n)));
    if (!v.exists) throw new ErreurMetier('INTROUVABLE', 'Cette version n’existe plus.');
    t.update(s.db.doc(chemins.site(ctx.artisanId)), {
      versionPubliee: n,
      updatedAt: Timestamp.fromMillis(s.horloge()),
    });
  });
}

/**
 * Contenu d'une version publiée (historique de l'éditeur) : pages, navigation et thème, pour les
 * reprendre dans le brouillon. Lecture réservée à qui gère le site.
 */
export async function lireVersion(
  s: ServicesSites,
  ctx: ContexteSite,
  n: number,
): Promise<{ n: number; pages: Record<string, PageSite>; navigation: Navigation; theme: unknown }> {
  await s.db.runTransaction((t) => exigerSite(s, t, ctx));
  const v = await s.db.doc(chemins.versionSite(ctx.artisanId, n)).get();
  if (!v.exists) throw new ErreurMetier('INTROUVABLE', 'Cette version n’existe plus.');
  return {
    n,
    pages: v.get('pages') as Record<string, PageSite>,
    navigation: v.get('navigation') as Navigation,
    theme: v.get('theme'),
  };
}
