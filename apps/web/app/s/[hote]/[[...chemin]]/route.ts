import { pageDuChemin } from '@ph/firebase/sites';
import { rendreDocument } from '@/features/siteArtisan/document';
import { resoudreMedia, siteServi } from '@/server/sitesPublics';

export const dynamic = 'force-dynamic';

const PAGE_404 =
  '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page introuvable</title><meta name="robots" content="noindex"></head><body style="font-family:Arial,sans-serif;text-align:center;padding:64px 20px"><h1>Page introuvable</h1><p><a href="/">Retour à l’accueil</a></p></body></html>';

const html = (corps: string, status: number, cache: string) =>
  new Response(corps, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': cache },
  });

/**
 * Site artisan publié (réécrit par `proxy.ts` depuis son hôte) : HTML statique, sans cookie
 * (SITE-07), en cache partagé 30 s pour qu'une publication soit visible en moins d'une minute.
 */
export async function GET(
  _requete: Request,
  { params }: { params: Promise<{ hote: string; chemin?: string[] }> },
) {
  const { hote, chemin } = await params;
  const site = await siteServi(decodeURIComponent(hote));
  const trouve = site && pageDuChemin(site, `/${(chemin ?? []).join('/')}`);
  if (!site || !trouve) return html(PAGE_404, 404, 'public, s-maxage=30');
  // Une seule adresse canonique (DOM-05) : sous-domaine ou variante www/nu → 301.
  if (site.canonique !== decodeURIComponent(hote))
    return new Response(null, {
      status: 301,
      headers: {
        Location: `https://${site.canonique}/${(chemin ?? []).map(encodeURIComponent).join('/')}`,
        'Cache-Control': 'public, s-maxage=300',
      },
    });
  const corps = rendreDocument(
    {
      hote: site.canonique,
      offre: site.offre,
      theme: site.theme,
      navigation: site.navigation,
      page: trouve.page,
      pages: site.pages,
      nomEntreprise: site.nomEntreprise,
      ...(site.urlFiche ? { urlFiche: site.urlFiche } : {}),
    },
    {
      pages: site.pages,
      media: resoudreMedia(site),
      champs: site.champs,
      ...(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
        ? { turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY }
        : {}),
    },
  );
  return html(corps, 200, 'public, s-maxage=30, stale-while-revalidate=60');
}
