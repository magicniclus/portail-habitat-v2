import 'server-only';
import {
  entreeSuivi,
  fichiersCites,
  FORMULAIRE_GRATUIT,
  hoteCanonique,
  type ChampFormulaire,
  type PageSite,
  type SuiviSite,
} from '@ph/core/sites';
import { appAdmin, urlPubliqueFichier } from '@ph/firebase/admin';
import { chemins } from '@ph/firebase/chemins';
import { lireSitePublie, type SitePublie } from '@ph/firebase/sites';
import { getFirestore } from 'firebase-admin/firestore';

const db = () => getFirestore(appAdmin());

/** Suivi enregistré, revalidé (une donnée abîmée ne charge aucun script). */
export function suiviLu(v: unknown): { suivi?: SuiviSite } {
  const r = entreeSuivi.safeParse(v);
  return r.success ? { suivi: r.data } : {};
}

export interface SiteServi extends SitePublie {
  /** Adresse canonique : domaine actif, sinon le sous-domaine (DOM-05). */
  canonique: string;
  nomEntreprise: string;
  urlFiche?: string;
  champs: ChampFormulaire[];
  photos: Record<string, string[]>;
  /** Balise Google et pixel Meta (onglet « Suivi et publicité »), relus avec le schéma. */
  suivi?: SuiviSite;
  /** Images et fichiers importés (`up:{id}`) utilisés par les pages publiées. */
  importees: Record<string, string>;
}

/** 30 s de cache par instance : une publication est visible en moins d'une minute (SITE-08). */
const CACHE_MS = 30_000;
const cache = new Map<string, { site: SiteServi | null; lu: number }>();

/** Réalisations (`lib:`) et images importées (`up:`) citées par les pages. */
function refsPhotos(pages: Record<string, PageSite>): { lib: Set<string>; up: Set<string> } {
  const ids = { lib: new Set<string>(), up: new Set<string>() };
  const ajouter = (src: string) => {
    const m = /^(lib|up):([\w-]+)/.exec(src);
    if (m) ids[m[1] as 'lib' | 'up'].add(m[2]!);
  };
  for (const p of Object.values(pages))
    for (const s of p.sections) {
      ajouter(s.p.fondImage);
      for (const r of s.rows)
        for (const c of r.cols) for (const e of c.els) if (e.type === 'image') ajouter(e.p.src);
    }
  return ids;
}

async function charger(hote: string): Promise<SiteServi | null> {
  const site = await lireSitePublie(db(), hote);
  if (!site) return null;
  const [artisan, publique, doc] = await Promise.all([
    db().doc(chemins.artisan(site.siteId)).get(),
    db().doc(chemins.artisanPublic(site.siteId)).get(),
    db().doc(chemins.site(site.siteId)).get(),
  ]);
  // Seules les réalisations publiées (autorisation du propriétaire du chantier) sont servies.
  const refs = refsPhotos(site.pages);
  for (const f of fichiersCites(site.pages, site.navigation)) refs.up.add(f);
  const [realisations, medias] = await Promise.all([
    Promise.all(
      [...refs.lib].map((r) =>
        db()
          .doc(`${chemins.realisations(site.siteId)}/${r}`)
          .get(),
      ),
    ),
    Promise.all(
      [...refs.up].map((m) =>
        db()
          .doc(`${chemins.mediasSite(site.siteId)}/${m}`)
          .get(),
      ),
    ),
  ]);
  const photos = Object.fromEntries(
    realisations
      .filter((r) => r.exists && r.get('publie') === true)
      .map((r) => [
        r.id,
        ((r.get('photos') as { url: string }[] | undefined) ?? []).map((p) => p.url),
      ]),
  );
  const slug = publique.get('slug') as string | undefined;
  return {
    ...site,
    canonique: hoteCanonique(site, process.env.DOMAINE_SITES ?? 'portailtravaux.fr'),
    nomEntreprise: (artisan.get('nomCommercial') as string | undefined) ?? site.navigation.nom,
    ...(slug ? { urlFiche: `https://portailtravaux.fr/artisans/${slug}` } : {}),
    champs:
      site.offre === 'site_pro'
        ? ((doc.get('formulaire.champs') as ChampFormulaire[] | undefined) ?? [
            ...FORMULAIRE_GRATUIT,
          ])
        : [...FORMULAIRE_GRATUIT],
    photos,
    ...suiviLu(doc.get('suivi')),
    importees: Object.fromEntries(
      medias
        .filter((m) => m.exists)
        .map((m) => [m.id, urlPubliqueFichier(m.get('storagePath') as string)]),
    ),
  };
}

/** Site publié pour un hôte, mis en cache 30 s. */
export async function siteServi(hote: string, maintenant = Date.now()): Promise<SiteServi | null> {
  const c = cache.get(hote);
  if (c && maintenant - c.lu < CACHE_MS) return c.site;
  const site = await charger(hote);
  cache.set(hote, { site, lu: maintenant });
  if (cache.size > 2000) cache.delete(cache.keys().next().value!);
  return site;
}

/**
 * `lib:{realisationId}/{i}` → URL de la photo si la réalisation est publiée ; `up:{id}` → URL de
 * l'image importée dans la médiathèque du site.
 */
export const resoudreMedia = (site: SiteServi) => (src: string) => {
  const up = /^up:([\w-]+)$/.exec(src);
  if (up) return site.importees[up[1]!] ?? null;
  const m = /^lib:([\w-]+)\/(\d+)$/.exec(src);
  return m ? (site.photos[m[1]!]?.[Number(m[2])] ?? null) : null;
};

/**
 * Turnstile (D46) : jeton vérifié auprès de Cloudflare. Sans clé secrète, accepté seulement hors
 * production (poste local, émulateurs) ; en production il échoue, et aucune demande n'est créée.
 */
export async function verifierTurnstile(jeton: string, ip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET;
  if (!secret) return process.env.VERCEL_ENV !== 'production';
  if (!jeton) return false;
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: new URLSearchParams({ secret, response: jeton, ...(ip ? { remoteip: ip } : {}) }),
      signal: AbortSignal.timeout(5000),
    });
    return ((await r.json()) as { success?: boolean }).success === true;
  } catch {
    return false;
  }
}
