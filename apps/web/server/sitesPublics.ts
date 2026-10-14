import 'server-only';
import { FORMULAIRE_GRATUIT, type ChampFormulaire, type PageSite } from '@ph/core/sites';
import { appAdmin } from '@ph/firebase/admin';
import { chemins } from '@ph/firebase/chemins';
import { lireSitePublie, type SitePublie } from '@ph/firebase/sites';
import { getFirestore } from 'firebase-admin/firestore';

const db = () => getFirestore(appAdmin());

export interface SiteServi extends SitePublie {
  nomEntreprise: string;
  urlFiche?: string;
  champs: ChampFormulaire[];
  photos: Record<string, string[]>;
}

/** 30 s de cache par instance : une publication est visible en moins d'une minute (SITE-08). */
const CACHE_MS = 30_000;
const cache = new Map<string, { site: SiteServi | null; lu: number }>();

function refsPhotos(pages: Record<string, PageSite>): Set<string> {
  const ids = new Set<string>();
  const ajouter = (src: string) => {
    const m = /^lib:([\w-]+)\//.exec(src);
    if (m) ids.add(m[1]!);
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
  const ids = [...refsPhotos(site.pages)];
  const realisations = await Promise.all(
    ids.map((r) =>
      db()
        .doc(`${chemins.realisations(site.siteId)}/${r}`)
        .get(),
    ),
  );
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
    nomEntreprise: (artisan.get('nomCommercial') as string | undefined) ?? site.navigation.nom,
    ...(slug ? { urlFiche: `https://portailhabitat.fr/artisans/${slug}` } : {}),
    champs:
      site.offre === 'site_pro'
        ? ((doc.get('formulaire.champs') as ChampFormulaire[] | undefined) ?? [
            ...FORMULAIRE_GRATUIT,
          ])
        : [...FORMULAIRE_GRATUIT],
    photos,
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

/** `lib:{realisationId}/{i}` → URL publique de la photo, si la réalisation est publiée. */
export const resoudreMedia = (site: SiteServi) => (src: string) => {
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
