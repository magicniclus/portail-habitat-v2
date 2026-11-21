import type { Metadata } from 'next';
import { EditeurEssai } from '@/features/dessin/EditeurEssai';
import { exigerDessinPublic } from '@/server/pageDessin';

export const metadata: Metadata = {
  title: 'Essayer Plans gratuitement',
  robots: { index: false },
};

export const dynamic = 'force-dynamic';

/** Essai sans compte (DES-03) : tout reste sur l'appareil jusqu'à la création du compte. */
export default async function PageEssaiPlan() {
  await exigerDessinPublic();
  return <EditeurEssai />;
}
