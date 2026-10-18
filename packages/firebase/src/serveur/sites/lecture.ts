import type { Navigation, PageSite, StatutDomaine, Theme } from '@ph/core/sites';
import type { DocumentData, Firestore } from 'firebase-admin/firestore';
import { chemins } from '../../chemins';

export interface SitePublie {
  siteId: string;
  version: number;
  offre: 'gratuit' | 'site_pro';
  sousDomaine: string;
  /** Domaine personnel (pour l'adresse canonique et les redirections 301). */
  domaine?: { nom: string; statut: string; principal: 'www' | 'apex' };
  theme: Theme;
  navigation: Navigation;
  pages: Record<string, PageSite>;
}

/**
 * Site servi pour un hôte (`slug.portailtravaux.fr`, domaine de l'artisan) : index des domaines →
 * version publiée. `null` si l'hôte est inconnu ou si rien n'est encore publié.
 */
export async function lireSitePublie(db: Firestore, hote: string): Promise<SitePublie | null> {
  const index = await db.doc(chemins.domaineSite(hote.toLowerCase())).get();
  const siteId = index.get('siteId') as string | undefined;
  if (!siteId) return null;
  const site = await db.doc(chemins.site(siteId)).get();
  const n = site.get('versionPubliee') as number | undefined;
  if (!n) return null;
  const v = (await db.doc(chemins.versionSite(siteId, n)).get()).data() as DocumentData | undefined;
  if (!v) return null;
  return {
    siteId,
    version: n,
    offre: site.get('offre'),
    sousDomaine: site.get('sousDomaine'),
    ...(site.get('domaine.nom')
      ? {
          domaine: {
            nom: site.get('domaine.nom') as string,
            statut: site.get('domaine.statut') as string,
            principal: site.get('domaine.principal') as 'www' | 'apex',
          },
        }
      : {}),
    theme: v.theme,
    navigation: v.navigation,
    pages: v.pages,
  };
}

/** Page d'un site publié selon le chemin (`/` = accueil). */
export function pageDuChemin(
  site: Pick<SitePublie, 'pages'>,
  chemin: string,
): { id: string; page: PageSite } | null {
  const slug = chemin.replace(/^\/+|\/+$/g, '');
  const e = Object.entries(site.pages).find(([, p]) => p.slug === slug);
  return e ? { id: e[0], page: e[1] } : null;
}

export interface SiteEdition {
  existe: boolean;
  offre?: 'gratuit' | 'site_pro';
  sousDomaine?: string;
  theme?: Theme;
  versionPubliee?: number;
  derniereVersion?: number;
  brouillonModifieLe?: number;
  publieLe?: number;
  pages: Record<string, PageSite>;
  navigation?: Navigation;
  versions: { n: number; publieLe: number }[];
  domaine?: DomaineEdition;
}

/** Domaine personnel tel que l'écran Domaine l'affiche. */
export interface DomaineEdition {
  nom: string;
  statut: StatutDomaine;
  enregistrements: {
    type: 'A' | 'CNAME' | 'TXT';
    nom: string;
    valeur: string;
    etat: 'en_attente' | 'ok' | 'incorrect';
    trouve?: string;
  }[];
  derniereVerifLe?: number;
}

/** Tout ce que l'éditeur et le tableau de bord du site lisent. */
export async function lireSiteEdition(db: Firestore, siteId: string): Promise<SiteEdition> {
  const site = await db.doc(chemins.site(siteId)).get();
  if (!site.exists) return { existe: false, pages: {}, versions: [] };
  const [pages, nav, versions] = await Promise.all([
    db.collection(chemins.pagesSite(siteId)).orderBy('ordre').get(),
    db.doc(chemins.navigationSite(siteId)).get(),
    db.collection(chemins.versionsSite(siteId)).orderBy('n', 'desc').limit(20).get(),
  ]);
  const ms = (v: unknown) => (v as { toMillis(): number } | undefined)?.toMillis();
  const { schemaVersion: _v, enregistreeLe: _e, ...navigation } = nav.data() ?? {};
  return {
    existe: true,
    offre: site.get('offre'),
    sousDomaine: site.get('sousDomaine'),
    theme: site.get('theme'),
    versionPubliee: site.get('versionPubliee'),
    derniereVersion: site.get('derniereVersion'),
    brouillonModifieLe: ms(site.get('brouillonModifieLe')),
    publieLe: ms(site.get('publieLe')),
    pages: Object.fromEntries(
      pages.docs.map((d) => {
        const { schemaVersion: _s, updatedAt: _u, ...p } = d.data();
        return [d.id, p as PageSite];
      }),
    ),
    navigation: nav.exists ? (navigation as Navigation) : undefined,
    ...(site.get('domaine.nom')
      ? {
          domaine: {
            nom: site.get('domaine.nom') as string,
            statut: site.get('domaine.statut') as StatutDomaine,
            enregistrements: (
              (site.get('domaine.enregistrements') as DomaineEdition['enregistrements']) ?? []
            ).map(({ type, nom, valeur, etat, trouve }) => ({
              type,
              nom,
              valeur,
              etat,
              ...(trouve ? { trouve } : {}),
            })),
            ...(ms(site.get('domaine.derniereVerifLe'))
              ? { derniereVerifLe: ms(site.get('domaine.derniereVerifLe')) }
              : {}),
          },
        }
      : {}),
    versions: versions.docs.map((d) => ({
      n: d.get('n') as number,
      publieLe: ms(d.get('publieLe')) ?? 0,
    })),
  };
}

/** Photos des réalisations publiées (autorisation du propriétaire du chantier) : médiathèque du site. */
export async function lirePhotosPubliees(
  db: Firestore,
  artisanId: string,
  limite = 30,
): Promise<{ id: string; urls: string[] }[]> {
  const r = await db
    .collection(chemins.realisations(artisanId))
    .where('publie', '==', true)
    .limit(limite)
    .get();
  return r.docs.map((d) => ({
    id: d.id,
    urls: ((d.get('photos') as { url: string }[] | undefined) ?? []).map((p) => p.url),
  }));
}
