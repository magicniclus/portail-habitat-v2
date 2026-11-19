import { lirePlanPartage } from '@ph/firebase/dessin';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Visionneuse } from '@/features/dessin/Visionneuse';
import { servicesDessin } from '@/server/dessin';
import { exigerDessin } from '@/server/pageDessin';

export const metadata: Metadata = {
  title: 'Plan partagé',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};
export const dynamic = 'force-dynamic';

/** Lien de partage en lecture seule (DES-42) : sans compte, révocable, jamais indexé. */
export default async function PagePlanPartage({ params }: { params: Promise<{ jeton: string }> }) {
  await exigerDessin();
  const { jeton } = await params;
  if (!/^[A-Za-z0-9_-]{32}$/.test(jeton)) notFound();
  const plan = await lirePlanPartage(servicesDessin(), jeton).catch(() => null);
  if (!plan) notFound();
  return <Visionneuse titre={plan.titre} scene={plan.scene} />;
}
