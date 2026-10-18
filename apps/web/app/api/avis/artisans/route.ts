import { lireArtisansAvis } from '@/server/vitrine';

// Liste régénérée toutes les heures : une lecture des fiches par heure, pas par visiteur (COUTS).
export const revalidate = 3600;

/** Artisans en ligne pour l'étape « Choisir l'artisan » de `/avis` (champs publics seulement). */
export async function GET() {
  return Response.json({ artisans: await lireArtisansAvis() });
}
