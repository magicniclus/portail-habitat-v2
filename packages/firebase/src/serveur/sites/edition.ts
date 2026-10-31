import { ErreurMetier } from '@ph/core/erreurs';
import { peut, type Membre } from '@ph/core/equipe';
import {
  erreurSousDomaine,
  type ChampFormulaire,
  type Navigation,
  type PageSite,
  type SiteInitial,
  type Theme,
} from '@ph/core/sites';
import { FieldValue, Timestamp, type Firestore, type Transaction } from 'firebase-admin/firestore';
import { chemins } from '../../chemins';

export interface ServicesSites {
  db: Firestore;
  horloge: () => number;
  /** Domaine des sous-domaines gratuits (`portailtravaux.fr`). */
  domaineBase: string;
}

export interface ContexteSite {
  artisanId: string;
  uid: string;
}

/** 900 Ko par document Firestore de page (DATABASE §15 bis). */
const TAILLE_MAX = 900 * 1024;

/** Membre relu dans la transaction : `site.gerer` (propriétaire, gérant). */
export async function exigerSite(
  s: ServicesSites,
  t: Transaction,
  ctx: ContexteSite,
): Promise<void> {
  const m = await t.get(s.db.doc(chemins.membre(ctx.artisanId, ctx.uid)));
  if (!peut(m.data() as Membre | undefined, 'site.gerer'))
    throw new ErreurMetier('PERMISSION_REFUSEE');
}

const hote = (s: ServicesSites, slug: string) => `${slug}.${s.domaineBase}`;

/**
 * Création du site (siteId = artisanId) avec son sous-domaine, réservé dans la même transaction
 * (DOM-01 : indisponible ou réservé → refus clair). Site de départ fourni par l'appelant.
 */
export async function creerSite(
  s: ServicesSites,
  ctx: ContexteSite,
  e: { sousDomaine: string; initial: SiteInitial },
): Promise<void> {
  const erreur = erreurSousDomaine(e.sousDomaine);
  if (erreur) throw new ErreurMetier('ENTREE_INVALIDE', erreur);
  const refSite = s.db.doc(chemins.site(ctx.artisanId));
  const refSlug = s.db.doc(chemins.slugSite(e.sousDomaine));
  await s.db.runTransaction(async (t) => {
    await exigerSite(s, t, ctx);
    const [site, slug, artisan] = await Promise.all([
      t.get(refSite),
      t.get(refSlug),
      t.get(s.db.doc(chemins.artisan(ctx.artisanId))),
    ]);
    if (site.exists) throw new ErreurMetier('CONFLIT', 'Le site existe déjà.');
    if (slug.exists) throw new ErreurMetier('CONFLIT', 'Ce sous-domaine est déjà pris.');
    const maintenant = Timestamp.fromMillis(s.horloge());
    t.create(refSite, {
      schemaVersion: 1,
      artisanId: ctx.artisanId,
      // Site Pro déjà inclus dans la formule (droits écrits par le webhook Stripe).
      offre: artisan.get('droits.sitePro') === true ? 'site_pro' : 'gratuit',
      sousDomaine: e.sousDomaine,
      theme: e.initial.theme,
      versionPubliee: 0,
      brouillonModifieLe: maintenant,
      createdAt: maintenant,
      updatedAt: maintenant,
    });
    for (const [id, p] of Object.entries(e.initial.pages))
      t.create(s.db.doc(chemins.pageSite(ctx.artisanId, id)), {
        ...p,
        schemaVersion: 1,
        updatedAt: maintenant,
      });
    t.create(s.db.doc(chemins.navigationSite(ctx.artisanId)), {
      ...e.initial.navigation,
      schemaVersion: 1,
      enregistreeLe: maintenant,
    });
    const index = { schemaVersion: 1, siteId: ctx.artisanId, createdAt: maintenant };
    t.create(refSlug, index);
    t.create(s.db.doc(chemins.domaineSite(hote(s, e.sousDomaine))), index);
  });
}

/** Changement de sous-domaine : l'ancien est libéré, le nouveau réservé, en une transaction. */
export async function changerSousDomaine(
  s: ServicesSites,
  ctx: ContexteSite,
  sousDomaine: string,
): Promise<void> {
  const erreur = erreurSousDomaine(sousDomaine);
  if (erreur) throw new ErreurMetier('ENTREE_INVALIDE', erreur);
  const refSite = s.db.doc(chemins.site(ctx.artisanId));
  const refNouveau = s.db.doc(chemins.slugSite(sousDomaine));
  await s.db.runTransaction(async (t) => {
    await exigerSite(s, t, ctx);
    const [site, pris] = await Promise.all([t.get(refSite), t.get(refNouveau)]);
    if (!site.exists) throw new ErreurMetier('INTROUVABLE');
    const ancien = site.get('sousDomaine') as string;
    if (ancien === sousDomaine) return;
    if (pris.exists) throw new ErreurMetier('CONFLIT', 'Ce sous-domaine est déjà pris.');
    const maintenant = Timestamp.fromMillis(s.horloge());
    const index = { schemaVersion: 1, siteId: ctx.artisanId, createdAt: maintenant };
    t.delete(s.db.doc(chemins.slugSite(ancien)));
    t.delete(s.db.doc(chemins.domaineSite(hote(s, ancien))));
    t.create(refNouveau, index);
    t.create(s.db.doc(chemins.domaineSite(hote(s, sousDomaine))), index);
    t.update(refSite, { sousDomaine, updatedAt: maintenant });
  });
}

const tailleOk = (o: unknown) => Buffer.byteLength(JSON.stringify(o), 'utf8') <= TAILLE_MAX;

/** Brouillon d'une page (déjà validé par le schéma) : slug unique sur le site. */
export async function enregistrerPage(
  s: ServicesSites,
  ctx: ContexteSite,
  e: { pageId: string; page: PageSite },
): Promise<void> {
  if (!tailleOk(e.page))
    throw new ErreurMetier('ENTREE_INVALIDE', 'Page trop lourde : découpez-la en plusieurs pages.');
  await s.db.runTransaction(async (t) => {
    await exigerSite(s, t, ctx);
    const site = await t.get(s.db.doc(chemins.site(ctx.artisanId)));
    if (!site.exists) throw new ErreurMetier('INTROUVABLE');
    const memeSlug = await t.get(
      s.db.collection(chemins.pagesSite(ctx.artisanId)).where('slug', '==', e.page.slug).limit(2),
    );
    if (memeSlug.docs.some((d) => d.id !== e.pageId))
      throw new ErreurMetier('CONFLIT', 'Une autre page utilise déjà cette adresse.');
    const maintenant = Timestamp.fromMillis(s.horloge());
    t.set(s.db.doc(chemins.pageSite(ctx.artisanId, e.pageId)), {
      ...e.page,
      schemaVersion: 1,
      updatedAt: maintenant,
    });
    t.update(site.ref, { brouillonModifieLe: maintenant, updatedAt: maintenant });
  });
}

/** Tableau de bord : page dans le menu, en ligne ou en brouillon (effet à la publication). */
export async function reglerPage(
  s: ServicesSites,
  ctx: ContexteSite,
  e: { pageId: string; menu?: boolean; statut?: PageSite['statut'] },
): Promise<void> {
  if (e.pageId === 'accueil' && e.statut === 'brouillon')
    throw new ErreurMetier('PRECONDITION', 'L’accueil reste toujours en ligne.');
  await s.db.runTransaction(async (t) => {
    await exigerSite(s, t, ctx);
    const ref = s.db.doc(chemins.pageSite(ctx.artisanId, e.pageId));
    if (!(await t.get(ref)).exists) throw new ErreurMetier('INTROUVABLE');
    const maintenant = Timestamp.fromMillis(s.horloge());
    t.update(ref, {
      ...(e.menu === undefined ? {} : { menu: e.menu }),
      ...(e.statut ? { statut: e.statut } : {}),
      updatedAt: maintenant,
    });
    t.update(s.db.doc(chemins.site(ctx.artisanId)), {
      brouillonModifieLe: maintenant,
      updatedAt: maintenant,
    });
  });
}

/** Suppression d'une page (jamais l'accueil). */
export async function supprimerPage(
  s: ServicesSites,
  ctx: ContexteSite,
  pageId: string,
): Promise<void> {
  if (pageId === 'accueil') throw new ErreurMetier('PRECONDITION', 'L’accueil ne se supprime pas.');
  await s.db.runTransaction(async (t) => {
    await exigerSite(s, t, ctx);
    t.delete(s.db.doc(chemins.pageSite(ctx.artisanId, pageId)));
    t.update(s.db.doc(chemins.site(ctx.artisanId)), {
      brouillonModifieLe: Timestamp.fromMillis(s.horloge()),
    });
  });
}

/** Navigation : composant global enregistré à part, sans toucher au contenu des pages (SITE-11). */
export async function enregistrerNavigation(
  s: ServicesSites,
  ctx: ContexteSite,
  nav: Navigation,
): Promise<void> {
  await s.db.runTransaction(async (t) => {
    await exigerSite(s, t, ctx);
    const maintenant = Timestamp.fromMillis(s.horloge());
    t.set(s.db.doc(chemins.navigationSite(ctx.artisanId)), {
      ...nav,
      schemaVersion: 1,
      enregistreeLe: maintenant,
    });
    t.update(s.db.doc(chemins.site(ctx.artisanId)), {
      brouillonModifieLe: maintenant,
      updatedAt: maintenant,
    });
  });
}

/** Thème (palette, polices, boutons, ton). */
export async function enregistrerTheme(
  s: ServicesSites,
  ctx: ContexteSite,
  theme: Theme,
): Promise<void> {
  await s.db.runTransaction(async (t) => {
    await exigerSite(s, t, ctx);
    const maintenant = Timestamp.fromMillis(s.horloge());
    t.update(s.db.doc(chemins.site(ctx.artisanId)), {
      theme,
      brouillonModifieLe: maintenant,
      updatedAt: maintenant,
    });
  });
}

/**
 * Champs du formulaire (Site Pro seulement) : nom, téléphone et email restent obligatoires pour
 * que la demande arrive complète dans « Mes demandes ».
 */
export async function enregistrerFormulaire(
  s: ServicesSites,
  ctx: ContexteSite,
  champs: ChampFormulaire[],
): Promise<void> {
  for (const requis of ['nom', 'telephone', 'email'])
    if (!champs.some((c) => c.id === requis && c.requis))
      throw new ErreurMetier('ENTREE_INVALIDE', 'Nom, téléphone et email restent obligatoires.');
  await s.db.runTransaction(async (t) => {
    await exigerSite(s, t, ctx);
    const site = await t.get(s.db.doc(chemins.site(ctx.artisanId)));
    if (site.get('offre') !== 'site_pro')
      throw new ErreurMetier(
        'PRECONDITION',
        'Le formulaire personnalisé est inclus dans Site Pro.',
      );
    t.update(site.ref, { formulaire: { champs }, updatedAt: FieldValue.serverTimestamp() });
  });
}
