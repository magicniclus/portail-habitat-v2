import { revalidatePath } from 'next/cache';

/**
 * Copie de démonstration du robot de rendu (STUDIO.md §4) seulement : la fiche de l'artisan
 * d'exemple vient d'être préparée, on vide son cache pour que le robot filme la version à jour.
 * Inexistant ailleurs (vrai projet : pas d'émulateur, réponse 404).
 */
export async function POST(req: Request) {
  const demo =
    Boolean(process.env.FIRESTORE_EMULATOR_HOST) &&
    (process.env.GCLOUD_PROJECT ?? '').startsWith('demo-');
  if (!demo) return new Response(null, { status: 404 });
  const slug = new URL(req.url).searchParams.get('slug') ?? '';
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return new Response(null, { status: 400 });
  revalidatePath(`/artisans/${slug}`);
  return new Response(null, { status: 204 });
}
