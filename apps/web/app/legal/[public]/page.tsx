import { notFound, redirect } from 'next/navigation';
import { PUBLICS, sommaire, type PublicLegal } from '@/features/legal/documents';
import { routes } from '@/lib/routes';

/** `/legal/pro` → premier document du public. */
export default async function PublicLegal({ params }: { params: Promise<{ public: string }> }) {
  const p = (await params).public;
  if (!PUBLICS.includes(p as PublicLegal)) notFound();
  redirect(routes.legal(p as PublicLegal, sommaire(p as PublicLegal)[0]!.slug));
}
